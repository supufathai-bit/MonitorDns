// Cloudflare Workers API for Sentinel DNS Monitor
// This handles API requests since Cloudflare Pages is static

export interface Env {
    // @ts-ignore - KVNamespace is provided by Cloudflare Workers runtime
    SENTINEL_DATA: KVNamespace;
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

        // Store results in KV (optimized to reduce KV writes)
        const timestamp = Date.now();

        try {
            // Store latest result per domain+ISP (only update if changed or expired)
            // Batch all writes together to reduce operations
            const writePromises: Promise<void>[] = [];

            for (const result of results) {
                const latestKey = `latest:${result.hostname}:${result.isp_name}`;

                // Check if we need to update (only if different or missing)
                const existingData = await env.SENTINEL_DATA.get(latestKey);
                let shouldUpdate = true;

                if (existingData) {
                    try {
                        const existing = JSON.parse(existingData);
                        // Only update if status changed or timestamp is much older (5 minutes)
                        if (existing.status === result.status &&
                            existing.ip === result.ip &&
                            (timestamp - existing.timestamp) < 300000) {
                            shouldUpdate = false;
                        }
                    } catch {
                        // If parse fails, update anyway
                    }
                }

                if (shouldUpdate) {
                    writePromises.push(
                        env.SENTINEL_DATA.put(latestKey, JSON.stringify({
                            ...result,
                            device_id,
                            device_info,
                            timestamp,
                            source: 'mobile-app',
                        }), {
                            expirationTtl: 86400 * 7, // 7 days
                        }).catch(err => {
                            console.error(`Failed to write ${latestKey}:`, err);
                            throw err;
                        })
                    );
                }
            }

            // Store device info (only if changed)
            const deviceKey = `device:${device_id}`;
            const existingDevice = await env.SENTINEL_DATA.get(deviceKey);
            let shouldUpdateDevice = true;

            if (existingDevice) {
                try {
                    const existing = JSON.parse(existingDevice);
                    // Only update if device info changed or last sync was more than 1 hour ago
                    if (existing.device_info?.isp === device_info.isp &&
                        existing.device_info?.network_type === device_info.network_type &&
                        (timestamp - (existing.last_sync || 0)) < 3600000) {
                        shouldUpdateDevice = false;
                    }
                } catch {
                    // If parse fails, update anyway
                }
            }

            if (shouldUpdateDevice) {
                writePromises.push(
                    env.SENTINEL_DATA.put(deviceKey, JSON.stringify({
                        device_id,
                        device_info,
                        last_sync: timestamp,
                    })).catch(err => {
                        console.error(`Failed to write ${deviceKey}:`, err);
                        throw err;
                    })
                );
            }

            // Clear trigger flag after sync (mobile app has checked)
            const triggerKey = 'trigger:check';
            writePromises.push(
                env.SENTINEL_DATA.delete(triggerKey).catch(err => {
                    console.error(`Failed to delete ${triggerKey}:`, err);
                    // Don't throw - deletion failure is not critical
                })
            );

            // Execute all writes in parallel
            await Promise.all(writePromises);

        } catch (kvError: any) {
            // Check if it's a KV limit error
            if (kvError.message && kvError.message.includes('limit exceeded')) {
                console.error('KV limit exceeded:', kvError);
                return jsonResponse({
                    success: false,
                    error: 'KV write limit exceeded for today. Please try again tomorrow or upgrade your Cloudflare plan.',
                    message: 'Daily KV write limit reached',
                }, 429, corsHeaders); // 429 Too Many Requests
            }
            throw kvError; // Re-throw other errors
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

// Get domains to check
async function handleGetDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Get domains from KV or use defaults
        const domainsKey = 'domains:list';
        const storedDomains = await env.SENTINEL_DATA.get(domainsKey);

        let domains: string[];
        if (storedDomains) {
            domains = JSON.parse(storedDomains);
        } else {
            // Default domains (fallback only)
            domains = [
                'ufathai.win',
                'ufathai.com',
                'www.zec777.com',
                'google.com',
            ];
        }

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

        // Extract hostnames from URLs if needed
        const hostnames = domains.map(domain => {
            // If it's a URL, extract hostname
            if (domain.startsWith('http://') || domain.startsWith('https://')) {
                try {
                    const url = new URL(domain);
                    return url.hostname;
                } catch {
                    return domain;
                }
            }
            // If it's already a hostname, use as is
            return domain;
        });

        // Store in KV (only if changed)
        const domainsKey = 'domains:list';
        const existingDomains = await env.SENTINEL_DATA.get(domainsKey);
        let shouldUpdate = true;

        if (existingDomains) {
            try {
                const existing = JSON.parse(existingDomains);
                // Compare arrays (order-independent)
                const existingSorted = [...existing].sort().join(',');
                const newSorted = [...hostnames].sort().join(',');
                if (existingSorted === newSorted) {
                    shouldUpdate = false;
                }
            } catch {
                // If parse fails, update anyway
            }
        }

        if (shouldUpdate) {
            await env.SENTINEL_DATA.put(domainsKey, JSON.stringify(hostnames)).catch((kvError: any) => {
                // Check if it's a KV limit error
                if (kvError.message && kvError.message.includes('limit exceeded')) {
                    throw new Error('KV put() limit exceeded for the day.');
                }
                throw kvError;
            });
        }

        return jsonResponse({
            success: true,
            message: `Updated ${hostnames.length} domains`,
            domains: hostnames,
            updated: shouldUpdate,
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
        // Check if trigger already exists (avoid unnecessary writes)
        const triggerKey = 'trigger:check';
        const existingTrigger = await env.SENTINEL_DATA.get(triggerKey);

        if (existingTrigger) {
            try {
                const existing = JSON.parse(existingTrigger);
                // If trigger was set less than 1 minute ago, don't update
                if (Date.now() - existing.timestamp < 60000) {
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

        // Set trigger flag in KV (expires in 5 minutes)
        const timestamp = Date.now();

        await env.SENTINEL_DATA.put(triggerKey, JSON.stringify({
            triggered: true,
            timestamp,
            requested_by: 'frontend',
        }), {
            expirationTtl: 300, // 5 minutes
        }).catch((kvError: any) => {
            // Check if it's a KV limit error
            if (kvError.message && kvError.message.includes('limit exceeded')) {
                throw new Error('KV put() limit exceeded for the day.');
            }
            throw kvError;
        });

        return jsonResponse({
            success: true,
            message: 'Check triggered. Mobile app will check DNS soon.',
            timestamp,
        }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Trigger check error:', error);

        // Return specific error message for KV limit
        if (error.message && error.message.includes('limit exceeded')) {
            return jsonResponse({
                success: false,
                error: 'KV put() limit exceeded for the day.',
                message: 'Daily KV write limit reached. Please try again tomorrow or upgrade your Cloudflare plan.',
            }, 429, corsHeaders); // 429 Too Many Requests
        }

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

        // Get all latest results
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

        // For ISP-specific checks, return cached result from mobile app
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

