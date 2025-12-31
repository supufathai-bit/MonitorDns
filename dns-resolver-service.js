#!/usr/bin/env node
/**
 * DNS Resolver Service
 * Deploy this on VPS in Thailand/Singapore for accurate ISP DNS checking
 * 
 * Usage: node dns-resolver-service.js
 * Port: 3001 (default)
 */

const http = require('http');
const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const PORT = process.env.PORT || 3001;

// ISP DNS Servers
const ISP_DNS_SERVERS = {
  'Global (Google)': '8.8.8.8',
  'AIS': '49.0.64.179',
  'TRUE': '203.144.207.29',
  'DTAC': '203.146.237.237',
  'NT': '61.91.79.20',
};

// Query DNS server via UDP
function queryDNSServer(hostname, dnsServer, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: 'A', name: hostname }]
    });

    const socket = dgram.createSocket('udp4');
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          socket.close();
        } catch (e) {}
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`DNS query timeout after ${timeout}ms to ${dnsServer}`));
    }, timeout);

    socket.on('message', (msg) => {
      cleanup();
      clearTimeout(timeoutId);
      
      try {
        const response = dnsPacket.decode(msg);
        const latency = Date.now() - startTime;

        if (response.rcode !== 'NOERROR') {
          resolve({ status: 'BLOCKED', ip: '', latency });
          return;
        }

        const aRecord = response.answers?.find((ans) => ans.type === 'A');
        
        if (aRecord && aRecord.data) {
          resolve({ status: 'ACTIVE', ip: aRecord.data, latency });
        } else {
          resolve({ status: 'BLOCKED', ip: '', latency });
        }
      } catch (error) {
        reject(error);
      }
    });

    socket.on('error', (err) => {
      cleanup();
      clearTimeout(timeoutId);
      reject(err);
    });

    socket.send(query, 53, dnsServer, (err) => {
      if (err) {
        cleanup();
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/check') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  req.on('end', async () => {
    try {
      const { hostname, isp_name } = JSON.parse(body);

      if (!hostname) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Hostname required' }));
        return;
      }

      const dnsServer = ISP_DNS_SERVERS[isp_name] || ISP_DNS_SERVERS['Global (Google)'];

      try {
        const result = await queryDNSServer(hostname, dnsServer, 10000);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isp: isp_name,
          status: result.status,
          ip: result.ip,
          latency: result.latency,
          details: `Queried ${dnsServer} directly from VPS`,
          dns_server: dnsServer,
          source: 'vps-udp'
        }));

      } catch (error) {
        const isTimeout = error.message.includes('timeout');
        
        if (isTimeout && isp_name !== 'Global (Google)') {
          // Timeout from ISP DNS = likely blocked
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'BLOCKED',
            ip: '',
            details: `DNS query timeout to ${dnsServer} - domain likely blocked`,
            dns_server: dnsServer,
            source: 'vps-timeout'
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'ERROR',
            error: error.message
          }));
        }
      }

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DNS Resolver Service running on port ${PORT}`);
  console.log(`📍 ISP DNS Servers configured:`);
  Object.entries(ISP_DNS_SERVERS).forEach(([isp, dns]) => {
    console.log(`   ${isp}: ${dns}`);
  });
  console.log(`\n🌐 API endpoint: http://0.0.0.0:${PORT}/api/check`);
});

/**
 * DNS Resolver Service
 * Deploy this on VPS in Thailand/Singapore for accurate ISP DNS checking
 * 
 * Usage: node dns-resolver-service.js
 * Port: 3001 (default)
 */

const http = require('http');
const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const PORT = process.env.PORT || 3001;

// ISP DNS Servers
const ISP_DNS_SERVERS = {
  'Global (Google)': '8.8.8.8',
  'AIS': '49.0.64.179',
  'TRUE': '203.144.207.29',
  'DTAC': '203.146.237.237',
  'NT': '61.91.79.20',
};

// Query DNS server via UDP
function queryDNSServer(hostname, dnsServer, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: 'A', name: hostname }]
    });

    const socket = dgram.createSocket('udp4');
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          socket.close();
        } catch (e) {}
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`DNS query timeout after ${timeout}ms to ${dnsServer}`));
    }, timeout);

    socket.on('message', (msg) => {
      cleanup();
      clearTimeout(timeoutId);
      
      try {
        const response = dnsPacket.decode(msg);
        const latency = Date.now() - startTime;

        if (response.rcode !== 'NOERROR') {
          resolve({ status: 'BLOCKED', ip: '', latency });
          return;
        }

        const aRecord = response.answers?.find((ans) => ans.type === 'A');
        
        if (aRecord && aRecord.data) {
          resolve({ status: 'ACTIVE', ip: aRecord.data, latency });
        } else {
          resolve({ status: 'BLOCKED', ip: '', latency });
        }
      } catch (error) {
        reject(error);
      }
    });

    socket.on('error', (err) => {
      cleanup();
      clearTimeout(timeoutId);
      reject(err);
    });

    socket.send(query, 53, dnsServer, (err) => {
      if (err) {
        cleanup();
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/check') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  req.on('end', async () => {
    try {
      const { hostname, isp_name } = JSON.parse(body);

      if (!hostname) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Hostname required' }));
        return;
      }

      const dnsServer = ISP_DNS_SERVERS[isp_name] || ISP_DNS_SERVERS['Global (Google)'];

      try {
        const result = await queryDNSServer(hostname, dnsServer, 10000);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isp: isp_name,
          status: result.status,
          ip: result.ip,
          latency: result.latency,
          details: `Queried ${dnsServer} directly from VPS`,
          dns_server: dnsServer,
          source: 'vps-udp'
        }));

      } catch (error) {
        const isTimeout = error.message.includes('timeout');
        
        if (isTimeout && isp_name !== 'Global (Google)') {
          // Timeout from ISP DNS = likely blocked
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'BLOCKED',
            ip: '',
            details: `DNS query timeout to ${dnsServer} - domain likely blocked`,
            dns_server: dnsServer,
            source: 'vps-timeout'
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'ERROR',
            error: error.message
          }));
        }
      }

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DNS Resolver Service running on port ${PORT}`);
  console.log(`📍 ISP DNS Servers configured:`);
  Object.entries(ISP_DNS_SERVERS).forEach(([isp, dns]) => {
    console.log(`   ${isp}: ${dns}`);
  });
  console.log(`\n🌐 API endpoint: http://0.0.0.0:${PORT}/api/check`);
});

/**
 * DNS Resolver Service
 * Deploy this on VPS in Thailand/Singapore for accurate ISP DNS checking
 * 
 * Usage: node dns-resolver-service.js
 * Port: 3001 (default)
 */

const http = require('http');
const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const PORT = process.env.PORT || 3001;

// ISP DNS Servers
const ISP_DNS_SERVERS = {
  'Global (Google)': '8.8.8.8',
  'AIS': '49.0.64.179',
  'TRUE': '203.144.207.29',
  'DTAC': '203.146.237.237',
  'NT': '61.91.79.20',
};

// Query DNS server via UDP
function queryDNSServer(hostname, dnsServer, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ type: 'A', name: hostname }]
    });

    const socket = dgram.createSocket('udp4');
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          socket.close();
        } catch (e) {}
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`DNS query timeout after ${timeout}ms to ${dnsServer}`));
    }, timeout);

    socket.on('message', (msg) => {
      cleanup();
      clearTimeout(timeoutId);
      
      try {
        const response = dnsPacket.decode(msg);
        const latency = Date.now() - startTime;

        if (response.rcode !== 'NOERROR') {
          resolve({ status: 'BLOCKED', ip: '', latency });
          return;
        }

        const aRecord = response.answers?.find((ans) => ans.type === 'A');
        
        if (aRecord && aRecord.data) {
          resolve({ status: 'ACTIVE', ip: aRecord.data, latency });
        } else {
          resolve({ status: 'BLOCKED', ip: '', latency });
        }
      } catch (error) {
        reject(error);
      }
    });

    socket.on('error', (err) => {
      cleanup();
      clearTimeout(timeoutId);
      reject(err);
    });

    socket.send(query, 53, dnsServer, (err) => {
      if (err) {
        cleanup();
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/check') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
  req.on('end', async () => {
    try {
      const { hostname, isp_name } = JSON.parse(body);

      if (!hostname) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Hostname required' }));
        return;
      }

      const dnsServer = ISP_DNS_SERVERS[isp_name] || ISP_DNS_SERVERS['Global (Google)'];

      try {
        const result = await queryDNSServer(hostname, dnsServer, 10000);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isp: isp_name,
          status: result.status,
          ip: result.ip,
          latency: result.latency,
          details: `Queried ${dnsServer} directly from VPS`,
          dns_server: dnsServer,
          source: 'vps-udp'
        }));

      } catch (error) {
        const isTimeout = error.message.includes('timeout');
        
        if (isTimeout && isp_name !== 'Global (Google)') {
          // Timeout from ISP DNS = likely blocked
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'BLOCKED',
            ip: '',
            details: `DNS query timeout to ${dnsServer} - domain likely blocked`,
            dns_server: dnsServer,
            source: 'vps-timeout'
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isp: isp_name,
            status: 'ERROR',
            error: error.message
          }));
        }
      }

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DNS Resolver Service running on port ${PORT}`);
  console.log(`📍 ISP DNS Servers configured:`);
  Object.entries(ISP_DNS_SERVERS).forEach(([isp, dns]) => {
    console.log(`   ${isp}: ${dns}`);
  });
  console.log(`\n🌐 API endpoint: http://0.0.0.0:${PORT}/api/check`);
});

