'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Domain, ISP, Status, AppSettings, LogEntry, ISPResult } from '../types';
import { checkDomainHealth, getHostname } from '../services/dnsService';
import { sendTelegramAlert } from '../services/telegramService';
import { fetchResultsFromWorkers, fetchDomainResults } from '../services/resultsService';
import { SettingsPanel } from '../components/SettingsPanel';
import { DomainCard } from '../components/DomainCard';
import { Plus, Activity, Terminal, Shield, Clock, Play } from 'lucide-react';
import { DEFAULT_DOMAINS } from '../constants';

// Helper to generate IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
};

const defaultSettings: AppSettings = {
    telegramBotToken: '',
    telegramChatId: '',
    checkInterval: 360, // Default to 6 hours (4 scans per day: 0:00, 6:00, 12:00, 18:00)
    backendUrl: '',
    workersUrl: process.env.NEXT_PUBLIC_WORKERS_URL || ''
};

const createEmptyResults = (): Record<ISP, ISPResult> => {
    // Create slots only for AIS, TRUE, and DTAC (removed GLOBAL and NT - no SIM cards for these)
    // Note: ISP.TRUE and ISP.DTAC have same enum value ('True/DTAC'), so we need to use string keys
    const results: any = {
        [ISP.AIS]: { isp: ISP.AIS, status: Status.PENDING },
        // Use string literal 'True' and 'DTAC' as keys to ensure separate slots
        'True': { isp: ISP.TRUE, status: Status.PENDING },
        'DTAC': { isp: ISP.DTAC, status: Status.PENDING },
    };
    // Also set enum keys for compatibility
    results[ISP.TRUE] = results['True'];
    results[ISP.DTAC] = results['DTAC'];
    return results;
};

export default function Home() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
    const [domains, setDomains] = useState<Domain[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [nextScanTime, setNextScanTime] = useState<number | null>(null);

    // Refs for logic
    const loadedRef = useRef(false);
    const domainsRef = useRef<Domain[]>([]);
    const settingsRef = useRef<AppSettings>(defaultSettings);
    const kvLimitExceededRef = useRef(false); // Track KV limit status

    // Sync refs
    useEffect(() => { domainsRef.current = domains; }, [domains]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // Add log function (must be defined before useEffects that use it)
    const addLog = useCallback((message: string, type: LogEntry['type']) => {
        setLogs(prev => [{
            id: generateId(),
            timestamp: Date.now(),
            message,
            type
        }, ...prev].slice(0, 50));
    }, []);

    // Load Data on Mount - Try Workers API first, fallback to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && !loadedRef.current) {
            const loadData = async () => {
                try {
                    const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;

                    if (workersUrl) {
                        // Try to load from Workers API (shared storage)
                        try {
                            const [domainsRes, settingsRes] = await Promise.all([
                                fetch(`${workersUrl}/api/frontend/domains`),
                                fetch(`${workersUrl}/api/frontend/settings`)
                            ]);

                            if (domainsRes.ok) {
                                const domainsData = await domainsRes.json();
                                if (domainsData.success && domainsData.domains && domainsData.domains.length > 0) {
                                    setDomains(domainsData.domains);
                                    addLog(`Loaded ${domainsData.domains.length} domains from Workers`, 'success');
                                } else {
                                    // No domains in Workers, use defaults
                                    const initialDomains = DEFAULT_DOMAINS.map(url => ({
                                        id: generateId(),
                                        url,
                                        hostname: getHostname(url),
                                        lastCheck: null,
                                        results: createEmptyResults(),
                                        isMonitoring: true
                                    }));
                                    setDomains(initialDomains);
                                }
                            }

                            if (settingsRes.ok) {
                                const settingsData = await settingsRes.json();
                                if (settingsData.success && settingsData.settings) {
                                    setSettings(settingsData.settings);
                                    addLog('Loaded settings from Workers', 'success');
                                }
                            }
                        } catch (apiError) {
                            console.error('Failed to load from Workers API, using localStorage:', apiError);
                            // Fallback to localStorage
                            loadFromLocalStorage();
                        }
                    } else {
                        // No Workers URL, use localStorage
                        loadFromLocalStorage();
                    }
                } catch (e) {
                    console.error("Error loading data:", e);
                    loadFromLocalStorage();
                } finally {
                    loadedRef.current = true;
                }
            };

            const loadFromLocalStorage = () => {
                try {
                    const savedDomains = localStorage.getItem('sentinel_domains');
                    const savedSettings = localStorage.getItem('sentinel_settings');

                    if (savedDomains) {
                        setDomains(JSON.parse(savedDomains));
                    } else {
                        const initialDomains = DEFAULT_DOMAINS.map(url => ({
                            id: generateId(),
                            url,
                            hostname: getHostname(url),
                            lastCheck: null,
                            results: createEmptyResults(),
                            isMonitoring: true
                        }));
                        setDomains(initialDomains);
                    }

                    if (savedSettings) {
                        setSettings(JSON.parse(savedSettings));
                    }
                } catch (e) {
                    console.error("Error loading from localStorage:", e);
                }
            };

            loadData();
        }
    }, []);

    // Load results from Workers - make it a reusable callback
    const loadResultsFromWorkers = useCallback(async () => {
        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;

            if (!workersUrl) {
                console.log('Workers URL not configured, skipping results fetch');
                return;
            }

            try {
                addLog('Fetching results from Workers API...', 'info');
                const response = await fetchResultsFromWorkers(workersUrl);

                if (response.success && response.results.length > 0) {
                    addLog(`Loaded ${response.results.length} results from mobile app`, 'success');

                    // Normalize hostname for matching (remove www, lowercase)
                    const normalizeHostname = (hostname: string): string => {
                        return hostname.toLowerCase().replace(/^www\./, '');
                    };

                    // Group results by normalized hostname
                    const resultsByHostname = new Map<string, typeof response.results>();
                    response.results.forEach(result => {
                        const normalized = normalizeHostname(result.hostname);
                        if (!resultsByHostname.has(normalized)) {
                            resultsByHostname.set(normalized, []);
                        }
                        resultsByHostname.get(normalized)!.push(result);
                    });

                    console.log('📊 [loadResultsFromWorkers] Results by normalized hostname:', Array.from(resultsByHostname.entries()).map(([h, r]) => [h, r.length]));
                    console.log('📊 [loadResultsFromWorkers] All result hostnames:', response.results.map(r => `${r.hostname} -> ${normalizeHostname(r.hostname)}`));
                    console.log('📊 [loadResultsFromWorkers] Current domains:', domainsRef.current.map(d => `${d.hostname} -> ${normalizeHostname(d.hostname)}`));

                    // Update domains with results
                    setDomains(prev => prev.map(domain => {
                        const normalizedDomainHostname = normalizeHostname(domain.hostname);
                        const hostnameResults = resultsByHostname.get(normalizedDomainHostname);

                        if (!hostnameResults || hostnameResults.length === 0) {
                            console.log(`⚠️ [loadResultsFromWorkers] No results for ${domain.hostname} (normalized: ${normalizedDomainHostname})`);
                            console.log(`   Available normalized hostnames:`, Array.from(resultsByHostname.keys()));
                            return domain;
                        }

                        console.log(`✅ [loadResultsFromWorkers] Found ${hostnameResults.length} results for ${domain.hostname}:`, hostnameResults.map(r => `${r.isp_name}:${r.status}`));

                        // Map ISP names and group by mapped ISP, then use latest result for each ISP
                        // Note: True and DTAC use the same network (True Corporation), so they map to the same ISP
                        const ispMap: Record<string, ISP> = {
                            'Unknown': ISP.AIS,
                            'unknown': ISP.AIS,
                            'AIS': ISP.AIS,
                            'True': ISP.TRUE,      // True maps to True/DTAC
                            'TRUE': ISP.TRUE,
                            'true': ISP.TRUE,
                            'DTAC': ISP.TRUE,      // DTAC maps to True/DTAC (same network)
                            'dtac': ISP.TRUE,
                            'NT': ISP.NT,
                            'nt': ISP.NT,
                            'Global (Google)': ISP.GLOBAL,
                            'Global': ISP.GLOBAL,
                        };

                        // Group results by mapped ISP and get best result for each ISP
                        // Priority: 1) BLOCKED status (always prefer), 2) ISP name clarity (AIS > Unknown), 3) Latest timestamp
                        const resultsByMappedISP = new Map<ISP, typeof hostnameResults[0]>();
                        hostnameResults.forEach(workerResult => {
                            const mappedISP = ispMap[workerResult.isp_name] || ISP.AIS;
                            const existing = resultsByMappedISP.get(mappedISP);
                            
                            if (!existing) {
                                resultsByMappedISP.set(mappedISP, workerResult);
                            } else {
                                // Priority rules (in order):
                                // 1. Always prefer BLOCKED over ACTIVE (BLOCKED is more accurate)
                                if (workerResult.status === 'BLOCKED' && existing.status !== 'BLOCKED') {
                                    resultsByMappedISP.set(mappedISP, workerResult);
                                } else if (workerResult.status !== 'BLOCKED' && existing.status === 'BLOCKED') {
                                    // Keep existing BLOCKED - don't override with ACTIVE
                                } else {
                                    // Both have same status (both ACTIVE or both BLOCKED)
                                    // 2. Prefer ISP name clarity (AIS > Unknown)
                                    const existingIsUnknown = existing.isp_name === 'Unknown' || existing.isp_name === 'unknown';
                                    const newIsUnknown = workerResult.isp_name === 'Unknown' || workerResult.isp_name === 'unknown';
                                    
                                    if (!newIsUnknown && existingIsUnknown) {
                                        // New result has clear ISP name, existing is Unknown
                                        resultsByMappedISP.set(mappedISP, workerResult);
                                    } else if (newIsUnknown && !existingIsUnknown) {
                                        // Keep existing clear ISP name
                                    } else {
                                        // Both have same clarity, use latest timestamp
                                        const existingTimestamp = existing.timestamp || 0;
                                        const newTimestamp = workerResult.timestamp || 0;
                                        if (newTimestamp > existingTimestamp) {
                                            resultsByMappedISP.set(mappedISP, workerResult);
                                        }
                                    }
                                }
                            }
                        });

                        console.log(`📅 [loadResultsFromWorkers] Latest results by ISP:`, Array.from(resultsByMappedISP.entries()).map(([isp, r]) => `${isp}:${r.isp_name}:${r.status} (${r.timestamp})`));

                        // Convert Workers results to ISPResult format
                        const updatedResults = { ...domain.results };
                        resultsByMappedISP.forEach((workerResult, isp) => {
                            const ispName = workerResult.isp_name;
                            console.log(`🔄 [loadResultsFromWorkers] Using latest result for ${isp}: ${ispName} -> ${isp}, status: ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                            
                            // If result is for True/DTAC (mapped from True or DTAC), update both TRUE and DTAC slots (they share the same network)
                            const isTrueOrDTAC = ispName === 'True' || ispName === 'TRUE' || ispName === 'true' || 
                                               ispName === 'DTAC' || ispName === 'dtac' || isp === ISP.TRUE;
                            
                            if (isTrueOrDTAC) {
                                // Update both 'True' and 'DTAC' string keys, and enum keys
                                const slots = ['True', 'DTAC', ISP.TRUE, ISP.DTAC];
                                slots.forEach(slotKey => {
                                    if (updatedResults[slotKey]) {
                                        const existingResult = updatedResults[slotKey];
                                        const targetISP = slotKey === 'True' ? ISP.TRUE : slotKey === 'DTAC' ? ISP.DTAC : slotKey;
                                        console.log(`✅ [loadResultsFromWorkers] Updating ${slotKey} result: ${existingResult.status} -> ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                                        updatedResults[slotKey] = {
                                            isp: targetISP,
                                            status: workerResult.status as Status,
                                            ip: workerResult.ip || '',
                                            latency: workerResult.latency || 0,
                                            details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                            source: 'mobile-app',
                                            deviceId: workerResult.device_id,
                                            timestamp: workerResult.timestamp,
                                        };
                                    }
                                });
                            } else {
                                // For other ISPs, update normally
                                if (updatedResults[isp]) {
                                    const existingResult = updatedResults[isp];
                                    console.log(`✅ [loadResultsFromWorkers] Updating ${isp} result: ${existingResult.status} -> ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                                    updatedResults[isp] = {
                                        isp: isp,
                                        status: workerResult.status as Status,
                                        ip: workerResult.ip || '',
                                        latency: workerResult.latency || 0,
                                        details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                        source: 'mobile-app',
                                        deviceId: workerResult.device_id,
                                        timestamp: workerResult.timestamp,
                                    };
                                } else {
                                    console.warn(`⚠️ [loadResultsFromWorkers] No result slot for ISP: ${isp} (mapped from ${ispName})`);
                                }
                            }
                        });

                        // Find latest timestamp
                        const latestTimestamp = Math.max(...hostnameResults.map(r => r.timestamp));

                        return {
                            ...domain,
                            results: updatedResults,
                            lastCheck: latestTimestamp,
                        };
                    }));
                } else {
                    addLog('No results found from mobile app', 'info');
                }
        } catch (error) {
            console.error('Error loading results from Workers:', error);
            addLog('Failed to load results from Workers API', 'error');
        }
    }, [addLog]);

    // Load results immediately when component mounts
    useEffect(() => {
        if (!loadedRef.current) return;
        loadResultsFromWorkers();
    }, [loadResultsFromWorkers]);

    // Adaptive polling to check for new results from mobile app
    // Only polls to detect when mobile app sends new results (doesn't trigger checks)
    useEffect(() => {
        if (!loadedRef.current) return;

        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;
        if (!workersUrl) {
            console.log('Workers URL not configured, skipping polling');
            return;
        }

        // Get initial lastCheckTime from current domains (to avoid fetching same results)
        let lastCheckTime = Math.max(...domainsRef.current.map(d => d.lastCheck || 0), Date.now() - 60000); // Default to 1 minute ago
        let pollInterval = 5000; // Start with 5 seconds (saves D1 reads)
        let consecutiveNoUpdates = 0; // Track consecutive polls with no updates
        
        console.log('🔄 [Poll] Starting adaptive polling to detect mobile app results (starts at 5s)');
        console.log(`🕐 [Poll] Initial lastCheckTime: ${lastCheckTime} (${new Date(lastCheckTime).toLocaleTimeString()})`);

        const poll = async () => {
            try {
                // Check for new results (only newer than lastCheckTime)
                const response = await fetchResultsFromWorkers(workersUrl);
                
                if (response.success && response.results.length > 0) {
                    // Check if we have new results (compare timestamps)
                    const latestResult = Math.max(...response.results.map(r => r.timestamp));
                    
                    if (latestResult > lastCheckTime) {
                        console.log(`🔄 [Poll] Found NEW results! Latest timestamp: ${latestResult} (was: ${lastCheckTime})`);
                        addLog(`📱 New results from mobile app: ${response.results.length} updates`, 'success');
                        lastCheckTime = latestResult;
                        consecutiveNoUpdates = 0;
                        // Speed up polling when we find new results (2 seconds for next few polls)
                        pollInterval = 2000;
                        // Load and update results immediately
                        await loadResultsFromWorkers();
                    } else {
                        // No new results - slow down polling gradually
                        consecutiveNoUpdates++;
                        if (consecutiveNoUpdates > 3) {
                            // After 3 consecutive polls with no updates, slow down to 10 seconds
                            pollInterval = 10000;
                        } else if (consecutiveNoUpdates > 1) {
                            // After 1 consecutive poll, slow down to 5 seconds
                            pollInterval = 5000;
                        }
                        // Silent - don't log every poll to avoid spam
                    }
                } else {
                    // No results at all - slow down
                    consecutiveNoUpdates++;
                    pollInterval = 10000;
                }
            } catch (error) {
                console.error('Poll error:', error);
            }
            
            // Schedule next poll with adaptive interval
            setTimeout(poll, pollInterval);
        };

        // Start polling after a short delay
        setTimeout(poll, 2000);

        return () => {
            clearInterval(pollInterval);
            console.log('🔄 [Poll] Stopped polling');
        };
    }, [loadedRef.current, loadResultsFromWorkers, addLog]);

    // Sync domains to Workers when component mounts (initial sync only)
    useEffect(() => {
        if (!loadedRef.current) {
            console.log('Not loaded yet, skipping domains sync');
            return;
        }
        if (domains.length === 0) {
            console.log('No domains to sync');
            return;
        }

        // Only sync on mount, not on every change (changes are handled in handleAddDomain/handleDeleteDomain)
        const syncOnMount = async () => {
            await syncDomainsToWorkers(domains);
        };

        // Sync once on mount with a small delay to ensure state is ready
        const timeoutId = setTimeout(syncOnMount, 500);
        return () => clearTimeout(timeoutId);
    }, [loadedRef.current]);

    // Save Data on Change - Save to Workers API and localStorage
    useEffect(() => {
        if (loadedRef.current) {
            // Save to localStorage (backup)
            localStorage.setItem('sentinel_domains', JSON.stringify(domains));

            // Save to Workers API (shared storage)
            const saveToWorkers = async () => {
                const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;
                if (workersUrl) {
                    try {
                        const response = await fetch(`${workersUrl}/api/frontend/domains`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ domains })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            if (data.saved) {
                                console.log('Domains saved to Workers:', domains.length);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to save domains to Workers:', error);
                    }
                }
            };
            saveToWorkers();
        }
    }, [domains]);

    useEffect(() => {
        if (loadedRef.current) {
            // Save to localStorage (backup)
            localStorage.setItem('sentinel_settings', JSON.stringify(settings));

            // Save to Workers API (shared storage)
            const saveToWorkers = async () => {
                const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;
                if (workersUrl) {
                    try {
                        const response = await fetch(`${workersUrl}/api/frontend/settings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ settings })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            if (data.saved) {
                                console.log('Settings saved to Workers');
                            }
                        }
                    } catch (error) {
                        console.error('Failed to save settings to Workers:', error);
                    }
                }
            };
            saveToWorkers();
        }
    }, [settings]);

    // Helper function to sync domains to Workers
    const syncDomainsToWorkers = useCallback(async (domainsToSync: Domain[]) => {
        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.backendUrl;

        console.log('=== SYNC DOMAINS DEBUG ===');
        console.log('NEXT_PUBLIC_WORKERS_URL:', process.env.NEXT_PUBLIC_WORKERS_URL);
        console.log('settingsRef.current.backendUrl:', settingsRef.current.backendUrl);
        console.log('Final workersUrl:', workersUrl);
        console.log('Domains to sync:', domainsToSync.map(d => d.hostname));

        if (!workersUrl) {
            addLog('Workers URL not configured. Please set Workers URL in Settings to sync domains.', 'error');
            console.error('❌ Workers URL not configured, skipping domains sync');
            return;
        }

        try {
            // Check if KV limit is exceeded - skip sync if so
            if (kvLimitExceededRef.current) {
                console.log('⏸️ Skipping domain sync - KV limit exceeded');
                addLog('⏸️ Domain sync skipped (KV limit exceeded)', 'info');
                return;
            }

            addLog(`Syncing ${domainsToSync.length} domains to Workers API...`, 'info');
            console.log('📤 Syncing domains to Workers:', domainsToSync.map(d => ({ hostname: d.hostname, telegramChatId: d.telegramChatId })));
            console.log('📤 Workers URL:', workersUrl);
            console.log('📤 Request body:', JSON.stringify({ domains: domainsToSync }));

            // Sync to Workers API - Use frontend/domains endpoint to preserve telegram_chat_id
            const response = await fetch(`${workersUrl.replace(/\/$/, '')}/api/frontend/domains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domains: domainsToSync }),
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Response data:', data);
                addLog(`Successfully synced ${domainsToSync.length} domains to Workers API`, 'success');
                console.log('✅ Domains synced to Workers:', domainsToSync.map(d => d.hostname));

                // Verify sync by fetching domains back
                const verifyResponse = await fetch(`${workersUrl.replace(/\/$/, '')}/api/frontend/domains`);
                if (verifyResponse.ok) {
                    const verifyData = await verifyResponse.json();
                    console.log('✅ Verified domains in Workers:', verifyData.domains);
                    
                    // Normalize hostnames for comparison (remove www, lowercase)
                    const normalizeHostname = (hostname: string): string => {
                        return hostname.toLowerCase().replace(/^www\./, '');
                    };
                    
                    const normalizedExpected = domainsToSync.map(d => normalizeHostname(d.hostname)).sort();
                    const normalizedGot = (verifyData.domains || []).map((d: any) => normalizeHostname(d.hostname || d)).sort();
                    
                    // Check if normalized hostnames match (ignore order and www prefix)
                    const expectedSet = new Set(normalizedExpected);
                    const gotSet = new Set(normalizedGot);
                    const missing = normalizedExpected.filter(h => !gotSet.has(h));
                    const extra = normalizedGot.filter(h => !expectedSet.has(h));
                    
                    if (missing.length > 0 || extra.length > 0) {
                        if (missing.length > 0) {
                            addLog(`Warning: ${missing.length} domain(s) missing in Workers: ${missing.join(', ')}`, 'error');
                        }
                        if (extra.length > 0) {
                            addLog(`Info: ${extra.length} extra domain(s) in Workers: ${extra.join(', ')}`, 'info');
                        }
                        console.warn('⚠️ Domain mismatch:', { missing, extra, expected: normalizedExpected, got: normalizedGot });
                    } else {
                        addLog(`Verified: Workers API has ${verifyData.domains.length} domains`, 'success');
                        console.log('✅ Verified! Domains match:', verifyData.domains);
                    }
                } else {
                    console.error('❌ Verify request failed:', verifyResponse.status);
                }
            } else {
                const errorText = await response.text();
                let errorData: any = null;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    // If parsing fails, use errorText as is
                }

                console.error('❌ Failed to sync domains:', response.status, errorText);

                // Check for KV limit error
                if (response.status === 429 || (errorData && errorData.error && errorData.error.includes('limit exceeded'))) {
                    kvLimitExceededRef.current = true; // Mark KV limit as exceeded
                    addLog(`⚠️ KV write limit exceeded. Domain sync paused.`, 'error');
                    addLog(`Error: ${errorData?.error || errorText}`, 'error');
                    addLog(`Please try again tomorrow or upgrade your Cloudflare plan.`, 'error');
                } else {
                    addLog(`Failed to sync domains: ${response.status}`, 'error');
                    if (errorData?.error) {
                        addLog(`Error: ${errorData.error}`, 'error');
                    }
                }
            }
        } catch (error) {
            addLog('Failed to sync domains to Workers API', 'error');
            console.error('❌ Exception during sync:', error);
        }
        console.log('=== END SYNC DEBUG ===');
    }, [addLog]);

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('=== HANDLE ADD DOMAIN DEBUG ===');
        console.log('newUrl:', newUrl);

        if (!newUrl) {
            console.log('❌ No URL provided, returning');
            return;
        }

        const hostname = getHostname(newUrl);
        console.log('Hostname:', hostname);

        const newDomain: Domain = {
            id: generateId(),
            url: newUrl,
            hostname,
            lastCheck: null,
            results: createEmptyResults(),
            isMonitoring: true,
        };

        const updatedDomains = [...domainsRef.current, newDomain];
        console.log('Updated domains:', updatedDomains.map(d => d.hostname));
        console.log('Current domainsRef:', domainsRef.current.map(d => d.hostname));

        setDomains(updatedDomains);
        setNewUrl('');
        addLog(`Added domain: ${hostname}`, 'info');

        console.log('About to call syncDomainsToWorkers...');
        console.log('syncDomainsToWorkers function:', typeof syncDomainsToWorkers);

        // Sync immediately after adding
        try {
            await syncDomainsToWorkers(updatedDomains);
            console.log('✅ syncDomainsToWorkers completed');
        } catch (error) {
            console.error('❌ Error in syncDomainsToWorkers:', error);
        }

        console.log('=== END HANDLE ADD DOMAIN DEBUG ===');
    };

    const handleDeleteDomain = async (id: string) => {
        const updatedDomains = domainsRef.current.filter(d => d.id !== id);
        const deletedDomain = domainsRef.current.find(d => d.id === id);
        setDomains(updatedDomains);

        if (deletedDomain) {
            addLog(`Deleted domain: ${deletedDomain.hostname}`, 'info');
        }

        // Sync immediately after deleting
        await syncDomainsToWorkers(updatedDomains);
    };

    const handleUpdateDomain = (id: string, updates: Partial<Domain>) => {
        setDomains(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
        addLog(`Updated settings for ${domains.find(d => d.id === id)?.hostname}`, 'info');
    };

    const checkSingleDomain = useCallback(async (domainId: string) => {
        const currentDomain = domainsRef.current.find(d => d.id === domainId);
        if (!currentDomain) return;

        addLog(`Requesting mobile app to check ${currentDomain.hostname}...`, 'info');

        const currentSettings = settingsRef.current;
        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || currentSettings.workersUrl || currentSettings.backendUrl;

        if (workersUrl) {
            // Trigger mobile app to check DNS
            try {
                const triggerResponse = await fetch(`${workersUrl.replace(/\/$/, '')}/api/trigger-check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!triggerResponse.ok) {
                    const errorText = await triggerResponse.text();
                    let errorData: any = null;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        // If parsing fails, use errorText as is
                    }
                    addLog(`Failed to trigger mobile app: ${triggerResponse.status}`, 'error');
                    if (errorData?.error) {
                        addLog(`Error: ${errorData.error}`, 'error');
                    }
                    return;
                }

                const triggerData = await triggerResponse.json();
                if (triggerData.success) {
                    addLog(`Mobile app check triggered. Waiting for results...`, 'info');
                    
                    // Poll for results (similar to runAllChecks)
                    let attempts = 0;
                    const maxAttempts = 15; // 30 seconds total (2 seconds * 15)
                    
                    const pollForResults = async () => {
                        attempts++;
                        try {
                            const response = await fetchResultsFromWorkers(workersUrl);
                            
                            if (response.success && response.results.length > 0) {
                                // Find results for this specific domain
                                const domainResults = response.results.filter(r => {
                                    const normalizedHostname = r.hostname.toLowerCase().replace(/^www\./, '');
                                    const normalizedDomainHostname = currentDomain.hostname.toLowerCase().replace(/^www\./, '');
                                    return normalizedHostname === normalizedDomainHostname;
                                });

                                if (domainResults.length > 0) {
                                    // Update domain with new results (reuse logic from loadResultsFromWorkers)
                                    const hostnameResults = domainResults;
                                    const ispMap: Record<string, ISP> = {
                                        'Unknown': ISP.AIS,
                                        'unknown': ISP.AIS,
                                        'AIS': ISP.AIS,
                                        'True': ISP.TRUE,
                                        'TRUE': ISP.TRUE,
                                        'true': ISP.TRUE,
                                        'DTAC': ISP.TRUE,
                                        'dtac': ISP.TRUE,
                                        'NT': ISP.NT,
                                        'nt': ISP.NT,
                                        'Global (Google)': ISP.GLOBAL,
                                        'Global': ISP.GLOBAL,
                                    };

                                    const resultsByMappedISP = new Map<ISP, typeof hostnameResults[0]>();
                                    hostnameResults.forEach(workerResult => {
                                        const mappedISP = ispMap[workerResult.isp_name] || ISP.AIS;
                                        const existing = resultsByMappedISP.get(mappedISP);
                                        
                                        if (!existing) {
                                            resultsByMappedISP.set(mappedISP, workerResult);
                                        } else {
                                            if (workerResult.status === 'BLOCKED' && existing.status !== 'BLOCKED') {
                                                resultsByMappedISP.set(mappedISP, workerResult);
                                            } else if (workerResult.status !== 'BLOCKED' && existing.status === 'BLOCKED') {
                                                // Keep existing BLOCKED
                                            } else {
                                                const existingIsUnknown = existing.isp_name === 'Unknown' || existing.isp_name === 'unknown';
                                                const newIsUnknown = workerResult.isp_name === 'Unknown' || workerResult.isp_name === 'unknown';
                                                
                                                if (!newIsUnknown && existingIsUnknown) {
                                                    resultsByMappedISP.set(mappedISP, workerResult);
                                                } else {
                                                    const existingTimestamp = existing.timestamp || 0;
                                                    const newTimestamp = workerResult.timestamp || 0;
                                                    if (newTimestamp > existingTimestamp) {
                                                        resultsByMappedISP.set(mappedISP, workerResult);
                                                    }
                                                }
                                            }
                                        }
                                    });

                                    const updatedResults = { ...currentDomain.results };
                                    resultsByMappedISP.forEach((workerResult, isp) => {
                                        const ispName = workerResult.isp_name;
                                        const isTrueOrDTAC = ispName === 'True' || ispName === 'TRUE' || ispName === 'true' || 
                                                           ispName === 'DTAC' || ispName === 'dtac' || isp === ISP.TRUE;
                                        
                                        if (isTrueOrDTAC) {
                                            const slots = ['True', 'DTAC', ISP.TRUE, ISP.DTAC];
                                            slots.forEach(slotKey => {
                                                if (updatedResults[slotKey]) {
                                                    const targetISP = slotKey === 'True' ? ISP.TRUE : slotKey === 'DTAC' ? ISP.DTAC : slotKey;
                                                    updatedResults[slotKey] = {
                                                        isp: targetISP,
                                                        status: workerResult.status as Status,
                                                        ip: workerResult.ip || '',
                                                        latency: workerResult.latency || 0,
                                                        details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                                        source: 'mobile-app',
                                                        deviceId: workerResult.device_id,
                                                        timestamp: workerResult.timestamp,
                                                    };
                                                }
                                            });
                                        } else {
                                            if (updatedResults[isp]) {
                                                updatedResults[isp] = {
                                                    isp: isp,
                                                    status: workerResult.status as Status,
                                                    ip: workerResult.ip || '',
                                                    latency: workerResult.latency || 0,
                                                    details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                                    source: 'mobile-app',
                                                    deviceId: workerResult.device_id,
                                                    timestamp: workerResult.timestamp,
                                                };
                                            }
                                        }
                                    });

                                    const latestTimestamp = Math.max(...hostnameResults.map(r => r.timestamp || 0));
                                    
                                    setDomains(prev => prev.map(d => {
                                        if (d.id === domainId) {
                                            return { ...d, lastCheck: latestTimestamp, results: updatedResults };
                                        }
                                        return d;
                                    }));

                                    const blockedISPs = Object.values(updatedResults)
                                        .filter(r => r.status === Status.BLOCKED)
                                        .map(r => r.isp);

                                    if (blockedISPs.length > 0) {
                                        addLog(`${currentDomain.hostname} BLOCKED on ${blockedISPs.join(', ')}`, 'alert');
                                        
                                        // Send Telegram alert to both chat IDs:
                                        // 1. Domain's custom chat ID (ห้องแยกแต่ละลิงก์)
                                        // 2. Settings chat ID (ห้องรวม)
                                        const chatIdsToSend: string[] = [];
                                        
                                        // Add domain's custom chat ID if available
                                        if (currentDomain.telegramChatId) {
                                            chatIdsToSend.push(currentDomain.telegramChatId);
                                        }
                                        
                                        // Add settings chat ID (ห้องรวม) if available and different from domain chat ID
                                        if (currentSettings.telegramChatId && currentSettings.telegramChatId !== currentDomain.telegramChatId) {
                                            chatIdsToSend.push(currentSettings.telegramChatId);
                                        }

                                        if (currentSettings.telegramBotToken && chatIdsToSend.length > 0) {
                                            // Send to all chat IDs
                                            Promise.all(chatIdsToSend.map(chatId => 
                                                sendTelegramAlert(currentSettings.telegramBotToken, chatId, currentDomain, blockedISPs)
                                                    .then(sent => ({ chatId, sent }))
                                                    .catch(error => ({ chatId, sent: false, error }))
                                            )).then(results => {
                                                const successCount = results.filter(r => r.sent).length;
                                                if (successCount > 0) {
                                                    const chatIdSources = results.filter(r => r.sent).map(r => 
                                                        r.chatId === currentDomain.telegramChatId ? 'custom chat' : 'default chat'
                                                    );
                                                    addLog(`Telegram alert sent to ${chatIdSources.join(' and ')}`, 'success');
                                                }
                                            }).catch(error => {
                                                console.error('Error sending Telegram alerts:', error);
                                            });
                                        }
                                    } else {
                                        addLog(`${currentDomain.hostname}: Check complete`, 'success');
                                    }
                                    return; // Success, stop polling
                                }
                            }

                            if (attempts < maxAttempts) {
                                setTimeout(pollForResults, 2000);
                            } else {
                                addLog(`Timeout waiting for results for ${currentDomain.hostname}`, 'error');
                            }
                        } catch (error) {
                            console.error('Error polling for results:', error);
                            if (attempts < maxAttempts) {
                                setTimeout(pollForResults, 2000);
                            } else {
                                addLog(`Failed to get results for ${currentDomain.hostname}`, 'error');
                            }
                        }
                    };

                    // Start polling after a short delay
                    setTimeout(pollForResults, 2000);
                } else {
                    addLog('Failed to trigger mobile app check', 'error');
                }
            } catch (error) {
                console.error('Error triggering mobile app:', error);
                addLog('Failed to trigger mobile app check', 'error');
            }
        } else {
            addLog('Workers URL not configured', 'error');
        }
    }, [addLog]);

    const runAllChecks = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        addLog('Starting full scan...', 'info');

        const currentSettings = settingsRef.current;
        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || currentSettings.workersUrl || currentSettings.backendUrl;

        if (workersUrl) {
            // Trigger mobile app to check DNS
            try {
                addLog('Requesting mobile app to check DNS...', 'info');
                const triggerResponse = await fetch(`${workersUrl.replace(/\/$/, '')}/api/trigger-check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!triggerResponse.ok) {
                    let errorText = '';
                    let errorData: any = null;
                    try {
                        errorText = await triggerResponse.text();
                        errorData = JSON.parse(errorText);
                    } catch {
                        // If parsing fails, use errorText as is
                    }

                    console.error('Trigger error:', errorText);
                    console.error('Workers URL:', workersUrl);
                    console.error('Response status:', triggerResponse.status);

                    // Check for KV limit error
                    if (triggerResponse.status === 429 || (errorData && errorData.error && errorData.error.includes('limit exceeded'))) {
                        kvLimitExceededRef.current = true; // Mark KV limit as exceeded
                        addLog(`⚠️ KV write limit exceeded for today. Auto-scan paused.`, 'error');
                        addLog(`Error: ${errorData?.error || errorText}`, 'error');
                        addLog(`Please try again tomorrow or upgrade your Cloudflare plan.`, 'error');
                    } else {
                        addLog(`Failed to trigger mobile app: ${triggerResponse.status}`, 'error');
                        if (errorData?.error) {
                            addLog(`Error: ${errorData.error}`, 'error');
                        } else if (errorText) {
                            addLog(`Error: ${errorText}`, 'error');
                        }
                    }

                    setLoading(false);
                    if (!kvLimitExceededRef.current) {
                        addLog('Please check mobile app connection or trigger manually from mobile app', 'error');
                    }
                    return;
                }

                const triggerData = await triggerResponse.json();
                addLog('Mobile app check triggered. Waiting for results...', 'info');
                console.log('Trigger data:', triggerData);

                // Poll for results (check every 2 seconds, max 30 seconds)
                let attempts = 0;
                const maxAttempts = 15; // 30 seconds total
                const triggerTimestamp = triggerData.timestamp || Date.now();

                const pollForResults = async (): Promise<void> => {
                    attempts++;
                    addLog(`Polling for results... (${attempts}/${maxAttempts})`, 'info');

                    try {
                        const response = await fetchResultsFromWorkers(workersUrl);

                        if (response.success && response.results.length > 0) {
                            // Check if results are newer than trigger time
                            const latestResult = Math.max(...response.results.map(r => r.timestamp));
                            console.log('Latest result timestamp:', latestResult, 'Trigger timestamp:', triggerTimestamp);

                            if (latestResult >= triggerTimestamp) {
                                addLog(`Loaded ${response.results.length} results from mobile app`, 'success');

                                // Group results by hostname (normalize for matching)
                                const normalizeHostname = (hostname: string): string => {
                                    // Remove www. prefix and convert to lowercase for comparison
                                    return hostname.toLowerCase().replace(/^www\./, '');
                                };

                                const resultsByHostname = new Map<string, typeof response.results>();
                                response.results.forEach(result => {
                                    const normalized = normalizeHostname(result.hostname);
                                    if (!resultsByHostname.has(normalized)) {
                                        resultsByHostname.set(normalized, []);
                                    }
                                    resultsByHostname.get(normalized)!.push(result);
                                });

                                console.log('📊 Results by hostname (normalized):', Array.from(resultsByHostname.entries()).map(([h, r]) => [h, r.length]));
                                console.log('📊 All result hostnames:', response.results.map(r => r.hostname));
                                console.log('📊 Current domains:', domainsRef.current.map(d => `${d.hostname} (normalized: ${normalizeHostname(d.hostname)})`));

                                // Track if any domain is blocked
                                let hasBlockedDomains = false;

                                // Update domains with results
                                setDomains(prev => prev.map(domain => {
                                    const normalizedDomainHostname = normalizeHostname(domain.hostname);
                                    const hostnameResults = resultsByHostname.get(normalizedDomainHostname);

                                    if (!hostnameResults || hostnameResults.length === 0) {
                                        console.log(`⚠️ No results for ${domain.hostname} (normalized: ${normalizedDomainHostname})`);
                                        console.log(`   Available normalized hostnames:`, Array.from(resultsByHostname.keys()));

                                        // If no results, change PENDING to ERROR to stop loading spinner
                                        const updatedResults = { ...domain.results };
                                        Object.keys(updatedResults).forEach(ispKey => {
                                            if (updatedResults[ispKey as ISP].status === Status.PENDING) {
                                                updatedResults[ispKey as ISP] = {
                                                    ...updatedResults[ispKey as ISP],
                                                    status: Status.ERROR,
                                                    details: 'No results from mobile app'
                                                };
                                            }
                                        });
                                        return { ...domain, results: updatedResults };
                                    }

                                    console.log(`✅ Found ${hostnameResults.length} results for ${domain.hostname}:`, hostnameResults.map(r => `${r.isp_name}:${r.status}`));

                                    // Map ISP names and group by mapped ISP, then use latest result for each ISP
                                    // Note: True and DTAC use the same network (True Corporation), so they map to the same ISP
                                    const ispMap: Record<string, ISP> = {
                                        'Unknown': ISP.AIS,
                                        'unknown': ISP.AIS,
                                        'AIS': ISP.AIS,
                                        'True': ISP.TRUE,      // True maps to True/DTAC
                                        'TRUE': ISP.TRUE,
                                        'true': ISP.TRUE,
                                        'DTAC': ISP.TRUE,      // DTAC maps to True/DTAC (same network)
                                        'dtac': ISP.TRUE,
                                        'NT': ISP.NT,
                                        'nt': ISP.NT,
                                        'Global (Google)': ISP.GLOBAL,
                                        'Global': ISP.GLOBAL,
                                    };

                                    // Group results by mapped ISP and get best result for each ISP
                                    // Priority: 1) BLOCKED status (always prefer), 2) ISP name clarity (AIS > Unknown), 3) Latest timestamp
                                    const resultsByMappedISP = new Map<ISP, typeof hostnameResults[0]>();
                                    hostnameResults.forEach(workerResult => {
                                        const mappedISP = ispMap[workerResult.isp_name] || ISP.AIS;
                                        const existing = resultsByMappedISP.get(mappedISP);
                                        
                                        console.log(`🔍 [pollForResults] Processing: ${workerResult.isp_name} -> ${mappedISP}, status: ${workerResult.status}, timestamp: ${workerResult.timestamp}`);
                                        
                                        if (!existing) {
                                            console.log(`  ✅ First result for ${mappedISP}, setting: ${workerResult.isp_name}:${workerResult.status}`);
                                            resultsByMappedISP.set(mappedISP, workerResult);
                                        } else {
                                            console.log(`  🔄 Comparing with existing: ${existing.isp_name}:${existing.status} (timestamp: ${existing.timestamp})`);
                                            
                                            // Priority rules (in order):
                                            // 1. Always prefer BLOCKED over ACTIVE (BLOCKED is more accurate)
                                            if (workerResult.status === 'BLOCKED' && existing.status !== 'BLOCKED') {
                                                console.log(`  ✅ Preferring BLOCKED over ACTIVE: ${workerResult.isp_name}:${workerResult.status}`);
                                                resultsByMappedISP.set(mappedISP, workerResult);
                                            } else if (workerResult.status !== 'BLOCKED' && existing.status === 'BLOCKED') {
                                                console.log(`  ⏭️ Keeping existing BLOCKED: ${existing.isp_name}:${existing.status}`);
                                                // Keep existing BLOCKED - don't override with ACTIVE
                                            } else {
                                                // Both have same status (both ACTIVE or both BLOCKED)
                                                // 2. Prefer ISP name clarity (AIS > Unknown)
                                                const existingIsUnknown = existing.isp_name === 'Unknown' || existing.isp_name === 'unknown';
                                                const newIsUnknown = workerResult.isp_name === 'Unknown' || workerResult.isp_name === 'unknown';
                                                
                                                if (!newIsUnknown && existingIsUnknown) {
                                                    console.log(`  ✅ Preferring clear ISP name: ${workerResult.isp_name} > ${existing.isp_name}`);
                                                    // New result has clear ISP name, existing is Unknown
                                                    resultsByMappedISP.set(mappedISP, workerResult);
                                                } else if (newIsUnknown && !existingIsUnknown) {
                                                    console.log(`  ⏭️ Keeping existing clear ISP name: ${existing.isp_name}`);
                                                    // Keep existing clear ISP name
                                                } else {
                                                    // Both have same clarity, use latest timestamp
                                                    const existingTimestamp = existing.timestamp || 0;
                                                    const newTimestamp = workerResult.timestamp || 0;
                                                    if (newTimestamp > existingTimestamp) {
                                                        console.log(`  ✅ Using newer timestamp: ${newTimestamp} > ${existingTimestamp}`);
                                                        resultsByMappedISP.set(mappedISP, workerResult);
                                                    } else {
                                                        console.log(`  ⏭️ Keeping existing (newer timestamp): ${existingTimestamp} > ${newTimestamp}`);
                                                    }
                                                }
                                            }
                                        }
                                    });

                                    console.log(`📅 [pollForResults] Latest results by ISP:`, Array.from(resultsByMappedISP.entries()).map(([isp, r]) => `${isp}:${r.isp_name}:${r.status} (${r.timestamp})`));

                                    // Convert Workers results to ISPResult format
                                    const updatedResults = { ...domain.results };
                                    resultsByMappedISP.forEach((workerResult, isp) => {
                                        const ispName = workerResult.isp_name;
                                        console.log(`🔄 [pollForResults] Using latest result for ${isp}: ${ispName} -> ${isp}, status: ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                                        
                                        // If result is for True/DTAC (mapped from True or DTAC), update both TRUE and DTAC slots (they share the same network)
                                        const isTrueOrDTAC = ispName === 'True' || ispName === 'TRUE' || ispName === 'true' || 
                                                           ispName === 'DTAC' || ispName === 'dtac' || isp === ISP.TRUE;
                                        
                                        if (isTrueOrDTAC) {
                                            // Update both 'True' and 'DTAC' string keys, and enum keys
                                            const slots = ['True', 'DTAC', ISP.TRUE, ISP.DTAC];
                                            slots.forEach(slotKey => {
                                                if (updatedResults[slotKey]) {
                                                    const existingResult = updatedResults[slotKey];
                                                    const targetISP = slotKey === 'True' ? ISP.TRUE : slotKey === 'DTAC' ? ISP.DTAC : slotKey;
                                                    console.log(`✅ [pollForResults] Updating ${slotKey} result: ${existingResult.status} -> ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                                                    updatedResults[slotKey] = {
                                                        isp: targetISP,
                                                        status: workerResult.status as Status,
                                                        ip: workerResult.ip || '',
                                                        latency: workerResult.latency || 0,
                                                        details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                                        source: 'mobile-app',
                                                        deviceId: workerResult.device_id,
                                                        timestamp: workerResult.timestamp,
                                                    };
                                                }
                                            });
                                        } else {
                                            // For other ISPs, update normally
                                            if (updatedResults[isp]) {
                                                const existingResult = updatedResults[isp];
                                                console.log(`✅ [pollForResults] Updating ${isp} result: ${existingResult.status} -> ${workerResult.status} (timestamp: ${workerResult.timestamp})`);
                                                updatedResults[isp] = {
                                                    isp: isp,
                                                    status: workerResult.status as Status,
                                                    ip: workerResult.ip || '',
                                                    latency: workerResult.latency || 0,
                                                    details: `From mobile app (${ispName}) - ${new Date(workerResult.timestamp).toLocaleString()}`,
                                                    source: 'mobile-app',
                                                    deviceId: workerResult.device_id,
                                                    timestamp: workerResult.timestamp,
                                                };
                                            } else {
                                                console.warn(`⚠️ [pollForResults] No result slot for ISP: ${isp} (mapped from ${ispName})`);
                                            }
                                        }
                                    });

                                    // Change remaining PENDING to ERROR if no results for that ISP
                                    Object.keys(updatedResults).forEach(ispKey => {
                                        const isp = ispKey as ISP;
                                        if (updatedResults[isp].status === Status.PENDING) {
                                            // Check if any result maps to this ISP
                                            // Note: True and DTAC use the same network (True Corporation), so they map to the same ISP
                                            const ispMap: Record<string, ISP> = {
                                                'Unknown': ISP.AIS,
                                                'unknown': ISP.AIS,
                                                'AIS': ISP.AIS,
                                                'True': ISP.TRUE,      // True maps to True/DTAC
                                                'TRUE': ISP.TRUE,
                                                'true': ISP.TRUE,
                                                'DTAC': ISP.TRUE,      // DTAC maps to True/DTAC (same network)
                                                'dtac': ISP.TRUE,
                                                'NT': ISP.NT,
                                                'nt': ISP.NT,
                                                'Global (Google)': ISP.GLOBAL,
                                                'Global': ISP.GLOBAL,
                                            };
                                            const hasResult = hostnameResults.some(r => {
                                                const mappedIsp = ispMap[r.isp_name] || ISP.AIS;
                                                return mappedIsp === isp;
                                            });
                                            if (!hasResult) {
                                                updatedResults[isp] = {
                                                    ...updatedResults[isp],
                                                    status: Status.ERROR,
                                                    details: 'No result from mobile app for this ISP'
                                                };
                                            }
                                        }
                                    });

                                    // Find latest timestamp
                                    const latestTimestamp = Math.max(...hostnameResults.map(r => r.timestamp));

                                    // Check for blocked ISPs and send Telegram alert for this domain
                                    const blockedISPs = Object.values(updatedResults)
                                        .filter(r => r.status === Status.BLOCKED)
                                        .map(r => r.isp as ISP);
                                    
                                    if (blockedISPs.length > 0) {
                                        hasBlockedDomains = true;
                                        addLog(`${domain.hostname} BLOCKED on ${blockedISPs.join(', ')}`, 'alert');

                                        // Send Telegram alert to both chat IDs:
                                        // 1. Domain's custom chat ID (ห้องแยกแต่ละลิงก์)
                                        // 2. Settings chat ID (ห้องรวม)
                                        const currentSettings = settingsRef.current;
                                        const chatIdsToSend: string[] = [];
                                        
                                        // Add domain's custom chat ID if available
                                        if (domain.telegramChatId) {
                                            chatIdsToSend.push(domain.telegramChatId);
                                        }
                                        
                                        // Add settings chat ID (ห้องรวม) if available and different from domain chat ID
                                        if (currentSettings.telegramChatId && currentSettings.telegramChatId !== domain.telegramChatId) {
                                            chatIdsToSend.push(currentSettings.telegramChatId);
                                        }

                                        if (currentSettings.telegramBotToken && chatIdsToSend.length > 0) {
                                            // Send to all chat IDs
                                            Promise.all(chatIdsToSend.map(chatId => 
                                                sendTelegramAlert(currentSettings.telegramBotToken, chatId, domain, blockedISPs)
                                                    .then(sent => ({ chatId, sent }))
                                                    .catch(error => ({ chatId, sent: false, error }))
                                            )).then(results => {
                                                const successCount = results.filter(r => r.sent).length;
                                                const failedCount = results.length - successCount;
                                                
                                                if (successCount > 0) {
                                                    const chatIdSources = results.filter(r => r.sent).map(r => 
                                                        r.chatId === domain.telegramChatId ? 'custom chat' : 'default chat'
                                                    );
                                                    addLog(`Telegram alert sent for ${domain.hostname} to ${chatIdSources.join(' and ')}`, 'success');
                                                }
                                                
                                                if (failedCount > 0) {
                                                    addLog(`Failed to send Telegram alert for ${domain.hostname} to ${failedCount} chat(s)`, 'error');
                                                }
                                            }).catch(error => {
                                                console.error('Error sending Telegram alerts:', error);
                                                addLog(`Error sending Telegram alerts for ${domain.hostname}`, 'error');
                                            });
                                        }
                                    }

                                    return {
                                        ...domain,
                                        results: updatedResults,
                                        lastCheck: latestTimestamp,
                                    };
                                }));

                                // All domains updated, scan complete
                                if (!hasBlockedDomains) {
                                    addLog('All domains are active', 'success');
                                }

                                setLoading(false);
                                addLog('Scan complete.', 'success');
                                return;
                            } else {
                                console.log('Results are older than trigger, waiting for new results...');
                            }
                        } else {
                            console.log('No results yet, waiting...');
                        }

                        // If no new results yet, continue polling
                        if (attempts < maxAttempts) {
                            setTimeout(pollForResults, 2000);
                        } else {
                            addLog('⏱️ Timeout: Mobile app did not respond within 30 seconds.', 'error');
                            addLog('📱 Mobile app needs to poll /api/trigger-check every 30 seconds.', 'error');
                            addLog('💡 Please implement trigger polling in mobile app or check manually from mobile app.', 'error');
                            setLoading(false);
                        }
                    } catch (error) {
                        console.error('Error polling for results:', error);
                        if (attempts < maxAttempts) {
                            setTimeout(pollForResults, 2000);
                        } else {
                            addLog('Failed to get results from mobile app', 'error');
                            setLoading(false);
                        }
                    }
                };

                // Start polling after 2 seconds
                setTimeout(pollForResults, 2000);
            } catch (error) {
                console.error('Error triggering mobile app:', error);
                addLog('Failed to trigger mobile app check', 'error');
                addLog('Please check mobile app connection or trigger manually from mobile app', 'error');
                setLoading(false);
            }
        } else {
            // No Workers URL configured
            addLog('Workers URL not configured. Please set Workers URL in Settings.', 'error');
            addLog('Mobile app integration requires Workers URL to be configured.', 'error');
            setLoading(false);
        }
    }, [loading, checkSingleDomain, addLog]);

    // Scheduler
    useEffect(() => {
        if (!loadedRef.current || domains.length === 0) return;

        // Skip auto-scan if KV limit is exceeded (but we're using D1 now, so this should not happen)
        // Note: D1 doesn't have write limits like KV, so this check is mainly for backward compatibility
        // Reset KV limit check since we're using D1 now
        if (kvLimitExceededRef.current) {
            console.log('⏸️ Auto-scan paused - KV limit exceeded (using D1 now, resetting...)');
            // Reset immediately since we're using D1 now
            kvLimitExceededRef.current = false;
            addLog('✅ KV limit check reset - Using D1 now (no write limits)', 'info');
        }

        const intervalMs = settings.checkInterval * 60 * 1000;

        // Check initially if overdue
        const now = Date.now();
        let oldestCheck = now;
        domains.forEach(d => {
            if (!d.lastCheck) oldestCheck = 0; // Never checked
            else if (d.lastCheck < oldestCheck) oldestCheck = d.lastCheck;
        });

        if (now - oldestCheck >= intervalMs && !loading && settings.checkInterval > 0) {
            // Debounce initial run to prevent double triggering on mount
            const timer = setTimeout(() => {
                addLog('Scheduled scan triggered', 'info');
                runAllChecks();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [loading, settings.checkInterval, domains.length]); // Dependencies

    // Shared auto-scan timer (sync with Workers API to avoid duplicate triggers)
    useEffect(() => {
        if (!loadedRef.current || settings.checkInterval <= 0) {
            setNextScanTime(null);
            return;
        }

        const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.workersUrl || settingsRef.current.backendUrl;
        if (!workersUrl) {
            console.log('Workers URL not configured, using local timer');
            // Fallback to local timer if Workers URL not configured
            const intervalMs = settings.checkInterval * 60 * 1000;
            const nextScan = Date.now() + intervalMs;
            setNextScanTime(nextScan);
            const intervalId = setInterval(() => {
                addLog('Auto-scan interval reached', 'info');
                runAllChecks();
                setNextScanTime(Date.now() + intervalMs);
            }, intervalMs);
            return () => clearInterval(intervalId);
        }

        let isChecking = false; // Prevent concurrent checks

        // Set initial next scan time immediately (fallback)
        const intervalMs = settings.checkInterval * 60 * 1000;
        const fallbackNextScan = Date.now() + intervalMs;
        setNextScanTime(fallbackNextScan);

        // Get shared next scan time from Workers API
        const syncNextScanTime = async () => {
            try {
                const response = await fetch(`${workersUrl.replace(/\/$/, '')}/api/next-scan-time`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.nextScanTime && data.nextScanTime > Date.now()) {
                        // Use shared next scan time
                        setNextScanTime(data.nextScanTime);
                        console.log(`📅 Using shared next scan time: ${new Date(data.nextScanTime).toLocaleString()}`);
                        return;
                    }
                }
                
                // No shared time or expired, set new one
                const nextScan = Date.now() + intervalMs;
                setNextScanTime(nextScan);
                // Save to Workers API
                try {
                    await fetch(`${workersUrl.replace(/\/$/, '')}/api/next-scan-time`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nextScanTime: nextScan, checkInterval: settings.checkInterval }),
                    });
                    console.log(`📅 Set new shared next scan time: ${new Date(nextScan).toLocaleString()}`);
                } catch (saveError) {
                    console.error('Error saving next scan time:', saveError);
                }
            } catch (error) {
                console.error('Error syncing next scan time:', error);
                // Keep fallback time that was set above
            }
        };

        // Sync immediately (but don't wait - we already set fallback)
        syncNextScanTime();

        // Check every 10 seconds if it's time to scan
        const checkInterval = setInterval(async () => {
            if (isChecking) return; // Prevent concurrent checks
            
            const currentNextScan = nextScanTime;
            if (currentNextScan && Date.now() >= currentNextScan) {
                isChecking = true;
                
                // Time to scan - check if someone else already triggered
                try {
                    const response = await fetch(`${workersUrl.replace(/\/$/, '')}/api/next-scan-time`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.nextScanTime && data.nextScanTime > Date.now()) {
                            // Someone else already updated, use their time
                            setNextScanTime(data.nextScanTime);
                            console.log('⏭️ Scan already triggered by another user, skipping');
                            isChecking = false;
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error checking next scan time:', error);
                }

                // Trigger scan and update next scan time
                addLog('Auto-scan interval reached', 'info');
                await runAllChecks();
                
                const intervalMs = settings.checkInterval * 60 * 1000;
                const nextScan = Date.now() + intervalMs;
                setNextScanTime(nextScan);
                
                // Save to Workers API
                try {
                    await fetch(`${workersUrl.replace(/\/$/, '')}/api/next-scan-time`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nextScanTime: nextScan, checkInterval: settings.checkInterval }),
                    });
                } catch (error) {
                    console.error('Error updating next scan time:', error);
                }
                
                isChecking = false;
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(checkInterval);
    }, [loadedRef.current, settings.checkInterval, runAllChecks, addLog, nextScanTime]);

    return (
        <div className="min-h-screen font-sans selection:bg-neon-blue selection:text-black">
            <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center mb-4 md:mb-0">
                        <div className="w-10 h-10 bg-neon-blue/10 rounded-full flex items-center justify-center mr-3 border border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                            <Shield className="w-6 h-6 text-neon-blue" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wider">SENTINEL <span className="text-neon-blue">DNS</span></h1>
                            <p className="text-xs text-gray-500 font-mono">CLOUD EDGE MONITOR</p>
                        </div>
                    </div>

                    <nav className="flex space-x-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-gray-800 text-neon-blue shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Activity className="w-4 h-4 inline mr-2" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-gray-800 text-neon-blue shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Terminal className="w-4 h-4 inline mr-2" />
                            Settings
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6">
                {activeTab === 'settings' ? (
                    <div className="max-w-2xl mx-auto animate-fadeIn">
                        <SettingsPanel settings={settings} onSave={setSettings} />
                    </div>
                ) : (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-4">
                                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
                                    <form onSubmit={handleAddDomain} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newUrl}
                                            onChange={(e) => setNewUrl(e.target.value)}
                                            placeholder="https://example.com"
                                            className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-neon-blue focus:outline-none transition-colors"
                                        />
                                        <button type="submit" className="bg-neon-blue hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded flex items-center transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    {domains.map(domain => (
                                        <DomainCard
                                            key={domain.id}
                                            domain={domain}
                                            onDelete={handleDeleteDomain}
                                            onRefresh={checkSingleDomain}
                                            onUpdate={handleUpdateDomain}
                                        />
                                    ))}
                                    {domains.length === 0 && (
                                        <div className="text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                                            No domains monitored. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Status Control</h3>
                                        {loading && <Activity className="w-4 h-4 text-neon-blue animate-pulse" />}
                                    </div>

                                    <button
                                        onClick={() => runAllChecks()}
                                        disabled={loading || domains.length === 0}
                                        className={`w-full py-4 rounded font-bold text-center mb-4 transition-all flex items-center justify-center ${loading
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]'
                                            }`}
                                    >
                                        {loading ? <span className="animate-pulse">SCANNING...</span> : <><Play className="w-4 h-4 mr-2 fill-current" /> RUN FULL SCAN</>}
                                    </button>

                                    <div className="space-y-3 pt-4 border-t border-gray-700">
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-400">Interval:</span>
                                            <span className="text-neon-blue font-mono">
                                                {settings.checkInterval >= 1440 ? `${(settings.checkInterval / 60).toFixed(0)} Hours` : `${settings.checkInterval} Mins`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-400">Auto-Scan:</span>
                                            <button
                                                onClick={() => {
                                                    if (settings.checkInterval > 0) {
                                                        // Pause: set to 0
                                                        setSettings(prev => ({ ...prev, checkInterval: 0 }));
                                                        addLog('Auto-scan paused', 'info');
                                                    } else {
                                                        // Resume: set to default 6 hours
                                                        setSettings(prev => ({ ...prev, checkInterval: 360 }));
                                                        addLog('Auto-scan resumed (6 hours interval)', 'success');
                                                    }
                                                }}
                                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${settings.checkInterval > 0
                                                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/50'
                                                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600'
                                                    }`}
                                                title={settings.checkInterval > 0 ? 'Click to pause auto-scan' : 'Click to resume auto-scan'}
                                            >
                                                {settings.checkInterval > 0 ? 'ON' : 'OFF'}
                                            </button>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-400">Next Auto-Scan:</span>
                                            <span className="text-gray-200 font-mono flex items-center">
                                                <Clock className="w-3 h-3 mr-1 text-gray-500" />
                                                {settings.checkInterval > 0 && nextScanTime
                                                    ? new Date(nextScanTime).toLocaleTimeString()
                                                    : 'Paused'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 h-[400px] flex flex-col shadow-inner">
                                    <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center">
                                        <Terminal className="w-4 h-4 mr-2" />
                                        System Logs
                                    </h3>
                                    <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs custom-scrollbar pr-2">
                                        {logs.map(log => (
                                            <div key={log.id} className="border-b border-gray-800 pb-1 last:border-0">
                                                <span className="text-gray-600 inline-block w-[70px]">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span className={`ml-2 ${log.type === 'error' ? 'text-red-500' :
                                                    log.type === 'alert' ? 'text-neon-red font-bold animate-pulse' :
                                                        log.type === 'success' ? 'text-neon-green' : 'text-gray-300'
                                                    }`}>{log.message}</span>
                                            </div>
                                        ))}
                                        {logs.length === 0 && <span className="text-gray-700 italic">Waiting for activity...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}