import { NextResponse } from 'next/server';
import dgram from 'dgram';
import * as dnsPacket from 'dns-packet';

// Use Node.js runtime (not Edge) to support UDP DNS queries
export const runtime = 'nodejs';

// ISP DNS Servers (Updated with correct IPs)
const ISP_DNS_SERVERS: Record<string, string> = {
  'Global (Google)': '8.8.8.8',
  'AIS': '49.0.64.179',        // AIS Fibre Primary DNS
  'TRUE': '203.144.207.29',    // True Primary DNS
  'DTAC': '203.146.237.237',   // DTAC Primary DNS
  'NT': '61.91.79.20',         // NT Primary DNS
};

// Query DNS server via UDP
async function queryDNSServer(hostname: string, dnsServer: string, timeout: number = 10000): Promise<{ status: string; ip: string; latency: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Create DNS query packet
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{
        type: 'A',
        name: hostname
      }]
    });

    // Create UDP socket
    const socket = dgram.createSocket('udp4');
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          socket.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    };

    // Set timeout (increased to 10 seconds for ISP DNS servers)
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`DNS query timeout after ${timeout}ms to ${dnsServer}`));
    }, timeout);

    // Handle response
    socket.on('message', (msg) => {
      cleanup();
      clearTimeout(timeoutId);
      
      try {
        const response = dnsPacket.decode(msg);
        const latency = Date.now() - startTime;

        // Check response code (0 = NOERROR)
        if (response.rcode !== 'NOERROR') {
          resolve({ status: 'BLOCKED', ip: '', latency });
          return;
        }

        // Find A record in answers
        const aRecord = response.answers?.find((ans: any) => ans.type === 'A');
        
        if (aRecord && aRecord.data) {
          resolve({ 
            status: 'ACTIVE', 
            ip: aRecord.data, 
            latency 
          });
        } else {
          resolve({ status: 'BLOCKED', ip: '', latency });
        }
      } catch (error) {
        reject(error);
      }
    });

    // Handle errors
    socket.on('error', (err) => {
      cleanup();
      clearTimeout(timeoutId);
      reject(err);
    });

    // Send query
    socket.send(query, 53, dnsServer, (err) => {
      if (err) {
        cleanup();
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

export async function POST(req: Request) {
  try {
    const { hostname, isp_name } = await req.json();

    if (!hostname) {
      return NextResponse.json({ error: 'Hostname required' }, { status: 400 });
    }

    // Check if DNS Resolver Service URL is configured
    const resolverServiceUrl = process.env.DNS_RESOLVER_SERVICE_URL;
    
    // If resolver service is configured, use it for accurate checking
    if (resolverServiceUrl && isp_name !== 'Global (Google)') {
      try {
        const resolverResponse = await fetch(`${resolverServiceUrl}/api/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostname, isp_name }),
          signal: AbortSignal.timeout(15000)
        });

        if (resolverResponse.ok) {
          const resolverData = await resolverResponse.json();
          return NextResponse.json({
            isp: resolverData.isp || isp_name,
            status: resolverData.status,
            ip: resolverData.ip || '',
            latency: resolverData.latency,
            details: resolverData.details || `Queried via DNS Resolver Service`,
            dns_server: resolverData.dns_server,
            source: resolverData.source || 'resolver-service'
          });
        }
      } catch (resolverError: any) {
        console.warn('DNS Resolver Service unavailable, falling back to local UDP:', resolverError.message);
        // Fall through to local UDP check
      }
    }

    // Fallback: Local UDP check (less accurate from external IP)
    const dnsServer = ISP_DNS_SERVERS[isp_name] || ISP_DNS_SERVERS['Global (Google)'];

    try {
      // Query DNS server directly via UDP
      // Use longer timeout for ISP DNS servers (they may be slower)
      const timeout = isp_name === 'Global (Google)' ? 5000 : 10000;
      const result = await queryDNSServer(hostname, dnsServer, timeout);

      return NextResponse.json({
        isp: isp_name,
        status: result.status,
        ip: result.ip,
        latency: result.latency,
        details: `Queried ${dnsServer} directly (may not be accurate from external IP)`,
        dns_server: dnsServer,
        source: 'udp-external',
        note: isp_name !== 'Global (Google)' ? '⚠️ Checking from external IP - may not reflect actual ISP blocking. Use DNS Resolver Service for accurate results.' : undefined
      });

    } catch (error: any) {
      // If timeout, it might mean the domain is blocked by ISP
      // ISP DNS servers often timeout or don't respond when domain is blocked
      const isTimeout = error.message.includes('timeout');
      
      if (isTimeout && isp_name !== 'Global (Google)') {
        // Railway DOES support UDP sockets, but checking from external IP has limitations
        // 
        // When ISP DNS server times out, it could mean:
        // 1. Domain is blocked (ISP DNS doesn't respond) - LIKELY
        // 2. ISP DNS blocks external queries (firewall/restriction) - POSSIBLE for DTAC, NT
        // 
        // Problem: HTTP check from external IP is NOT accurate
        // Domain may be accessible from external IP but blocked on ISP network
        // 
        // Solution: Use a combination approach
        // - If TRUE DNS works (responds), use it as reference
        // - If multiple ISPs timeout, more likely DNS server restriction
        // - If only one ISP times out, more likely actually blocked
        console.warn(`DNS query to ${dnsServer} (${isp_name}) timed out`);
        
        // For now, treat timeout as BLOCKED
        // This is more accurate than HTTP fallback which gives false positives
        // For 100% accuracy, user should use VPS on ISP network
        return NextResponse.json({
          isp: isp_name,
          status: 'BLOCKED',
          ip: '',
          details: `DNS query timeout to ${dnsServer} - domain likely blocked by ${isp_name}`,
          dns_server: dnsServer,
          source: 'udp-timeout',
          note: `⚠️ ISP DNS server (${isp_name}) did not respond. This usually indicates blocking, but may also be due to DNS server restricting external queries. For 100% accuracy, deploy DNS Resolver Service on VPS in Thailand.`
        });
      }
      
      // Other errors (network issues, etc.)
      console.error(`UDP DNS query to ${dnsServer} failed:`, error.message);
      
      return NextResponse.json({
        isp: isp_name,
        status: 'ERROR',
        ip: '',
        details: `UDP query to ${dnsServer} failed: ${error.message}`,
        dns_server: dnsServer,
        source: 'error',
        note: 'UDP query failed - this may indicate network/firewall issues or the domain is blocked'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('DNS Check Error:', error);
    return NextResponse.json({
      status: 'ERROR',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}