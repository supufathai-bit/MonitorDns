// Cloudflare Workers API for Sentinel DNS Monitor
// This handles API requests since Cloudflare Pages is static

export interface Env {
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

    // DNS Check API (limited - Workers can't do UDP, but can return cached results)
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

    // Store results in KV
    const timestamp = Date.now();
    const syncKey = `sync:${device_id}:${timestamp}`;
    
    await env.SENTINEL_DATA.put(syncKey, JSON.stringify({
      device_id,
      device_info,
      results,
      timestamp,
    }));

    // Store latest result per domain+ISP
    for (const result of results) {
      const latestKey = `latest:${result.hostname}:${result.isp_name}`;
      await env.SENTINEL_DATA.put(latestKey, JSON.stringify({
        ...result,
        device_id,
        device_info,
        timestamp,
        source: 'mobile-app',
      }), {
        expirationTtl: 86400 * 7, // 7 days
      });
    }

    // Store device info
    const deviceKey = `device:${device_id}`;
    await env.SENTINEL_DATA.put(deviceKey, JSON.stringify({
      device_id,
      device_info,
      last_sync: timestamp,
    }));

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
      // Default domains
      domains = [
        'ufathai.win',
        'ufathai.com',
        'www.zec777.com',
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

