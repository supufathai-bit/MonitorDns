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
  checkInterval: 1440, // Default to 24 hours
  backendUrl: '' 
};

const createEmptyResults = (): Record<ISP, ISPResult> => {
    const keys = Object.values(ISP);
    const results: any = {};
    keys.forEach(k => {
        results[k] = { isp: k, status: Status.PENDING };
    });
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

  // Sync refs
  useEffect(() => { domainsRef.current = domains; }, [domains]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Load Data on Mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !loadedRef.current) {
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
            loadedRef.current = true;
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
  }, []);

  // Load results from Workers immediately after data is loaded
  useEffect(() => {
    if (!loadedRef.current) return;

    const loadResultsFromWorkers = async () => {
      const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.backendUrl;
      
      if (!workersUrl) {
        console.log('Workers URL not configured, skipping results fetch');
        return;
      }

      try {
        addLog('Fetching results from Workers API...', 'info');
        const response = await fetchResultsFromWorkers(workersUrl);
        
        if (response.success && response.results.length > 0) {
          addLog(`Loaded ${response.results.length} results from mobile app`, 'success');
          
          // Group results by hostname
          const resultsByHostname = new Map<string, typeof response.results>();
          response.results.forEach(result => {
            if (!resultsByHostname.has(result.hostname)) {
              resultsByHostname.set(result.hostname, []);
            }
            resultsByHostname.get(result.hostname)!.push(result);
          });

          // Update domains with results
          setDomains(prev => prev.map(domain => {
            const hostnameResults = resultsByHostname.get(domain.hostname);
            if (!hostnameResults || hostnameResults.length === 0) {
              return domain;
            }

            // Convert Workers results to ISPResult format
            const updatedResults = { ...domain.results };
            hostnameResults.forEach(workerResult => {
              const isp = workerResult.isp_name as ISP;
              if (updatedResults[isp]) {
                updatedResults[isp] = {
                  isp: isp,
                  status: workerResult.status as Status,
                  ip: workerResult.ip || '',
                  latency: workerResult.latency || 0,
                  details: `From mobile app (${new Date(workerResult.timestamp).toLocaleString()})`,
                  source: 'mobile-app',
                  deviceId: workerResult.device_id,
                  timestamp: workerResult.timestamp,
                };
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
    };

    // Load immediately when component mounts
    loadResultsFromWorkers();
  }, [loadedRef.current, addLog]);

  // Sync domains to Workers when component mounts and when domains change
  useEffect(() => {
    if (!loadedRef.current) return;
    if (domains.length === 0) return;

    const syncDomainsToWorkers = async () => {
      const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.backendUrl;
      if (!workersUrl) {
        console.log('Workers URL not configured, skipping domains sync');
        return;
      }

      try {
        // Extract hostnames from domains
        const hostnames = domains.map(d => d.hostname);
        
        addLog(`Syncing ${hostnames.length} domains to Workers API...`, 'info');
        console.log('Syncing domains to Workers:', hostnames);
        
        // Sync to Workers API
        const response = await fetch(`${workersUrl.replace(/\/$/, '')}/api/mobile-sync/domains`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: hostnames }),
        });

        if (response.ok) {
          const data = await response.json();
          addLog(`Successfully synced ${data.domains?.length || hostnames.length} domains to Workers API`, 'success');
          console.log('Domains synced to Workers:', data.domains || hostnames);
          
          // Verify sync by fetching domains back
          const verifyResponse = await fetch(`${workersUrl.replace(/\/$/, '')}/api/mobile-sync/domains`);
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('Verified domains in Workers:', verifyData.domains);
            if (verifyData.domains.length !== hostnames.length) {
              addLog(`Warning: Domains count mismatch. Expected ${hostnames.length}, got ${verifyData.domains.length}`, 'error');
            }
          }
        } else {
          const errorText = await response.text();
          addLog(`Failed to sync domains: ${response.status}`, 'error');
          console.error('Failed to sync domains:', errorText);
        }
      } catch (error) {
        addLog('Failed to sync domains to Workers API', 'error');
        console.error('Failed to sync domains:', error);
      }
    };

    // Sync when domains change (debounce to avoid too many requests)
    const timeoutId = setTimeout(syncDomainsToWorkers, 1000);
    return () => clearTimeout(timeoutId);
  }, [domains, loadedRef.current, addLog]);

  // Save Data on Change
  useEffect(() => {
    if (loadedRef.current) {
      localStorage.setItem('sentinel_domains', JSON.stringify(domains));
    }
  }, [domains]);

  useEffect(() => {
    if (loadedRef.current) localStorage.setItem('sentinel_settings', JSON.stringify(settings));
  }, [settings]);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => [{
        id: generateId(),
        timestamp: Date.now(),
        message,
        type
    }, ...prev].slice(0, 50));
  }, []);

  // Fetch results from Workers API on mount and periodically
  useEffect(() => {
    if (!loadedRef.current) return;

    const loadResultsFromWorkers = async () => {
      const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || settingsRef.current.backendUrl;
      
      if (!workersUrl) {
        console.log('Workers URL not configured, skipping results fetch');
        return;
      }

      try {
        addLog('Fetching results from Workers API...', 'info');
        const response = await fetchResultsFromWorkers(workersUrl);
        
        if (response.success && response.results.length > 0) {
          addLog(`Loaded ${response.results.length} results from mobile app`, 'success');
          
          // Group results by hostname
          const resultsByHostname = new Map<string, typeof response.results>();
          response.results.forEach(result => {
            if (!resultsByHostname.has(result.hostname)) {
              resultsByHostname.set(result.hostname, []);
            }
            resultsByHostname.get(result.hostname)!.push(result);
          });

          // Update domains with results
          setDomains(prev => prev.map(domain => {
            const hostnameResults = resultsByHostname.get(domain.hostname);
            if (!hostnameResults || hostnameResults.length === 0) {
              return domain;
            }

            // Convert Workers results to ISPResult format
            const updatedResults = { ...domain.results };
            hostnameResults.forEach(workerResult => {
              const isp = workerResult.isp_name as ISP;
              if (updatedResults[isp]) {
                updatedResults[isp] = {
                  isp: isp,
                  status: workerResult.status as Status,
                  ip: workerResult.ip || '',
                  latency: workerResult.latency || 0,
                  details: `From mobile app (${new Date(workerResult.timestamp).toLocaleString()})`,
                  source: 'mobile-app',
                  deviceId: workerResult.device_id,
                  timestamp: workerResult.timestamp,
                };
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
    };

    // Load immediately
    loadResultsFromWorkers();

    // Refresh every 30 seconds
    const interval = setInterval(loadResultsFromWorkers, 30000);

    return () => clearInterval(interval);
  }, [loadedRef.current, addLog]);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    
    const hostname = getHostname(newUrl);
    const newDomain: Domain = {
      id: generateId(),
      url: newUrl,
      hostname,
      lastCheck: null,
      results: createEmptyResults(),
      isMonitoring: true,
    };

    setDomains(prev => [...prev, newDomain]);
    setNewUrl('');
    addLog(`Added domain: ${hostname}`, 'info');
  };

  const handleDeleteDomain = (id: string) => {
    setDomains(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateDomain = (id: string, updates: Partial<Domain>) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    addLog(`Updated settings for ${domains.find(d => d.id === id)?.hostname}`, 'info');
  };

  const checkSingleDomain = useCallback(async (domainId: string) => {
    const currentDomain = domainsRef.current.find(d => d.id === domainId);
    if (!currentDomain) return;

    addLog(`Checking ${currentDomain.hostname}...`, 'info');

    const currentSettings = settingsRef.current;
    const results = await checkDomainHealth(currentDomain.hostname, currentSettings.backendUrl);
    
    const blockedISPs = Object.values(results)
        .filter(r => r.status === Status.BLOCKED)
        .map(r => r.isp);

    if (blockedISPs.length > 0) {
        addLog(`${currentDomain.hostname} BLOCKED on ${blockedISPs.join(', ')}`, 'alert');
        
        // Use Domain-Specific Chat ID if available, otherwise Global Default
        const targetChatId = currentDomain.telegramChatId || currentSettings.telegramChatId;

        if (currentSettings.telegramBotToken && targetChatId) {
             sendTelegramAlert(currentSettings.telegramBotToken, targetChatId, currentDomain, blockedISPs)
                .then(sent => {
                    if (sent) addLog(`Telegram alert sent to ${currentDomain.telegramChatId ? 'custom' : 'default'} chat`, 'success');
                    else addLog('Failed to send Telegram alert', 'error');
                });
        }
    } else {
        const errors = Object.values(results).filter(r => r.status === Status.ERROR);
        if (errors.length > 0) {
             addLog(`${currentDomain.hostname}: Check Failed`, 'error');
        } else {
             addLog(`${currentDomain.hostname} is clean`, 'success');
        }
    }

    setDomains(prev => prev.map(d => {
        if (d.id === domainId) {
            return { ...d, lastCheck: Date.now(), results: results };
        }
        return d;
    }));
  }, [addLog]);

  const runAllChecks = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    addLog('Starting full scan...', 'info');
    
    const currentSettings = settingsRef.current;
    const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || currentSettings.backendUrl;
    
    if (workersUrl) {
      // Trigger mobile app to check DNS
      try {
        addLog('Requesting mobile app to check DNS...', 'info');
        const triggerResponse = await fetch(`${workersUrl.replace(/\/$/, '')}/api/trigger-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!triggerResponse.ok) {
          const errorText = await triggerResponse.text();
          addLog(`Failed to trigger mobile app: ${triggerResponse.status}`, 'error');
          console.error('Trigger error:', errorText);
          setLoading(false);
          addLog('Please check mobile app connection or trigger manually from mobile app', 'error');
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
                
                // Group results by hostname
                const resultsByHostname = new Map<string, typeof response.results>();
                response.results.forEach(result => {
                  if (!resultsByHostname.has(result.hostname)) {
                    resultsByHostname.set(result.hostname, []);
                  }
                  resultsByHostname.get(result.hostname)!.push(result);
                });

                // Update domains with results
                setDomains(prev => prev.map(domain => {
                  const hostnameResults = resultsByHostname.get(domain.hostname);
                  if (!hostnameResults || hostnameResults.length === 0) {
                    return domain;
                  }

                  // Convert Workers results to ISPResult format
                  const updatedResults = { ...domain.results };
                  hostnameResults.forEach(workerResult => {
                    const isp = workerResult.isp_name as ISP;
                    if (updatedResults[isp]) {
                      updatedResults[isp] = {
                        isp: isp,
                        status: workerResult.status as Status,
                        ip: workerResult.ip || '',
                        latency: workerResult.latency || 0,
                        details: `From mobile app (${new Date(workerResult.timestamp).toLocaleString()})`,
                        source: 'mobile-app',
                        deviceId: workerResult.device_id,
                        timestamp: workerResult.timestamp,
                      };
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

                // Check for blocked domains
                const blockedDomains: Array<{ domain: string; isps: string[] }> = [];
                domainsRef.current.forEach(domain => {
                  const blockedISPs = Object.values(domain.results)
                    .filter(r => r.status === Status.BLOCKED)
                    .map(r => r.isp);
                  if (blockedISPs.length > 0) {
                    blockedDomains.push({ domain: domain.hostname, isps: blockedISPs });
                  }
                });

                if (blockedDomains.length > 0) {
                  blockedDomains.forEach(({ domain, isps }) => {
                    addLog(`${domain} BLOCKED on ${isps.join(', ')}`, 'alert');
                  });
                } else {
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
              addLog('Timeout waiting for mobile app results. Mobile app may not be polling for triggers.', 'error');
              addLog('Please check from mobile app manually or ensure mobile app is running and polling.', 'error');
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

  // Periodic Interval
  useEffect(() => {
    if (settings.checkInterval <= 0) return;
    const intervalId = setInterval(() => {
        addLog('Auto-scan interval reached', 'info');
        runAllChecks();
    }, settings.checkInterval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [settings.checkInterval, runAllChecks, addLog]);

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
                                className={`w-full py-4 rounded font-bold text-center mb-4 transition-all flex items-center justify-center ${
                                    loading 
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]'
                                }`}
                            >
                                {loading ? <span className="animate-pulse">SCANNING...</span> : <><Play className="w-4 h-4 mr-2 fill-current" /> RUN FULL SCAN</>}
                            </button>
                            
                            <div className="space-y-3 pt-4 border-t border-gray-700">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Interval:</span>
                                    <span className="text-neon-blue font-mono">
                                        {settings.checkInterval >= 1440 ? `${(settings.checkInterval / 60).toFixed(0)} Hours` : `${settings.checkInterval} Mins`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Next Auto-Scan:</span>
                                    <span className="text-gray-200 font-mono flex items-center">
                                        <Clock className="w-3 h-3 mr-1 text-gray-500" />
                                        {nextScanTime ? new Date(nextScanTime).toLocaleTimeString() : 'Paused'}
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
                                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                        </span>
                                        <span className={`ml-2 ${
                                            log.type === 'error' ? 'text-red-500' :
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