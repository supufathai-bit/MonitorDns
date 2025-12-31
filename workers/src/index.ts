// Cloudflare Workers API for Sentinel DNS Monitor
// This handles API requests since Cloudflare Pages is static

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
        const result = await env.DB.prepare(
            "SELECT hostname FROM domains WHERE is_monitoring = 1 ORDER BY hostname"
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
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname =>
            stmt.bind(hostname, hostname, hostname, Date.now())
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

        // Check if changed (compare with D1)
        const existingDomains = await getDomainsFromD1(env);
        const existingSorted = existingDomains.map(h => h.toLowerCase()).sort();
        const newSorted = uniqueHostnames.map(h => h.toLowerCase()).sort();
        const domainsChanged = JSON.stringify(existingSorted) !== JSON.stringify(newSorted);

        if (!domainsChanged) {
            return jsonResponse({
                success: true,
                message: 'Domains unchanged, no update needed',
                saved: false,
            }, 200, corsHeaders);
        }

        // Save to D1 (primary storage)
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, is_monitoring, telegram_chat_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname => {
            const domainObj = domains.find((d: any) => {
                const h = typeof d === 'string' ? d : (d.hostname || d.url || String(d));
                return h.replace(/^www\./i, '').toLowerCase() === hostname;
            });
            const url = typeof domainObj === 'string' ? domainObj : (domainObj?.url || hostname);
            const telegramChatId = typeof domainObj === 'object' ? (domainObj.telegramChatId || null) : null;
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

