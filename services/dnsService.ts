import { ISP, Status, ISPResult } from '../types';
import { ISP_DNS_SERVERS } from '../constants';

// Helper to extract hostname
export const getHostname = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
};

// Check via API (Cloudflare Workers or local)
const checkViaBackend = async (
  isp: ISP, 
  hostname: string, 
  backendUrl: string
): Promise<ISPResult> => {
  try {
    const startTime = performance.now();
    // Use Workers URL if provided, otherwise use backendUrl, otherwise use relative path
    const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL;
    const baseUrl = workersUrl || backendUrl || '';
    const apiUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/check` : '/api/check';
    
    // For Cloudflare Pages (static export), API routes don't work
    // Must use Workers API or external backend
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hostname: hostname,
            isp_name: isp
        })
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const endTime = performance.now();

    return {
        isp,
        status: data.status as Status,
        ip: data.ip,
        latency: data.latency || Math.round(endTime - startTime),
        details: data.details || data.note || 'DNS Check'
    };

  } catch (error) {
    console.error(`Error checking ${isp}:`, error);
    return {
        isp,
        status: Status.ERROR,
        details: 'API Error'
    };
  }
};

export const checkDomainHealth = async (
  hostname: string, 
  backendUrl: string = ''
): Promise<Record<ISP, ISPResult>> => {
  
  // We trigger all checks against the Edge API. 
  // The API handles the actual resolution.
  const checkPromises = Object.keys(ISP_DNS_SERVERS).map((key) => {
     return checkViaBackend(key as ISP, hostname, backendUrl);
  });

  const resultsArray = await Promise.all(checkPromises);

  // Construct the result object
  const results: Record<string, ISPResult> = {};
  resultsArray.forEach(res => {
      results[res.isp] = res;
  });

  return results as Record<ISP, ISPResult>;
};

export const generateDigCommand = (hostname: string, isp: ISP): string => {
    const server = ISP_DNS_SERVERS[isp];
    return `dig @${server} ${hostname} +short`;
};