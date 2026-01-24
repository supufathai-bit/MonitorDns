// Cloudflare Workers API for Sentinel DNS Monitor
// This handles API requests since Cloudflare Pages is static

// Cloudflare Workers types
interface ScheduledEvent {
    scheduledTime: number;
    cron: string;
}

interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
}

export interface Env {
    // @ts-ignore - KVNamespace is provided by Cloudflare Workers runtime
    SENTINEL_DATA: KVNamespace;  // Keep for backward compatibility
    // @ts-ignore - D1Database is provided by Cloudflare Workers runtime
    DB: D1Database;  // D1 Database (better storage)
    API_KEY?: string; // Optional API key
}

interface SyncRequest {
    device_id: string;
    device_info: {
        isp: string;
        network_type: string;
        android_version?: string;
        app_version?: string;
    };
    results: Array<{
        hostname: string;
        isp_name: string;
        status: string;
        ip: string;
        timestamp: number;
        latency?: number;
    }>;
}

export default {
    // Scheduled handler for Cron Trigger (runs every 10 minutes)
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('⏰ [Cron] Scheduled event triggered');

        try {
            // Get next scan time from D1
            const key = 'next_scan_time';
            const result = await env.DB.prepare(
                "SELECT value, updated_at FROM settings WHERE key = ?"
            ).bind(key).first();

            if (!result) {
                console.log('⏰ [Cron] No next scan time found, skipping');
                return;
            }

            const data = JSON.parse(result.value as string);
            const nextScanTime = data.nextScanTime;
            const checkInterval = data.checkInterval || 360;

            if (!nextScanTime) {
                console.log('⏰ [Cron] No next scan time set, skipping');
                return;
            }

            const now = Date.now();
            const timeUntilScan = nextScanTime - now;

            // Check if it's time to scan (within 5 minutes window)
            if (timeUntilScan <= 0 && timeUntilScan >= -300000) { // -5 minutes tolerance
                console.log(`⏰ [Cron] Time to scan! nextScanTime: ${new Date(nextScanTime).toISOString()}, now: ${new Date(now).toISOString()}`);

                // Trigger mobile app to check DNS
                // Mobile app will send results back via /api/mobile-sync endpoint
                const triggerKey = 'trigger:check';
                const triggerData = {
                    triggered: true,
                    timestamp: now,
                    source: 'cron-auto-scan'
                };

                // Save trigger to D1
                try {
                    await env.DB.prepare(
                        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
                    ).bind(
                        triggerKey,
                        JSON.stringify(triggerData),
                        now
                    ).run();
                    console.log('⏰ [Cron] Trigger check saved to D1 (mobile app will check and send results)');
                } catch (error) {
                    console.error('⏰ [Cron] Error saving trigger to D1:', error);
                }

                // Also save to KV for backward compatibility
                try {
                    await env.SENTINEL_DATA.put(triggerKey, JSON.stringify(triggerData));
                } catch (error) {
                    console.warn('⏰ [Cron] Failed to save trigger to KV (non-critical):', error);
                }

                // Update next scan time
                const intervalMs = checkInterval * 60 * 1000;
                const newNextScanTime = now + intervalMs;
                const nextScanData = {
                    nextScanTime: newNextScanTime,
                    checkInterval: checkInterval,
                    timestamp: now
                };

                await env.DB.prepare(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
                ).bind(
                    key,
                    JSON.stringify(nextScanData),
                    now
                ).run();

                console.log(`⏰ [Cron] Next scan time updated: ${new Date(newNextScanTime).toISOString()}`);
            } else {
                console.log(`⏰ [Cron] Not time yet. Time until scan: ${Math.round(timeUntilScan / 1000 / 60)} minutes`);
            }

            // Check and send alerts based on latest results in D1
            // Mobile app sends results to /api/mobile-sync, which saves to D1
            // This cron job checks D1 every 10 minutes and sends alerts for all domains (both blocked and active)
            // BUT only sends if interval has passed (respects checkInterval from settings)
            console.log('🔔 [Cron] Checking for all domains and sending alerts from D1 results (both blocked and active)...');
            await checkAndSendAlerts(env);
        } catch (error) {
            console.error('⏰ [Cron] Error in scheduled handler:', error);
        }
    },

    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Optional: API key check
        if (env.API_KEY) {
            const apiKey = request.headers.get('X-API-Key');
            if (apiKey !== env.API_KEY) {
                return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            }
        }

        // Routes
        if (url.pathname === '/api/mobile-sync' && request.method === 'POST') {
            return handleMobileSync(request, env, corsHeaders);
        }

        if (url.pathname === '/api/mobile-sync/domains' && request.method === 'GET') {
            return handleGetDomains(request, env, corsHeaders);
        }

        if (url.pathname === '/api/results' && request.method === 'GET') {
            return handleGetResults(request, env, corsHeaders);
        }

        // Update domains list (for frontend to sync)
        if (url.pathname === '/api/mobile-sync/domains' && request.method === 'POST') {
            return handleUpdateDomains(request, env, corsHeaders);
        }

        // Trigger mobile app to check DNS (for frontend to request)
        if (url.pathname === '/api/trigger-check' && request.method === 'POST') {
            return handleTriggerCheck(request, env, corsHeaders);
        }

        // Check if check is triggered (for mobile app to poll)
        if (url.pathname === '/api/trigger-check' && request.method === 'GET') {
            return handleGetTriggerCheck(request, env, corsHeaders);
        }

        // DNS Check API - Uses DoH for Global, cached results for ISP-specific
        if (url.pathname === '/api/check' && request.method === 'POST') {
            return handleDNSCheck(request, env, corsHeaders);
        }

        // HTTP Content Check API - Check if domain shows blocked page
        if (url.pathname === '/api/check-content' && request.method === 'POST') {
            return handleHTTPContentCheck(request, env, corsHeaders);
        }

        // Frontend data sync endpoints
        if (url.pathname === '/api/frontend/domains' && request.method === 'GET') {
            return handleGetFrontendDomains(request, env, corsHeaders);
        }

        if (url.pathname === '/api/frontend/domains' && request.method === 'POST') {
            return handleSaveFrontendDomains(request, env, corsHeaders);
        }

        if (url.pathname === '/api/frontend/settings' && request.method === 'GET') {
            return handleGetFrontendSettings(request, env, corsHeaders);
        }

        if (url.pathname === '/api/frontend/settings' && request.method === 'POST') {
            return handleSaveFrontendSettings(request, env, corsHeaders);
        }

        // Get next auto-scan time (shared across all users)
        if (url.pathname === '/api/next-scan-time' && request.method === 'GET') {
            return handleGetNextScanTime(request, env, corsHeaders);
        }

        // Update next auto-scan time (shared across all users)
        if (url.pathname === '/api/next-scan-time' && request.method === 'POST') {
            return handleUpdateNextScanTime(request, env, corsHeaders);
        }

        // Authentication endpoints
        if (url.pathname === '/api/auth/login' && request.method === 'POST') {
            return handleLogin(request, env, corsHeaders);
        }

        if (url.pathname === '/api/auth/verify' && request.method === 'GET') {
            return handleVerifyToken(request, env, corsHeaders);
        }

        if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
            return handleLogout(request, env, corsHeaders);
        }

        return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    },
};

// Handle mobile sync
async function handleMobileSync(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body: SyncRequest = await request.json();
        const { device_id, device_info, results } = body;

        // Validate
        if (!device_id || !results || !Array.isArray(results)) {
            return jsonResponse(
                { error: 'Invalid request. device_id and results array required' },
                400,
                corsHeaders
            );
        }

        // Validate each result
        for (const result of results) {
            if (!result.hostname || !result.isp_name || !result.status) {
                return jsonResponse(
                    { error: 'Invalid result format' },
                    400,
                    corsHeaders
                );
            }
        }

        // Store results in D1 (primary) and KV (backup)
        const timestamp = Date.now();
        let kvWriteCount = 0; // Track KV writes (declared outside try block for error handling)
        const MAX_KV_WRITES = 50; // Limit writes per sync to avoid hitting daily limit

        try {
            // Save to D1 first (primary storage - no write limits!)
            try {
                const d1Stmt = env.DB.prepare(
                    "INSERT OR REPLACE INTO results (id, hostname, isp_name, status, ip, latency, device_id, device_info, timestamp, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );

                const d1Batch = results.map(result => {
                    // Use device_info.isp if isp_name is "Unknown" or empty
                    let ispName = result.isp_name;
                    if (!ispName || ispName === 'Unknown' || ispName === 'unknown') {
                        ispName = device_info?.isp || 'Unknown';
                    }

                    // Determine status based on IP address:
                    // - If IP exists = ACTIVE (DNS resolution successful)
                    // - If no IP = BLOCKED (DNS resolution failed)
                    // This ensures consistency: got IP = ACTIVE, no IP = BLOCKED
                    let finalStatus = result.status;
                    if (result.ip && result.ip.trim() !== '') {
                        // Got IP address = DNS resolution successful = ACTIVE
                        finalStatus = 'ACTIVE';
                    } else {
                        // No IP address = DNS resolution failed = BLOCKED
                        finalStatus = 'BLOCKED';
                    }

                    const resultId = `${result.hostname}:${ispName}:${device_id}`;
                    return d1Stmt.bind(
                        resultId,
                        result.hostname,
                        ispName, // Use corrected ISP name
                        finalStatus,
                        result.ip || null,
                        result.latency || null,
                        device_id,
                        JSON.stringify(device_info || {}),
                        timestamp,
                        'mobile-app'
                    );
                });

                await env.DB.batch(d1Batch);
                console.log(`Mobile sync: Saved ${results.length} results to D1`);
            } catch (d1Error) {
                console.error('D1 save error (non-critical, continuing with KV):', d1Error);
                // Continue with KV even if D1 fails
            }

            // Store latest result per domain+ISP in KV (optional backup for faster reads)
            // D1 is primary, KV is just for backward compatibility and performance
            // If KV limit exceeded, it's OK - D1 already saved successfully
            const writePromises: Promise<void>[] = [];

            for (const result of results) {
                // Stop if we're approaching the limit (optional writes)
                if (kvWriteCount >= MAX_KV_WRITES) {
                    console.warn(`Reached KV write limit (${MAX_KV_WRITES}) for this sync. Skipping remaining KV writes (D1 already saved).`);
                    break;
                }

                // Use device_info.isp if isp_name is "Unknown" or empty
                let ispName = result.isp_name;
                if (!ispName || ispName === 'Unknown' || ispName === 'unknown') {
                    ispName = device_info?.isp || 'Unknown';
                }

                const latestKey = `latest:${result.hostname}:${ispName}`;

                // Check if we need to update (only if different or missing)
                const existingData = await env.SENTINEL_DATA.get(latestKey);
                let shouldUpdate = true;

                if (existingData) {
                    try {
                        const existing = JSON.parse(existingData);
                        // Only update if status changed or timestamp is much older (10 minutes)
                        if (existing.status === result.status &&
                            existing.ip === result.ip &&
                            (timestamp - existing.timestamp) < 600000) {
                            shouldUpdate = false;
                        }
                    } catch {
                        // If parse fails, update anyway
                    }
                }

                if (shouldUpdate) {
                    kvWriteCount++;
                    writePromises.push(
                        env.SENTINEL_DATA.put(latestKey, JSON.stringify({
                            ...result,
                            isp_name: ispName, // Use corrected ISP name
                            device_id,
                            device_info,
                            timestamp,
                            source: 'mobile-app',
                        }), {
                            expirationTtl: 86400 * 7, // 7 days
                        }).catch(err => {
                            // KV writes are optional - don't throw error, just log
                            console.warn(`Failed to write ${latestKey} to KV (non-critical, D1 already saved):`, err.message);
                        })
                    );
                }
            }

            // Store device info in D1 (primary storage - no write limits!)
            try {
                const existingDevice = await env.DB.prepare(
                    "SELECT device_info, last_sync FROM devices WHERE device_id = ?"
                ).bind(device_id).first();

                let shouldUpdateDevice = true;

                if (existingDevice) {
                    try {
                        const existing = JSON.parse(existingDevice.device_info as string);
                        // Only update if device info changed or last sync was more than 2 hours ago
                        if (existing.isp === device_info.isp &&
                            existing.network_type === device_info.network_type &&
                            (timestamp - (existingDevice.last_sync as number)) < 7200000) {
                            shouldUpdateDevice = false;
                        }
                    } catch {
                        // If parse fails, update anyway
                    }
                }

                if (shouldUpdateDevice) {
                    await env.DB.prepare(
                        "INSERT OR REPLACE INTO devices (device_id, device_info, last_sync, updated_at) VALUES (?, ?, ?, ?)"
                    ).bind(
                        device_id,
                        JSON.stringify(device_info || {}),
                        timestamp,
                        timestamp
                    ).run();
                    console.log(`Device info saved to D1 for device ${device_id}`);
                }
            } catch (d1Error) {
                console.warn('D1 device info save error (non-critical):', d1Error);
                // Fallback to KV only if D1 fails and we're not at limit
                if (kvWriteCount < MAX_KV_WRITES) {
                    const deviceKey = `device:${device_id}`;
                    const existingDevice = await env.SENTINEL_DATA.get(deviceKey);
                    let shouldUpdateDevice = true;

                    if (existingDevice) {
                        try {
                            const existing = JSON.parse(existingDevice);
                            if (existing.device_info?.isp === device_info.isp &&
                                existing.device_info?.network_type === device_info.network_type &&
                                (timestamp - (existing.last_sync || 0)) < 7200000) {
                                shouldUpdateDevice = false;
                            }
                        } catch {
                            // If parse fails, update anyway
                        }
                    }

                    if (shouldUpdateDevice) {
                        kvWriteCount++;
                        writePromises.push(
                            env.SENTINEL_DATA.put(deviceKey, JSON.stringify({
                                device_id,
                                device_info,
                                last_sync: timestamp,
                            })).catch(err => {
                                console.error(`Failed to write ${deviceKey} to KV:`, err);
                            })
                        );
                    }
                }
            }

            // Clear trigger flag after sync (mobile app has checked)
            // Delete from D1 first, then KV
            const triggerKey = 'trigger:check';
            try {
                await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(triggerKey).run();
                console.log('Trigger check cleared from D1');
            } catch (d1Error) {
                console.warn('D1 delete error (non-critical):', d1Error);
            }
            // Also clear from KV (backward compatibility)
            writePromises.push(
                env.SENTINEL_DATA.delete(triggerKey).catch(err => {
                    console.error(`Failed to delete ${triggerKey} from KV:`, err);
                    // Don't throw - deletion failure is not critical
                })
            );

            // Execute all KV writes in parallel (optional - failures are non-critical)
            if (writePromises.length > 0) {
                await Promise.allSettled(writePromises); // Use allSettled to not fail on KV errors
                const successfulWrites = writePromises.length;
                console.log(`Mobile sync: Attempted ${successfulWrites} KV writes (${results.length} results saved to D1)`);
            } else {
                console.log(`Mobile sync: No KV writes needed (all results unchanged, D1 already saved)`);
            }

        } catch (kvError: any) {
            // KV errors are non-critical - D1 already saved successfully
            console.warn('KV write error (non-critical, D1 save succeeded):', kvError);
            // Continue - don't throw error since D1 save succeeded
        }

        // Don't send alerts here - let Cron job handle it based on interval
        // This prevents duplicate alerts when mobile app syncs results
        // Cron job runs every 10 minutes and checks interval before sending

        return jsonResponse({
            success: true,
            message: `Received ${results.length} results from device ${device_id}`,
            processed: results.length,
            timestamp,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Mobile sync error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Helper: Get domains from D1
async function getDomainsFromD1(env: Env): Promise<string[]> {
    try {
        // Get all domains (is_monitoring = 1 or NULL, since old records might not have this field)
        const result = await env.DB.prepare(
            "SELECT hostname FROM domains WHERE is_monitoring = 1 OR is_monitoring IS NULL ORDER BY hostname"
        ).all();

        return result.results.map((row: any) => row.hostname);
    } catch (error) {
        console.error('D1 getDomains error:', error);
        return [];
    }
}

// Helper: Save domain to D1
async function saveDomainToD1(env: Env, hostname: string, url?: string): Promise<void> {
    const id = hostname.toLowerCase().replace(/^www\./, '');
    await env.DB.prepare(
        "INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(
        id,
        hostname.toLowerCase().replace(/^www\./, ''),
        url || hostname,
        Date.now()
    ).run();
}

// Get domains to check (for mobile app)
async function handleGetDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first (primary storage - same as frontend)
        let domains: string[] = [];
        try {
            domains = await getDomainsFromD1(env);
            if (domains.length > 0) {
                console.log(`Mobile app: Got ${domains.length} domains from D1`);
            }
        } catch (d1Error) {
            console.warn('D1 getDomains error, falling back to KV:', d1Error);
        }

        // Fallback to KV if D1 is empty or failed
        let source = 'D1';
        if (domains.length === 0) {
            const domainsKey = 'domains:list';
            const storedDomains = await env.SENTINEL_DATA.get(domainsKey);

            if (storedDomains) {
                try {
                    const parsed = JSON.parse(storedDomains);
                    if (Array.isArray(parsed)) {
                        // Normalize hostnames (remove www, lowercase)
                        domains = parsed.map((d: any) => {
                            const str = typeof d === 'string' ? d : (d.hostname || d.url || String(d));
                            return str.replace(/^www\./i, '').toLowerCase();
                        });
                        // Remove duplicates and sort
                        domains = [...new Set(domains)].sort();
                        console.log(`Mobile app: Got ${domains.length} domains from KV (fallback)`);
                        source = 'KV';
                    }
                } catch (e) {
                    console.error('Error parsing domains from KV:', e);
                }
            }
        }

        // If still no domains, use defaults
        if (domains.length === 0) {
            domains = [
                'ufathai.win',
                'ufathai.com',
                'www.zec777.com',
                'google.com',
            ];
            console.log('Mobile app: Using default domains');
            source = 'defaults';
        }

        console.log(`Mobile app domains: ${domains.length} domains from ${source}`);

        return jsonResponse({
            success: true,
            domains,
            interval: 3600000, // 1 hour in milliseconds
            message: 'Domains to check',
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Get domains error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Update domains list (for frontend to sync)
async function handleUpdateDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { domains } = body;

        if (!domains || !Array.isArray(domains)) {
            return jsonResponse(
                { error: 'Invalid request. domains array required' },
                400,
                corsHeaders
            );
        }

        // Extract and normalize hostnames
        const hostnames = domains.map(domain => {
            let hostname = domain;
            if (domain.startsWith('http://') || domain.startsWith('https://')) {
                try {
                    const url = new URL(domain);
                    hostname = url.hostname;
                } catch {
                    hostname = domain;
                }
            }
            return hostname.replace(/^www\./i, '').toLowerCase();
        });
        const uniqueHostnames = [...new Set(hostnames)].sort();

        // Check if changed (compare with D1)
        const existingDomains = await getDomainsFromD1(env);
        const existingSorted = existingDomains.map(h => h.toLowerCase()).sort();
        const newSorted = uniqueHostnames.map(h => h.toLowerCase()).sort();
        const domainsChanged = JSON.stringify(existingSorted) !== JSON.stringify(newSorted);

        if (!domainsChanged) {
            return jsonResponse({
                success: true,
                message: 'Domains unchanged, no update needed',
                domains: uniqueHostnames,
                updated: false,
            }, 200, corsHeaders);
        }

        // Save to D1 (primary storage)
        // First, delete domains that are not in the new list
        // Normalize both lists for comparison (lowercase, no www prefix)
        const normalizeHostname = (h: string) => h.toLowerCase().replace(/^www\./, '');
        const normalizedNew = uniqueHostnames.map(normalizeHostname);

        const domainsToDelete = existingDomains.filter(existing => {
            const normalizedExisting = normalizeHostname(existing);
            return !normalizedNew.includes(normalizedExisting);
        });

        if (domainsToDelete.length > 0) {
            console.log(`Deleting ${domainsToDelete.length} old domains:`, domainsToDelete);

            // Delete domains and their related results
            // For each hostname to delete, we need to find all variations (with/without www, case variations)
            // First, get all actual hostnames from D1 that match the normalized versions
            const deleteDomainBatch: any[] = [];
            const deleteResultsBatch: any[] = [];

            for (const hostnameToDelete of domainsToDelete) {
                const normalized = normalizeHostname(hostnameToDelete);

                // Find all hostnames in D1 that normalize to the same value
                // Get all domains and filter in JavaScript (more reliable than SQL REPLACE)
                const allDomains = await env.DB.prepare("SELECT hostname FROM domains").all();
                const matchingHostnames = (allDomains.results as any[])
                    .map(row => row.hostname)
                    .filter(h => normalizeHostname(h) === normalized);

                // Delete each matching domain and its results
                for (const actualHostname of matchingHostnames) {
                    deleteDomainBatch.push(env.DB.prepare("DELETE FROM domains WHERE hostname = ?").bind(actualHostname));
                    deleteResultsBatch.push(env.DB.prepare("DELETE FROM results WHERE hostname = ?").bind(actualHostname));
                }
            }

            if (deleteDomainBatch.length > 0) {
                await env.DB.batch(deleteDomainBatch);
                await env.DB.batch(deleteResultsBatch);
                console.log(`Deleted ${deleteDomainBatch.length} domain records and their results from D1`);
            }
        }

        // Then, insert or replace domains in the new list
        // Set is_monitoring = 1 for all domains in the new list
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, is_monitoring, updated_at) VALUES (?, ?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname =>
            stmt.bind(hostname, hostname, hostname, 1, Date.now())
        );
        await env.DB.batch(batch);

        // Also save to KV for backward compatibility
        try {
            await env.SENTINEL_DATA.put('domains:list', JSON.stringify(uniqueHostnames));
        } catch (kvError: any) {
            // KV error is not critical - D1 is primary
            console.warn('Failed to update KV (non-critical):', kvError);
        }

        console.log(`Updated ${uniqueHostnames.length} domains in D1`);

        return jsonResponse({
            success: true,
            message: `Updated ${uniqueHostnames.length} domains`,
            domains: uniqueHostnames,
            updated: true,
        }, 200, corsHeaders);
    } catch (error: any) {
        console.error('Update domains error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Get next auto-scan time (shared across all users)
async function handleGetNextScanTime(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const key = 'next_scan_time';

        // Get from D1
        try {
            const result = await env.DB.prepare(
                "SELECT value, updated_at FROM settings WHERE key = ?"
            ).bind(key).first();

            if (result) {
                try {
                    const data = JSON.parse(result.value as string);
                    return jsonResponse({
                        success: true,
                        nextScanTime: data.nextScanTime,
                        checkInterval: data.checkInterval || 360,
                        timestamp: data.timestamp || result.updated_at,
                    }, 200, corsHeaders);
                } catch {
                    // If parse fails, return default
                }
            }
        } catch (d1Error) {
            console.warn('D1 get next scan time error:', d1Error);
        }

        // Return default if not found
        return jsonResponse({
            success: true,
            nextScanTime: null,
            checkInterval: 360,
            timestamp: Date.now(),
        }, 200, corsHeaders);
    } catch (error: any) {
        console.error('Get next scan time error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Authentication handlers
async function handleLogin(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return jsonResponse(
                { error: 'Username and password required' },
                400,
                corsHeaders
            );
        }

        // Get user from D1
        try {
            const result = await env.DB.prepare(
                "SELECT * FROM users WHERE username = ?"
            ).bind(username).first();

            if (!result) {
                return jsonResponse(
                    { error: 'Invalid username or password' },
                    401,
                    corsHeaders
                );
            }

            // Simple password check (in production, use bcrypt or similar)
            // For now, we'll store hashed password in D1
            const userData = JSON.parse(result.password_hash as string);
            const storedHash = userData.hash;
            const inputHash = await hashPassword(password);

            if (inputHash !== storedHash) {
                return jsonResponse(
                    { error: 'Invalid username or password' },
                    401,
                    corsHeaders
                );
            }

            // Generate token (simple JWT-like token)
            const token = generateToken(username);

            // Save token to D1
            const tokenKey = `auth_token:${token}`;
            await env.DB.prepare(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
            ).bind(
                tokenKey,
                JSON.stringify({ username, createdAt: Date.now() }),
                Date.now()
            ).run();

            return jsonResponse({
                success: true,
                token,
                username,
            }, 200, corsHeaders);
        } catch (d1Error) {
            console.error('D1 login error:', d1Error);
            return jsonResponse(
                { error: 'Database error' },
                500,
                corsHeaders
            );
        }
    } catch (error: any) {
        console.error('Login error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

async function handleVerifyToken(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');

        if (!token) {
            return jsonResponse(
                { error: 'Token required' },
                401,
                corsHeaders
            );
        }

        // Verify token from D1
        const tokenKey = `auth_token:${token}`;
        const result = await env.DB.prepare(
            "SELECT value FROM settings WHERE key = ?"
        ).bind(tokenKey).first();

        if (!result) {
            return jsonResponse(
                { error: 'Invalid token' },
                401,
                corsHeaders
            );
        }

        const tokenData = JSON.parse(result.value as string);
        const tokenAge = Date.now() - tokenData.createdAt;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (tokenAge > maxAge) {
            // Token expired
            await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(tokenKey).run();
            return jsonResponse(
                { error: 'Token expired' },
                401,
                corsHeaders
            );
        }

        return jsonResponse({
            success: true,
            username: tokenData.username,
        }, 200, corsHeaders);
    } catch (error: any) {
        console.error('Verify token error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

async function handleLogout(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (token) {
            const tokenKey = `auth_token:${token}`;
            await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(tokenKey).run();
        }

        return jsonResponse({
            success: true,
            message: 'Logged out successfully',
        }, 200, corsHeaders);
    } catch (error: any) {
        console.error('Logout error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Helper functions
async function hashPassword(password: string): Promise<string> {
    // Simple hash (in production, use bcrypt or Web Crypto API)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(username: string): string {
    // Simple token generation (in production, use JWT)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${btoa(username)}.${timestamp}.${random}`;
}

// Update next auto-scan time (shared across all users)
async function handleUpdateNextScanTime(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { nextScanTime, checkInterval } = body;

        if (nextScanTime === undefined) {
            return jsonResponse(
                { error: 'nextScanTime is required' },
                400,
                corsHeaders
            );
        }

        const key = 'next_scan_time';
        const timestamp = Date.now();

        // Save to D1
        try {
            await env.DB.prepare(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
            ).bind(
                key,
                JSON.stringify({
                    nextScanTime,
                    checkInterval: checkInterval || 360,
                    timestamp,
                }),
                timestamp
            ).run();

            console.log(`Next scan time updated: ${new Date(nextScanTime).toLocaleString()}`);
        } catch (d1Error) {
            console.error('D1 save error:', d1Error);
            return jsonResponse(
                { error: 'Failed to save next scan time' },
                500,
                corsHeaders
            );
        }

        return jsonResponse({
            success: true,
            message: 'Next scan time updated',
            nextScanTime,
            timestamp,
        }, 200, corsHeaders);
    } catch (error: any) {
        console.error('Update next scan time error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Trigger mobile app to check DNS (for frontend)
async function handleTriggerCheck(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const timestamp = Date.now();
        const triggerKey = 'trigger:check';

        // Try D1 first (primary storage - no write limits!)
        try {
            // Check if trigger already exists in D1
            const existingResult = await env.DB.prepare(
                "SELECT value, updated_at FROM settings WHERE key = ?"
            ).bind(triggerKey).first();

            if (existingResult) {
                try {
                    const existing = JSON.parse(existingResult.value as string);
                    // If trigger was set less than 1 minute ago, don't update
                    if (timestamp - existing.timestamp < 60000) {
                        return jsonResponse({
                            success: true,
                            message: 'Check already triggered. Mobile app will check DNS soon.',
                            timestamp: existing.timestamp,
                            cached: true,
                        }, 200, corsHeaders);
                    }
                } catch {
                    // If parse fails, continue to update
                }
            }

            // Save trigger to D1
            await env.DB.prepare(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
            ).bind(
                triggerKey,
                JSON.stringify({
                    triggered: true,
                    timestamp,
                    requested_by: 'frontend',
                }),
                timestamp
            ).run();

            console.log('Trigger check saved to D1');
        } catch (d1Error) {
            console.error('D1 save error, falling back to KV:', d1Error);
            // Fallback to KV (for backward compatibility)
            const existingTrigger = await env.SENTINEL_DATA.get(triggerKey);
            if (existingTrigger) {
                try {
                    const existing = JSON.parse(existingTrigger);
                    if (timestamp - existing.timestamp < 60000) {
                        return jsonResponse({
                            success: true,
                            message: 'Check already triggered. Mobile app will check DNS soon.',
                            timestamp: existing.timestamp,
                            cached: true,
                        }, 200, corsHeaders);
                    }
                } catch {
                    // If parse fails, continue to update
                }
            }

            await env.SENTINEL_DATA.put(triggerKey, JSON.stringify({
                triggered: true,
                timestamp,
                requested_by: 'frontend',
            }), {
                expirationTtl: 300, // 5 minutes
            });
        }

        return jsonResponse({
            success: true,
            message: 'Check triggered. Mobile app will check DNS soon.',
            timestamp,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Trigger check error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Check if check is triggered (for mobile app to poll)
async function handleGetTriggerCheck(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const triggerKey = 'trigger:check';

        // Try D1 first (primary storage)
        try {
            const result = await env.DB.prepare(
                "SELECT value, updated_at FROM settings WHERE key = ?"
            ).bind(triggerKey).first();

            if (result) {
                try {
                    const data = JSON.parse(result.value as string);
                    // Check if trigger is still valid (within 5 minutes)
                    const age = Date.now() - data.timestamp;
                    if (age < 300000) { // 5 minutes
                        return jsonResponse({
                            success: true,
                            triggered: true,
                            timestamp: data.timestamp,
                            requested_by: data.requested_by,
                        }, 200, corsHeaders);
                    } else {
                        // Trigger expired, delete it
                        await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(triggerKey).run();
                    }
                } catch {
                    // If parse fails, treat as no trigger
                }
            }
        } catch (d1Error) {
            console.warn('D1 read error, falling back to KV:', d1Error);
        }

        // Fallback to KV
        const triggerData = await env.SENTINEL_DATA.get(triggerKey);
        if (triggerData) {
            const data = JSON.parse(triggerData);
            return jsonResponse({
                success: true,
                triggered: true,
                timestamp: data.timestamp,
                requested_by: data.requested_by,
            }, 200, corsHeaders);
        }

        return jsonResponse({
            success: true,
            triggered: false,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Get trigger check error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Get results (for frontend)
async function handleGetResults(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const url = new URL(request.url);
        const hostname = url.searchParams.get('hostname');
        const isp = url.searchParams.get('isp');

        // Try D1 first (primary storage)
        try {
            let d1Query;
            if (hostname && isp) {
                // Get latest result for specific domain+ISP
                d1Query = env.DB.prepare(
                    "SELECT * FROM results WHERE hostname = ? AND isp_name = ? ORDER BY timestamp DESC LIMIT 1"
                ).bind(hostname, isp);
            } else if (hostname) {
                // Get all results for specific domain
                d1Query = env.DB.prepare(
                    "SELECT * FROM results WHERE hostname = ? ORDER BY timestamp DESC"
                ).bind(hostname);
            } else {
                // Get all latest results (get latest for each domain+ISP combination)
                // D1 doesn't support window functions, so we'll get the most recent result per hostname+isp_name
                d1Query = env.DB.prepare(
                    "SELECT r1.* FROM results r1 INNER JOIN (SELECT hostname, isp_name, MAX(timestamp) as max_timestamp FROM results GROUP BY hostname, isp_name) r2 ON r1.hostname = r2.hostname AND r1.isp_name = r2.isp_name AND r1.timestamp = r2.max_timestamp ORDER BY r1.timestamp DESC"
                );
            }

            const d1Result = await d1Query.all();

            if (d1Result.results && d1Result.results.length > 0) {
                const formattedResults = d1Result.results.map((row: any) => {
                    let deviceInfo = {};
                    try {
                        deviceInfo = JSON.parse(row.device_info || '{}');
                    } catch {
                        deviceInfo = {};
                    }

                    return {
                        hostname: row.hostname,
                        isp_name: row.isp_name,
                        status: row.status,
                        ip: row.ip,
                        latency: row.latency,
                        device_id: row.device_id,
                        device_info: deviceInfo,
                        timestamp: row.timestamp,
                        source: row.source || 'mobile-app',
                    };
                });

                if (hostname && isp) {
                    return jsonResponse({
                        success: true,
                        result: formattedResults[0] || null,
                        message: formattedResults[0] ? undefined : 'No result found',
                    }, 200, corsHeaders);
                }

                return jsonResponse({
                    success: true,
                    results: formattedResults,
                    count: formattedResults.length,
                }, 200, corsHeaders);
            }
        } catch (d1Error) {
            console.warn('D1 read error, falling back to KV:', d1Error);
        }

        // Fallback to KV
        if (hostname && isp) {
            // Get latest result for specific domain+ISP
            const key = `latest:${hostname}:${isp}`;
            const data = await env.SENTINEL_DATA.get(key);

            if (data) {
                return jsonResponse({
                    success: true,
                    result: JSON.parse(data),
                }, 200, corsHeaders);
            }

            return jsonResponse({
                success: true,
                result: null,
                message: 'No result found',
            }, 200, corsHeaders);
        }

        // Get all latest results from KV
        const keys = await env.SENTINEL_DATA.list({ prefix: 'latest:' });
        const results = await Promise.all(
            keys.keys.map(async (key) => {
                const data = await env.SENTINEL_DATA.get(key.name);
                return data ? JSON.parse(data) : null;
            })
        );

        return jsonResponse({
            success: true,
            results: results.filter(r => r !== null),
            count: results.length,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Get results error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Handle DNS Check - Uses DoH for Global, cached results for ISP-specific
async function handleDNSCheck(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { hostname, isp_name } = body;

        if (!hostname) {
            return jsonResponse({ error: 'Hostname required' }, 400, corsHeaders);
        }

        // For Global (Google), use DNS-over-HTTPS
        if (isp_name === 'Global (Google)') {
            try {
                const dohUrl = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`;
                const dohResponse = await fetch(dohUrl, {
                    headers: { 'Accept': 'application/dns-json' }
                });

                if (dohResponse.ok) {
                    const dohData = await dohResponse.json();

                    if (dohData.Answer && dohData.Answer.length > 0) {
                        const ip = dohData.Answer[0].data;
                        return jsonResponse({
                            isp: 'Global (Google)',
                            status: 'ACTIVE',
                            ip: ip,
                            latency: 0,
                            details: 'Resolved via Google DoH',
                            dns_server: '8.8.8.8',
                            source: 'doh'
                        }, 200, corsHeaders);
                    } else {
                        return jsonResponse({
                            isp: 'Global (Google)',
                            status: 'BLOCKED',
                            ip: '',
                            details: 'No DNS record found',
                            dns_server: '8.8.8.8',
                            source: 'doh'
                        }, 200, corsHeaders);
                    }
                }
            } catch (dohError: any) {
                console.error('DoH error:', dohError);
                return jsonResponse({
                    isp: 'Global (Google)',
                    status: 'ERROR',
                    ip: '',
                    details: 'DoH query failed',
                    note: dohError.message
                }, 200, corsHeaders);
            }
        }

        // For ISP-specific checks, return cached result from D1 (primary) or KV (fallback)
        // Try D1 first
        try {
            const d1Result = await env.DB.prepare(
                "SELECT * FROM results WHERE hostname = ? AND isp_name = ? ORDER BY timestamp DESC LIMIT 1"
            ).bind(hostname, isp_name).first();

            if (d1Result) {
                let deviceInfo = {};
                try {
                    deviceInfo = JSON.parse(d1Result.device_info as string || '{}');
                } catch {
                    deviceInfo = {};
                }

                return jsonResponse({
                    isp: d1Result.isp_name as string || isp_name,
                    status: d1Result.status as string,
                    ip: d1Result.ip as string || '',
                    latency: d1Result.latency as number || 0,
                    details: `Cached result from mobile app (${new Date(d1Result.timestamp as number).toLocaleString()})`,
                    dns_server: '',
                    source: 'cached-mobile-app',
                    note: '⚠️ This is a cached result. For real-time ISP DNS checking, use Android app.'
                }, 200, corsHeaders);
            }
        } catch (d1Error) {
            console.warn('D1 cache read error, falling back to KV:', d1Error);
        }

        // Fallback to KV
        const cacheKey = `latest:${hostname}:${isp_name}`;
        const cachedData = await env.SENTINEL_DATA.get(cacheKey);

        if (cachedData) {
            const result = JSON.parse(cachedData);
            return jsonResponse({
                isp: result.isp_name || isp_name,
                status: result.status,
                ip: result.ip || '',
                latency: result.latency || 0,
                details: `Cached result from mobile app (${new Date(result.timestamp).toLocaleString()})`,
                dns_server: '',
                source: 'cached-mobile-app',
                note: '⚠️ This is a cached result. For real-time ISP DNS checking, use Android app.'
            }, 200, corsHeaders);
        }

        // No cache - return error suggesting mobile app
        return jsonResponse({
            isp: isp_name,
            status: 'ERROR',
            ip: '',
            details: 'No cached result available',
            note: '⚠️ Workers cannot perform UDP DNS queries to ISP DNS servers. Please use Android app to check DNS from ISP network, or wait for mobile app to sync results.'
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('DNS check error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// HTTP Content Check API - Check if domain shows blocked page (e.g., MDES warning page)
async function handleHTTPContentCheck(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { hostname, ip } = body;

        if (!hostname) {
            return jsonResponse({ error: 'Hostname required' }, 400, corsHeaders);
        }

        // Try to fetch HTTP content
        const url = `https://${hostname}`;
        try {
            const httpResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            const contentType = httpResponse.headers.get('content-type') || '';
            const isHTML = contentType.includes('text/html');

            if (isHTML) {
                const htmlContent = await httpResponse.text();

                // Check for MDES blocking page indicators
                const blockedIndicators = [
                    'ถูกระงับ',
                    'suspended',
                    'MINISTRY OF DIGITAL ECONOMY AND SOCIETY',
                    'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม',
                    'Computer-related Crime Act',
                    'Gambling Act',
                    'illegal acts',
                ];

                const isBlocked = blockedIndicators.some(indicator =>
                    htmlContent.toLowerCase().includes(indicator.toLowerCase())
                );

                if (isBlocked) {
                    return jsonResponse({
                        hostname,
                        status: 'BLOCKED',
                        ip: ip || '',
                        blocked: true,
                        reason: 'Shows MDES blocking page',
                        details: 'Domain resolves but shows government blocking warning page',
                        httpStatus: httpResponse.status,
                    }, 200, corsHeaders);
                }
            }

            // If we get here, domain is accessible (not blocked)
            return jsonResponse({
                hostname,
                status: 'ACTIVE',
                ip: ip || '',
                blocked: false,
                httpStatus: httpResponse.status,
            }, 200, corsHeaders);

        } catch (fetchError: any) {
            // If fetch fails, we can't determine if blocked or not
            console.error('HTTP fetch error:', fetchError);
            return jsonResponse({
                hostname,
                status: 'ERROR',
                ip: ip || '',
                blocked: null,
                error: fetchError.message,
                details: 'Could not fetch HTTP content to check for blocking page',
            }, 200, corsHeaders);
        }

    } catch (error: any) {
        console.error('HTTP content check error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Server-Sent Events (SSE) for real-time results updates
async function handleResultsStream(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    console.log('🔌 [SSE] New connection established');

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection message
            const send = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (error) {
                    console.error('SSE send error:', error);
                }
            };

            send(JSON.stringify({ type: 'connected', message: 'SSE connection established' }));
            console.log('✅ [SSE] Connection message sent');

            // Poll for new results every 1 second for real-time updates
            let lastCheckTime = Date.now();
            console.log(`🕐 [SSE] Starting poll from timestamp: ${lastCheckTime}`);

            // Use recursive setTimeout instead of setInterval (more reliable in Workers)
            const poll = async () => {
                try {
                    // Get latest results from D1 (only newer than last check)
                    const d1Query = env.DB.prepare(
                        "SELECT r1.* FROM results r1 INNER JOIN (SELECT hostname, isp_name, MAX(timestamp) as max_timestamp FROM results GROUP BY hostname, isp_name) r2 ON r1.hostname = r2.hostname AND r1.isp_name = r2.isp_name AND r1.timestamp = r2.max_timestamp WHERE r1.timestamp > ? ORDER BY r1.timestamp DESC"
                    ).bind(lastCheckTime);

                    const d1Result = await d1Query.all();
                    console.log(`🔍 [SSE] Poll check: found ${d1Result.results?.length || 0} new results (checking after ${lastCheckTime})`);

                    if (d1Result.results && d1Result.results.length > 0) {
                        const formattedResults = d1Result.results.map((row: any) => {
                            let deviceInfo = {};
                            try {
                                deviceInfo = JSON.parse(row.device_info || '{}');
                            } catch {
                                deviceInfo = {};
                            }

                            return {
                                hostname: row.hostname,
                                isp_name: row.isp_name,
                                status: row.status,
                                ip: row.ip,
                                latency: row.latency,
                                device_id: row.device_id,
                                device_info: deviceInfo,
                                timestamp: row.timestamp,
                                source: row.source || 'mobile-app',
                            };
                        });

                        // Update last check time
                        const newLastCheckTime = Math.max(...formattedResults.map((r: any) => r.timestamp));
                        console.log(`📤 [SSE] Sending ${formattedResults.length} new results to client (timestamps: ${formattedResults.map((r: any) => r.timestamp).join(', ')})`);
                        lastCheckTime = newLastCheckTime;

                        // Send new results to client immediately
                        send(JSON.stringify({
                            type: 'results',
                            results: formattedResults,
                            timestamp: Date.now(),
                            message: `New results from mobile app: ${formattedResults.length} updates`
                        }));
                        console.log(`✅ [SSE] Results sent successfully`);
                    }

                    // Send heartbeat every 30 seconds
                    if (Date.now() % 30000 < 1000) {
                        send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
                    }
                } catch (error: any) {
                    console.error('SSE poll error:', error);
                    send(JSON.stringify({ type: 'error', message: error.message }));
                }

                // Schedule next poll (recursive setTimeout)
                setTimeout(poll, 1000);
            };

            // Start polling
            poll();

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                console.log('🔌 [SSE] Connection closed by client');
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// Frontend Domains API - Get domains from D1 (primary) or KV (fallback)
async function handleGetFrontendDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first
        try {
            const result = await env.DB.prepare(
                "SELECT id, hostname, url, is_monitoring, telegram_chat_id FROM domains WHERE is_monitoring = 1 ORDER BY hostname"
            ).all();

            if (result.results && result.results.length > 0) {
                // Map D1 rows to Domain objects with all required fields
                // Frontend expects: id, url, hostname, lastCheck, results, isMonitoring, telegramChatId
                const domains = result.results.map((row: any) => {
                    // Create empty results object matching frontend's createEmptyResults() structure
                    // Frontend uses ISP enum: 'Global (Google)', 'AIS', 'True', 'DTAC', 'NT'
                    const emptyResults = {
                        'Global (Google)': { isp: 'Global (Google)', status: 'PENDING' },
                        'AIS': { isp: 'AIS', status: 'PENDING' },
                        'True': { isp: 'True', status: 'PENDING' },
                        'DTAC': { isp: 'DTAC', status: 'PENDING' },
                        'NT': { isp: 'NT', status: 'PENDING' },
                    };

                    return {
                        id: row.id || row.hostname, // Use hostname as ID if id is missing
                        hostname: row.hostname,
                        url: row.url || row.hostname,
                        lastCheck: null, // Will be populated by frontend when results are loaded
                        results: emptyResults, // Empty results matching frontend structure
                        isMonitoring: row.is_monitoring === 1,
                        telegramChatId: row.telegram_chat_id || undefined,
                    };
                });

                return jsonResponse({
                    success: true,
                    domains,
                }, 200, corsHeaders);
            }
        } catch (d1Error) {
            console.error('D1 error, falling back to KV:', d1Error);
        }

        // Fallback to KV
        const domainsKey = 'frontend:domains';
        const storedDomains = await env.SENTINEL_DATA.get(domainsKey);

        if (storedDomains) {
            return jsonResponse({
                success: true,
                domains: JSON.parse(storedDomains),
            }, 200, corsHeaders);
        }

        // Return empty array if no domains stored
        return jsonResponse({
            success: true,
            domains: [],
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Get frontend domains error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Frontend Domains API - Save domains to D1 (primary) and KV (backup)
async function handleSaveFrontendDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { domains } = body;

        if (!domains || !Array.isArray(domains)) {
            return jsonResponse(
                { error: 'Invalid request. domains array required' },
                400,
                corsHeaders
            );
        }

        // Extract hostnames from Domain objects if needed
        const hostnames = domains.map(domain => {
            if (typeof domain === 'string') {
                if (domain.startsWith('http://') || domain.startsWith('https://')) {
                    try {
                        const url = new URL(domain);
                        return url.hostname.replace(/^www\./, '').toLowerCase();
                    } catch {
                        return domain.replace(/^www\./, '').toLowerCase();
                    }
                }
                return domain.replace(/^www\./, '').toLowerCase();
            } else if (domain.hostname) {
                return domain.hostname.replace(/^www\./, '').toLowerCase();
            } else if (domain.url) {
                try {
                    const url = new URL(domain.url.startsWith('http') ? domain.url : `https://${domain.url}`);
                    return url.hostname.replace(/^www\./, '').toLowerCase();
                } catch {
                    return domain.url.replace(/^www\./, '').toLowerCase();
                }
            }
            return String(domain).replace(/^www\./, '').toLowerCase();
        });

        // Normalize: remove duplicates and sort
        const uniqueHostnames = [...new Set(hostnames)].sort();

        // Always save domains (even if hostnames are the same) because telegramChatId might have changed
        // INSERT OR REPLACE will update existing records, so it's safe to always save
        // This ensures telegramChatId changes are always persisted to D1

        // Get existing domains from D1 (needed to find domains to delete)
        const existingDomains = await getDomainsFromD1(env);

        // Save to D1 (primary storage)
        // First, delete domains that are not in the new list
        // Normalize both lists for comparison (lowercase, no www prefix)
        const normalizeHostname = (h: string) => h.toLowerCase().replace(/^www\./, '');
        const normalizedNew = uniqueHostnames.map(normalizeHostname);

        const domainsToDelete = existingDomains.filter(existing => {
            const normalizedExisting = normalizeHostname(existing);
            return !normalizedNew.includes(normalizedExisting);
        });

        if (domainsToDelete.length > 0) {
            console.log(`[handleSaveFrontendDomains] Deleting ${domainsToDelete.length} old domains:`, domainsToDelete);

            // Delete domains and their related results
            // For each hostname to delete, find all variations (with/without www, case variations)
            const deleteDomainBatch: any[] = [];
            const deleteResultsBatch: any[] = [];

            for (const hostnameToDelete of domainsToDelete) {
                const normalized = normalizeHostname(hostnameToDelete);

                // Find all hostnames in D1 that normalize to the same value
                // Get all domains and filter in JavaScript (more reliable than SQL REPLACE)
                const allDomains = await env.DB.prepare("SELECT hostname FROM domains").all();
                const matchingHostnames = (allDomains.results as any[])
                    .map(row => row.hostname)
                    .filter(h => normalizeHostname(h) === normalized);

                // Delete each matching domain and its results
                for (const actualHostname of matchingHostnames) {
                    deleteDomainBatch.push(env.DB.prepare("DELETE FROM domains WHERE hostname = ?").bind(actualHostname));
                    deleteResultsBatch.push(env.DB.prepare("DELETE FROM results WHERE hostname = ?").bind(actualHostname));
                }
            }

            if (deleteDomainBatch.length > 0) {
                await env.DB.batch(deleteDomainBatch);
                await env.DB.batch(deleteResultsBatch);
                console.log(`[handleSaveFrontendDomains] Deleted ${deleteDomainBatch.length} domain records and their results from D1`);
            }
        }

        // Then, insert or replace domains in the new list
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, is_monitoring, telegram_chat_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname => {
            const domainObj = domains.find((d: any) => {
                if (typeof d === 'string') {
                    const normalized = d.replace(/^www\./i, '').toLowerCase();
                    return normalized === hostname;
                }
                // Try to match by hostname first
                if (d.hostname) {
                    const normalized = d.hostname.replace(/^www\./i, '').toLowerCase();
                    if (normalized === hostname) return true;
                }
                // Try to match by url
                if (d.url) {
                    try {
                        const url = new URL(d.url.startsWith('http') ? d.url : `https://${d.url}`);
                        const normalized = url.hostname.replace(/^www\./i, '').toLowerCase();
                        if (normalized === hostname) return true;
                    } catch {
                        const normalized = d.url.replace(/^www\./i, '').toLowerCase();
                        if (normalized === hostname) return true;
                    }
                }
                return false;
            });

            const url = typeof domainObj === 'string' ? domainObj : (domainObj?.url || hostname);
            const telegramChatId = typeof domainObj === 'object' && domainObj !== null ? (domainObj.telegramChatId || null) : null;

            // Log for debugging
            if (telegramChatId) {
                console.log(`[handleSaveFrontendDomains] Saving telegramChatId for ${hostname}: ${telegramChatId}`);
            }

            return stmt.bind(hostname, hostname, url, 1, telegramChatId, Date.now());
        });
        await env.DB.batch(batch);

        // Also save to KV for backward compatibility
        try {
            await env.SENTINEL_DATA.put('frontend:domains', JSON.stringify(domains));
            await env.SENTINEL_DATA.put('domains:list', JSON.stringify(uniqueHostnames));
        } catch (kvError: any) {
            // KV error is not critical - D1 is primary
            console.warn('Failed to update KV (non-critical):', kvError);
        }

        console.log(`Frontend sync: Saved ${uniqueHostnames.length} domains to D1`);

        return jsonResponse({
            success: true,
            message: `Saved ${uniqueHostnames.length} domains`,
            saved: true,
            hostnames: uniqueHostnames,
        }, 200, corsHeaders);

    } catch (error: any) {
        // Check for KV limit error
        if (error.message && error.message.includes('limit exceeded')) {
            return jsonResponse({
                success: false,
                error: 'KV write limit exceeded for today. Please try again tomorrow.',
                message: 'Daily KV write limit reached',
            }, 429, corsHeaders);
        }

        console.error('Save frontend domains error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Frontend Settings API - Get settings from D1 (primary) or KV (fallback)
async function handleGetFrontendSettings(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first
        try {
            const result = await env.DB.prepare(
                "SELECT key, value FROM settings"
            ).all();

            if (result.results && result.results.length > 0) {
                const settings: any = {};
                result.results.forEach((row: any) => {
                    try {
                        settings[row.key] = JSON.parse(row.value);
                    } catch {
                        settings[row.key] = row.value;
                    }
                });

                // Ensure all required fields exist
                const defaultSettings = {
                    telegramBotToken: '',
                    telegramChatId: '',
                    checkInterval: 360,
                    backendUrl: '',
                    workersUrl: '',
                };

                return jsonResponse({
                    success: true,
                    settings: { ...defaultSettings, ...settings },
                }, 200, corsHeaders);
            }
        } catch (d1Error) {
            console.warn('D1 read error, falling back to KV:', d1Error);
        }

        // Fallback to KV
        const settingsKey = 'frontend:settings';
        const storedSettings = await env.SENTINEL_DATA.get(settingsKey);

        if (storedSettings) {
            return jsonResponse({
                success: true,
                settings: JSON.parse(storedSettings),
            }, 200, corsHeaders);
        }

        // Return default settings if none stored
        return jsonResponse({
            success: true,
            settings: {
                telegramBotToken: '',
                telegramChatId: '',
                checkInterval: 360,
                backendUrl: '',
                workersUrl: '',
            },
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Get frontend settings error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Frontend Settings API - Save settings to D1 (primary) and KV (backup)
async function handleSaveFrontendSettings(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') {
            return jsonResponse(
                { error: 'Invalid request. settings object required' },
                400,
                corsHeaders
            );
        }

        // Check if changed (compare with D1)
        let settingsChanged = true;
        try {
            const existingResult = await env.DB.prepare(
                "SELECT key, value FROM settings"
            ).all();

            if (existingResult.results && existingResult.results.length > 0) {
                const existingData: any = {};
                existingResult.results.forEach((row: any) => {
                    try {
                        existingData[row.key] = JSON.parse(row.value);
                    } catch {
                        existingData[row.key] = row.value;
                    }
                });

                settingsChanged = JSON.stringify(existingData) !== JSON.stringify(settings);
            }
        } catch (d1Error) {
            console.error('D1 check error:', d1Error);
        }

        if (!settingsChanged) {
            return jsonResponse({
                success: true,
                message: 'Settings unchanged, no update needed',
                saved: false,
            }, 200, corsHeaders);
        }

        // Save to D1 (primary storage)
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)");
        const batch = Object.entries(settings).map(([key, value]) =>
            stmt.bind(key, JSON.stringify(value), Date.now())
        );
        await env.DB.batch(batch);

        // Also save to KV for backward compatibility
        try {
            await env.SENTINEL_DATA.put('frontend:settings', JSON.stringify(settings));
        } catch (kvError: any) {
            // KV error is not critical - D1 is primary
            console.warn('Failed to update KV (non-critical):', kvError);
        }

        console.log('Settings saved to D1');

        return jsonResponse({
            success: true,
            message: 'Settings saved',
            saved: true,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Save frontend settings error:', error);
        return jsonResponse(
            { error: error.message || 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// Send Telegram alert table (รวมทุกโดเมน - ทั้งที่บล็อกและไม่บล็อก)
// ถ้าโดเมนเยอะเกิน Telegram limit (4096 chars) จะแยกส่งเป็นหลายข้อความ แต่ยังคงเป็นตารางรวม
async function sendTelegramAlertTable(
    botToken: string,
    chatId: string,
    allDomains: Array<{
        hostname: string;
        domainTelegramChatId: string | null;
        resultsByISP: Record<string, { status: string }>;
    }>
): Promise<boolean> {
    if (!botToken || !chatId || allDomains.length === 0) return false;

    console.log(`🔔 [Alert] sendTelegramAlertTable called with ${allDomains.length} domains for chat ${chatId}`);
    console.log(`🔔 [Alert] Domain names:`, allDomains.map(d => d.hostname).join(', '));

    // Helper function to find ISP status
    const findISPStatus = (results: Record<string, { status: string }>, keys: string[]): string | null => {
        for (const key of keys) {
            if (results[key]) {
                return results[key].status;
            }
            const matchedKey = Object.keys(results).find(k => k.toLowerCase() === key.toLowerCase());
            if (matchedKey) {
                return results[matchedKey].status;
            }
        }
        return null;
    };

    // Helper function to get status emoji (✅ = ACTIVE, ⛔ = BLOCKED)
    const getStatusEmoji = (status: string | null): string => {
        if (!status) return '⏳';
        if (status === 'BLOCKED') return '⛔';
        if (status === 'ACTIVE') return '✅';
        return '❓';
    };

    // สร้างตารางสำหรับโดเมนชุดหนึ่ง (รวมทุกโดเมน - ทั้งที่บล็อกและไม่บล็อก)
    const createTableForDomains = (domains: typeof allDomains, partNumber?: number, totalParts?: number): string => {
        let table = '<pre>\n';
        table += 'Domain               | A   | T   | D\n';
        table += '---------------------+-----+-----+-----\n';

        for (const domain of domains) {
            const aisStatus = findISPStatus(domain.resultsByISP, ['AIS', 'ais']);
            const dtacStatus = findISPStatus(domain.resultsByISP, ['DTAC', 'dtac']);

            const aisEmoji = getStatusEmoji(aisStatus);
            const trueEmoji = getStatusEmoji(dtacStatus);
            const dtacEmoji = getStatusEmoji(dtacStatus);

            // จำกัดความยาว hostname ให้ไม่เกิน 21 ตัวอักษร
            const displayHostname = domain.hostname.length > 21
                ? domain.hostname.substring(0, 18) + '...'
                : domain.hostname;

            table += displayHostname.padEnd(21) + `| ${aisEmoji}  | ${trueEmoji}  | ${dtacEmoji}\n`;
        }

        table += '</pre>';

        // สร้าง header
        let header = '🔔 <b>สถานะเว็บไซต์</b> 🔔';
        if (totalParts && totalParts > 1) {
            header += ` <i>(${partNumber}/${totalParts})</i>`;
        }

        // สร้าง footer
        const footer = '<i>A = AIS, T = True, D = DTAC</i>';

        return `${header}\n\n${table}\n\n${footer}`;
    };

    // Telegram message limit (4096 characters)
    const TELEGRAM_LIMIT = 4000; // ใช้ 4000 เพื่อความปลอดภัย (เหลือ buffer สำหรับ HTML tags)
    const headerFooterLength = 100; // ประมาณความยาว header + footer
    const rowLength = 50; // ประมาณความยาวแต่ละแถวในตาราง

    // ลองสร้างข้อความทั้งหมดก่อน (รวมทุกโดเมน - ทั้งที่บล็อกและไม่บล็อก)
    const fullMessage = createTableForDomains(allDomains);

    // ถ้าข้อความไม่เกิน limit ส่งเลย
    if (fullMessage.length <= TELEGRAM_LIMIT) {
        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: fullMessage,
                    parse_mode: 'HTML',
                }),
            });

            const data = await response.json();
            if (!data.ok) {
                console.error('Telegram API error:', data);
            }
            return data.ok;
        } catch (error) {
            console.error('Failed to send Telegram alert table', error);
            return false;
        }
    }

    // ถ้าเกิน limit แบ่งเป็นหลายข้อความ
    // คำนวณจำนวนโดเมนต่อข้อความ (ประมาณ)
    const domainsPerMessage = Math.floor((TELEGRAM_LIMIT - headerFooterLength) / rowLength);
    const totalParts = Math.ceil(allDomains.length / domainsPerMessage);

    console.log(`🔔 [Alert] Message too long (${fullMessage.length} chars), splitting into ${totalParts} parts (${domainsPerMessage} domains per part)`);

    // แบ่งโดเมนเป็นชุดๆ และส่งทีละชุด (รวมทุกโดเมน - ทั้งที่บล็อกและไม่บล็อก)
    let allSent = true;
    for (let i = 0; i < allDomains.length; i += domainsPerMessage) {
        const domainChunk = allDomains.slice(i, i + domainsPerMessage);
        const partNumber = Math.floor(i / domainsPerMessage) + 1;
        const message = createTableForDomains(domainChunk, partNumber, totalParts);

        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                }),
            });

            const data = await response.json();
            if (!data.ok) {
                console.error(`Telegram API error for part ${partNumber}:`, data);
                allSent = false;
            } else {
                console.log(`🔔 [Alert] Sent part ${partNumber}/${totalParts} to ${chatId} (${domainChunk.length} domains)`);
            }

            // รอ 100ms ระหว่างข้อความเพื่อไม่ให้ Telegram rate limit
            if (i + domainsPerMessage < allDomains.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Failed to send Telegram alert table part ${partNumber}:`, error);
            allSent = false;
        }
    }

    return allSent;
}

// Check and send alerts for all domains (both blocked and active)
async function checkAndSendAlerts(env: Env): Promise<void> {
    try {
        console.log('🔔 [Alert] Checking for all domains and sending alerts (both blocked and active)...');

        // Get settings from D1
        const settingsResult = await env.DB.prepare(
            "SELECT key, value FROM settings"
        ).all();

        const settings: any = {};
        if (settingsResult.results) {
            settingsResult.results.forEach((row: any) => {
                try {
                    settings[row.key] = JSON.parse(row.value);
                } catch {
                    settings[row.key] = row.value;
                }
            });
        }

        const telegramBotToken = settings.telegramBotToken || '';
        const defaultTelegramChatId = settings.telegramChatId || '';
        // ใช้ checkInterval จาก settings เป็น alert interval (หน่วย: นาที)
        // ถ้าไม่มีการตั้งค่า ให้ใช้ default 360 นาที (6 ชั่วโมง)
        const alertInterval = settings.alertInterval || settings.checkInterval || 360;
        const alertIntervalMs = alertInterval * 60 * 1000; // แปลงเป็น milliseconds

        console.log('🔔 [Alert] Settings check:', {
            hasBotToken: !!telegramBotToken,
            hasChatId: !!defaultTelegramChatId,
            botTokenLength: telegramBotToken.length,
            chatIdLength: defaultTelegramChatId.length,
            alertIntervalMinutes: alertInterval,
            alertIntervalMs: alertIntervalMs,
            checkInterval: settings.checkInterval,
            alertIntervalSetting: settings.alertInterval
        });

        if (!telegramBotToken) {
            console.log('🔔 [Alert] No Telegram bot token configured, skipping alerts');
            return;
        }

        // Get all monitoring domains from D1
        const domainsResult = await env.DB.prepare(
            "SELECT id, hostname, telegram_chat_id FROM domains WHERE is_monitoring = 1"
        ).all();

        if (!domainsResult.results || domainsResult.results.length === 0) {
            console.log('🔔 [Alert] No domains to monitor');
            return;
        }

        // รวบรวมข้อมูลทุกโดเมน (ไม่ใช่แค่ที่ถูกบล็อก)
        const allDomains: Array<{
            hostname: string;
            domainTelegramChatId: string | null;
            resultsByISP: Record<string, { status: string }>;
        }> = [];

        // For each domain, get latest results
        for (const domainRow of domainsResult.results) {
            const hostname = domainRow.hostname;
            const domainTelegramChatId = domainRow.telegram_chat_id || null;

            // Get latest results for this domain (latest result per ISP)
            const resultsQuery = env.DB.prepare(`
                SELECT r1.* FROM results r1 
                INNER JOIN (
                    SELECT hostname, isp_name, MAX(timestamp) as max_timestamp 
                    FROM results 
                    WHERE hostname = ? 
                    GROUP BY hostname, isp_name
                ) r2 ON r1.hostname = r2.hostname 
                    AND r1.isp_name = r2.isp_name 
                    AND r1.timestamp = r2.max_timestamp
            `).bind(hostname);

            const resultsData = await resultsQuery.all();

            console.log(`🔔 [Alert] Domain ${hostname}: Found ${resultsData.results?.length || 0} results in D1`);

            // Group results by ISP name
            const resultsByISP: Record<string, { status: string }> = {};

            if (resultsData.results && resultsData.results.length > 0) {
                resultsData.results.forEach((row: any) => {
                    const ispName = row.isp_name;
                    const status = row.status;

                    // Store results with original ISP name from D1
                    // If we already have this ISP name, prefer BLOCKED status
                    if (resultsByISP[ispName]) {
                        if (status === 'BLOCKED') {
                            resultsByISP[ispName] = { status };
                        }
                    } else {
                        resultsByISP[ispName] = { status };
                    }
                });
            } else {
                // ถ้ายังไม่มีผลลัพธ์ ให้ใช้ PENDING
                resultsByISP['AIS'] = { status: 'PENDING' };
                resultsByISP['True'] = { status: 'PENDING' };
                resultsByISP['DTAC'] = { status: 'PENDING' };
            }

            console.log(`🔔 [Alert] Domain ${hostname} results:`, JSON.stringify(resultsByISP));

            // เพิ่มทุกโดเมน (ไม่ใช่แค่ที่ถูกบล็อก)
            allDomains.push({
                hostname,
                domainTelegramChatId,
                resultsByISP
            });
        }

        // ถ้าไม่มีโดเมนเลย ไม่ต้องส่งแจ้งเตือน
        if (allDomains.length === 0) {
            console.log('🔔 [Alert] No domains found');
            return;
        }

        // ตรวจสอบว่าเวลาผ่านไปตาม interval แล้วหรือยัง
        const now = Date.now();

        // จัดกลุ่มโดเมนตาม chat ID ที่จะส่ง
        // 1. โดเมนที่มี custom chat ID → ส่งไปห้องนั้น (เฉพาะโดเมนนั้น) และส่งไป default chat (สรุปทั้งหมด)
        // 2. โดเมนที่ไม่มี custom chat ID → ส่งไป default chat เท่านั้น
        // 3. default chat จะได้รับทุกโดเมน (สรุปทั้งหมด)
        const domainsByChatId = new Map<string, Array<{
            hostname: string;
            domainTelegramChatId: string | null;
            resultsByISP: Record<string, { status: string }>;
        }>>();

        // เพิ่มทุกโดเมนไป default chat (สรุปทั้งหมด)
        if (defaultTelegramChatId) {
            domainsByChatId.set(defaultTelegramChatId, [...allDomains]);
            console.log(`🔔 [Alert] Added ${allDomains.length} domains to default chat (${defaultTelegramChatId}) for summary`);
        }

        // เพิ่มโดเมนที่มี custom chat ID ไปห้องนั้น (เฉพาะโดเมนนั้น)
        for (const domain of allDomains) {
            if (domain.domainTelegramChatId) {
                if (!domainsByChatId.has(domain.domainTelegramChatId)) {
                    domainsByChatId.set(domain.domainTelegramChatId, []);
                }
                domainsByChatId.get(domain.domainTelegramChatId)!.push(domain);
                console.log(`🔔 [Alert] Added domain ${domain.hostname} to custom chat (${domain.domainTelegramChatId})`);
            }
        }

        if (domainsByChatId.size === 0) {
            console.log('🔔 [Alert] No Telegram chat IDs configured, skipping alerts');
            return;
        }

        // ส่งตารางให้แต่ละ chat ID
        const sendPromises: Promise<boolean>[] = [];

        for (const [chatId, domainsForThisChat] of domainsByChatId.entries()) {
            // ตรวจสอบ last alert sent timestamp สำหรับ chat นี้
            const lastAlertKey = `last_alert:chat:${chatId}`;
            const lastAlertResult = await env.DB.prepare(
                "SELECT value, updated_at FROM settings WHERE key = ?"
            ).bind(lastAlertKey).first();

            let shouldSend = true;
            let skipReason = '';

            if (lastAlertResult) {
                try {
                    const lastAlertData = JSON.parse(lastAlertResult.value as string);
                    const lastAlertTime = lastAlertData.timestamp || lastAlertResult.updated_at;
                    const timeSinceLastAlert = now - lastAlertTime;
                    const minutesSinceLastAlert = Math.floor(timeSinceLastAlert / 1000 / 60);
                    const minutesRemaining = Math.ceil((alertIntervalMs - timeSinceLastAlert) / 1000 / 60);

                    console.log(`🔔 [Alert] Checking interval for ${chatId}:`, {
                        lastAlertTime: new Date(lastAlertTime).toISOString(),
                        now: new Date(now).toISOString(),
                        timeSinceLastAlert: timeSinceLastAlert,
                        minutesSinceLastAlert: minutesSinceLastAlert,
                        alertIntervalMs: alertIntervalMs,
                        alertIntervalMinutes: alertInterval,
                        minutesRemaining: minutesRemaining
                    });

                    if (timeSinceLastAlert < alertIntervalMs) {
                        skipReason = `last sent ${minutesSinceLastAlert} minutes ago (wait ${minutesRemaining} more minutes, interval: ${alertInterval} minutes)`;
                        console.log(`🔔 [Alert] ⏸️ SKIPPING alert to ${chatId} - ${skipReason}`);
                        shouldSend = false;
                    } else {
                        console.log(`🔔 [Alert] ✅ Interval passed for ${chatId} - ${minutesSinceLastAlert} minutes since last alert (interval: ${alertInterval} minutes)`);
                    }
                } catch (error) {
                    console.warn(`🔔 [Alert] Error parsing last alert data for ${chatId}:`, error);
                    console.log(`🔔 [Alert] ⚠️ Will send alert anyway (parse error)`);
                    // ถ้า parse ไม่ได้ ให้ส่งเลย (safety)
                }
            } else {
                console.log(`🔔 [Alert] ✅ No previous alert found for ${chatId} - will send first alert`);
                // First alert - send immediately
                shouldSend = true;
            }

            if (shouldSend) {
                console.log(`🔔 [Alert] 📤 SENDING alert table to ${chatId} (${domainsForThisChat.length} domains, interval: ${alertInterval} minutes)`);
                console.log(`🔔 [Alert] Domain list for ${chatId}:`, domainsForThisChat.map(d => d.hostname).join(', '));
                sendPromises.push(
                    sendTelegramAlertTable(telegramBotToken, chatId, domainsForThisChat)
                        .then(async (sent) => {
                            if (sent) {
                                console.log(`🔔 [Alert] ✅ Telegram alert table sent successfully to ${chatId}`);
                                // บันทึก timestamp ของการส่งแจ้งเตือน
                                const alertData = { timestamp: now, chatId, domainCount: domainsForThisChat.length };
                                try {
                                    await env.DB.prepare(
                                        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)"
                                    ).bind(
                                        lastAlertKey,
                                        JSON.stringify(alertData),
                                        now
                                    ).run();
                                    console.log(`🔔 [Alert] ✅ Saved last alert timestamp for ${chatId}: ${new Date(now).toISOString()}`);
                                } catch (saveError) {
                                    console.error(`🔔 [Alert] ❌ Failed to save last alert timestamp for ${chatId}:`, saveError);
                                }
                            } else {
                                console.error(`🔔 [Alert] ❌ Failed to send Telegram alert table to ${chatId}`);
                            }
                            return sent;
                        })
                        .catch(error => {
                            console.error(`🔔 [Alert] ❌ Error sending Telegram alert table to ${chatId}:`, error);
                            return false;
                        })
                );
            } else {
                console.log(`🔔 [Alert] ⏸️ SKIPPED sending to ${chatId} - ${skipReason || 'interval not passed'}`);
            }
        }

        if (sendPromises.length > 0) {
            await Promise.all(sendPromises);
        }

        console.log('🔔 [Alert] Finished checking and sending alerts');
    } catch (error) {
        console.error('🔔 [Alert] Error in checkAndSendAlerts:', error);
    }
}

// Helper function
function jsonResponse(
    data: any,
    status: number = 200,
    corsHeaders: Record<string, string> = {}
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

