# ☁️ Cloudflare Deployment Guide

## 🎯 เป้าหมาย

Deploy frontend บน Cloudflare Pages และ API บน Cloudflare Workers (ฟรี) แล้วให้ Android app sync กับ Workers

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Android App    │
│  (ISP Network)  │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Workers (API)   │
│ /api/mobile-sync│
└────────┬────────┘
         │ Store
         ▼
┌─────────────────┐
│ KV Storage      │
│ (Cloudflare KV) │
└────────┬────────┘
         │ Fetch
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Pages (Frontend)│
│ Next.js         │
└─────────────────┘
```

---

## 📋 ขั้นตอนการ Deploy

### 1. Cloudflare Workers (API)

#### A. สร้าง Workers Project

```bash
# ติดตั้ง Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# สร้าง project
wrangler init sentinel-dns-api
```

#### B. สร้าง KV Namespace

```bash
# สร้าง KV namespace สำหรับเก็บข้อมูล
wrangler kv:namespace create "SENTINEL_DATA"
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

#### C. สร้าง Workers Code

**`src/index.ts`:**

```typescript
// Cloudflare Workers API
export interface Env {
  SENTINEL_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Mobile Sync API
    if (url.pathname === '/api/mobile-sync' && request.method === 'POST') {
      return handleMobileSync(request, env);
    }

    // Get Domains API
    if (url.pathname === '/api/mobile-sync/domains' && request.method === 'GET') {
      return handleGetDomains(request, env);
    }

    // Get Results API (for frontend)
    if (url.pathname === '/api/results' && request.method === 'GET') {
      return handleGetResults(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Handle mobile sync
async function handleMobileSync(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { device_id, device_info, results } = body;

    if (!device_id || !results || !Array.isArray(results)) {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }

    // Store results in KV
    const timestamp = Date.now();
    const key = `result:${device_id}:${timestamp}`;
    
    await env.SENTINEL_DATA.put(key, JSON.stringify({
      device_id,
      device_info,
      results,
      timestamp,
    }));

    // Also store latest result per domain+ISP
    for (const result of results) {
      const latestKey = `latest:${result.hostname}:${result.isp_name}`;
      await env.SENTINEL_DATA.put(latestKey, JSON.stringify({
        ...result,
        device_id,
        device_info,
        timestamp,
      }));
    }

    return jsonResponse({
      success: true,
      message: `Received ${results.length} results`,
      processed: results.length,
      timestamp,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// Get domains to check
async function handleGetDomains(request: Request, env: Env): Promise<Response> {
  const domains = [
    'ufathai.win',
    'ufathai.com',
    'www.zec777.com',
  ];

  return jsonResponse({
    success: true,
    domains,
    interval: 3600000, // 1 hour
  });
}

// Get results (for frontend)
async function handleGetResults(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.searchParams.get('hostname');
  const isp = url.searchParams.get('isp');

  if (hostname && isp) {
    // Get latest result for specific domain+ISP
    const key = `latest:${hostname}:${isp}`;
    const data = await env.SENTINEL_DATA.get(key);
    
    if (data) {
      return jsonResponse({ success: true, result: JSON.parse(data) });
    }
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
  });
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

#### D. Deploy Workers

```bash
# Deploy
wrangler deploy

# หรือ publish
wrangler publish
```

---

### 2. Cloudflare Pages (Frontend)

#### A. สร้าง Next.js Project

```bash
# สร้าง Next.js project (ถ้ายังไม่มี)
npx create-next-app@latest sentinel-dns-frontend
```

#### B. แก้ไข Frontend ให้ดึงข้อมูลจาก Workers

**`services/apiService.ts`:**

```typescript
// API Service for Cloudflare Workers
const WORKERS_URL = process.env.NEXT_PUBLIC_WORKERS_URL || 'https://your-workers.workers.dev';

export async function fetchResults(hostname?: string, isp?: string): Promise<any> {
  const params = new URLSearchParams();
  if (hostname) params.append('hostname', hostname);
  if (isp) params.append('isp', isp);

  const response = await fetch(`${WORKERS_URL}/api/results?${params}`);
  return response.json();
}

export async function getDomains(): Promise<string[]> {
  const response = await fetch(`${WORKERS_URL}/api/mobile-sync/domains`);
  const data = await response.json();
  return data.domains || [];
}
```

#### C. Deploy บน Cloudflare Pages

```bash
# Build
npm run build

# Deploy via Wrangler
wrangler pages deploy .next

# หรือใช้ GitHub Actions
# Cloudflare จะ auto-deploy เมื่อ push code
```

**หรือใช้ Cloudflare Dashboard:**

1. ไปที่ Cloudflare Dashboard → Pages
2. Connect GitHub repository
3. Build command: `npm run build`
4. Build output directory: `.next`
5. Deploy!

---

### 3. Android App Configuration

**Update API URL ใน Android app:**

```kotlin
// ApiClient.kt
private fun getServerUrl(): String {
    val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
    return prefs.getString("server_url", "https://your-workers.workers.dev") ?: ""
}
```

---

## 🔧 Configuration

### 1. Workers Configuration

**`wrangler.toml`:**

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 2. Environment Variables

**Frontend (.env.local):**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## 📊 Data Flow

### 1. Android App → Workers

```
Android App
  ↓ POST /api/mobile-sync
  ↓ { device_id, device_info, results }
Cloudflare Workers
  ↓ Store in KV
KV Storage
```

### 2. Frontend ← Workers

```
Cloudflare Pages (Frontend)
  ↓ GET /api/results
Cloudflare Workers
  ↓ Read from KV
KV Storage
  ↓ Return results
Frontend displays
```

---

## 💰 Cost

- **Cloudflare Workers:** ฟรี (100,000 requests/day)
- **Cloudflare Pages:** ฟรี (unlimited)
- **Cloudflare KV:** ฟรี (100,000 reads/day, 1,000 writes/day)

**Total: ฟรี!** 🎉

---

## ✅ Advantages

### 1. Cost

- ✅ ฟรีทั้งหมด
- ✅ ไม่มีค่าใช้จ่าย

### 2. Performance

- ✅ Cloudflare CDN (เร็วมาก)
- ✅ Global edge network
- ✅ Low latency

### 3. Scalability

- ✅ Auto-scaling
- ✅ ไม่ต้องจัดการ infrastructure
- ✅ Handle traffic spikes

---

## 🔒 Security

### 1. API Authentication (Optional)

```typescript
// Add API key check
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return jsonResponse({ error: 'Unauthorized' }, 401);
}
```

### 2. Rate Limiting

```typescript
// Use Cloudflare Rate Limiting
// หรือ implement custom rate limiting
```

---

## 🧪 Testing

### 1. Test Workers API

```bash
# Test mobile sync
curl -X POST https://your-workers.workers.dev/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "device_info": {"isp": "AIS", "network_type": "WiFi"},
    "results": [{
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000
    }]
  }'

# Test get domains
curl https://your-workers.workers.dev/api/mobile-sync/domains

# Test get results
curl https://your-workers.workers.dev/api/results
```

---

## 📝 Summary

**Architecture:**

- Frontend: Cloudflare Pages (Next.js)
- API: Cloudflare Workers
- Storage: Cloudflare KV
- Mobile: Android App → Workers API

**Benefits:**

- ✅ ฟรีทั้งหมด
- ✅ Performance ดี
- ✅ Scalable
- ✅ Global CDN

**Next Steps:**

1. สร้าง Cloudflare Workers
2. Deploy frontend บน Cloudflare Pages
3. Update Android app API URL
4. Test!

---

## 🎉 Ready to Deploy

ตอนนี้มี:

- ✅ Cloudflare Workers code
- ✅ Frontend integration
- ✅ Android app configuration
- ✅ Deployment guide

**Next:** Deploy บน Cloudflare!

## 🎯 เป้าหมาย

Deploy frontend บน Cloudflare Pages และ API บน Cloudflare Workers (ฟรี) แล้วให้ Android app sync กับ Workers

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Android App    │
│  (ISP Network)  │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Workers (API)   │
│ /api/mobile-sync│
└────────┬────────┘
         │ Store
         ▼
┌─────────────────┐
│ KV Storage      │
│ (Cloudflare KV) │
└────────┬────────┘
         │ Fetch
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Pages (Frontend)│
│ Next.js         │
└─────────────────┘
```

---

## 📋 ขั้นตอนการ Deploy

### 1. Cloudflare Workers (API)

#### A. สร้าง Workers Project

```bash
# ติดตั้ง Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# สร้าง project
wrangler init sentinel-dns-api
```

#### B. สร้าง KV Namespace

```bash
# สร้าง KV namespace สำหรับเก็บข้อมูล
wrangler kv:namespace create "SENTINEL_DATA"
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

#### C. สร้าง Workers Code

**`src/index.ts`:**

```typescript
// Cloudflare Workers API
export interface Env {
  SENTINEL_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Mobile Sync API
    if (url.pathname === '/api/mobile-sync' && request.method === 'POST') {
      return handleMobileSync(request, env);
    }

    // Get Domains API
    if (url.pathname === '/api/mobile-sync/domains' && request.method === 'GET') {
      return handleGetDomains(request, env);
    }

    // Get Results API (for frontend)
    if (url.pathname === '/api/results' && request.method === 'GET') {
      return handleGetResults(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Handle mobile sync
async function handleMobileSync(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { device_id, device_info, results } = body;

    if (!device_id || !results || !Array.isArray(results)) {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }

    // Store results in KV
    const timestamp = Date.now();
    const key = `result:${device_id}:${timestamp}`;
    
    await env.SENTINEL_DATA.put(key, JSON.stringify({
      device_id,
      device_info,
      results,
      timestamp,
    }));

    // Also store latest result per domain+ISP
    for (const result of results) {
      const latestKey = `latest:${result.hostname}:${result.isp_name}`;
      await env.SENTINEL_DATA.put(latestKey, JSON.stringify({
        ...result,
        device_id,
        device_info,
        timestamp,
      }));
    }

    return jsonResponse({
      success: true,
      message: `Received ${results.length} results`,
      processed: results.length,
      timestamp,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// Get domains to check
async function handleGetDomains(request: Request, env: Env): Promise<Response> {
  const domains = [
    'ufathai.win',
    'ufathai.com',
    'www.zec777.com',
  ];

  return jsonResponse({
    success: true,
    domains,
    interval: 3600000, // 1 hour
  });
}

// Get results (for frontend)
async function handleGetResults(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.searchParams.get('hostname');
  const isp = url.searchParams.get('isp');

  if (hostname && isp) {
    // Get latest result for specific domain+ISP
    const key = `latest:${hostname}:${isp}`;
    const data = await env.SENTINEL_DATA.get(key);
    
    if (data) {
      return jsonResponse({ success: true, result: JSON.parse(data) });
    }
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
  });
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

#### D. Deploy Workers

```bash
# Deploy
wrangler deploy

# หรือ publish
wrangler publish
```

---

### 2. Cloudflare Pages (Frontend)

#### A. สร้าง Next.js Project

```bash
# สร้าง Next.js project (ถ้ายังไม่มี)
npx create-next-app@latest sentinel-dns-frontend
```

#### B. แก้ไข Frontend ให้ดึงข้อมูลจาก Workers

**`services/apiService.ts`:**

```typescript
// API Service for Cloudflare Workers
const WORKERS_URL = process.env.NEXT_PUBLIC_WORKERS_URL || 'https://your-workers.workers.dev';

export async function fetchResults(hostname?: string, isp?: string): Promise<any> {
  const params = new URLSearchParams();
  if (hostname) params.append('hostname', hostname);
  if (isp) params.append('isp', isp);

  const response = await fetch(`${WORKERS_URL}/api/results?${params}`);
  return response.json();
}

export async function getDomains(): Promise<string[]> {
  const response = await fetch(`${WORKERS_URL}/api/mobile-sync/domains`);
  const data = await response.json();
  return data.domains || [];
}
```

#### C. Deploy บน Cloudflare Pages

```bash
# Build
npm run build

# Deploy via Wrangler
wrangler pages deploy .next

# หรือใช้ GitHub Actions
# Cloudflare จะ auto-deploy เมื่อ push code
```

**หรือใช้ Cloudflare Dashboard:**

1. ไปที่ Cloudflare Dashboard → Pages
2. Connect GitHub repository
3. Build command: `npm run build`
4. Build output directory: `.next`
5. Deploy!

---

### 3. Android App Configuration

**Update API URL ใน Android app:**

```kotlin
// ApiClient.kt
private fun getServerUrl(): String {
    val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
    return prefs.getString("server_url", "https://your-workers.workers.dev") ?: ""
}
```

---

## 🔧 Configuration

### 1. Workers Configuration

**`wrangler.toml`:**

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 2. Environment Variables

**Frontend (.env.local):**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## 📊 Data Flow

### 1. Android App → Workers

```
Android App
  ↓ POST /api/mobile-sync
  ↓ { device_id, device_info, results }
Cloudflare Workers
  ↓ Store in KV
KV Storage
```

### 2. Frontend ← Workers

```
Cloudflare Pages (Frontend)
  ↓ GET /api/results
Cloudflare Workers
  ↓ Read from KV
KV Storage
  ↓ Return results
Frontend displays
```

---

## 💰 Cost

- **Cloudflare Workers:** ฟรี (100,000 requests/day)
- **Cloudflare Pages:** ฟรี (unlimited)
- **Cloudflare KV:** ฟรี (100,000 reads/day, 1,000 writes/day)

**Total: ฟรี!** 🎉

---

## ✅ Advantages

### 1. Cost

- ✅ ฟรีทั้งหมด
- ✅ ไม่มีค่าใช้จ่าย

### 2. Performance

- ✅ Cloudflare CDN (เร็วมาก)
- ✅ Global edge network
- ✅ Low latency

### 3. Scalability

- ✅ Auto-scaling
- ✅ ไม่ต้องจัดการ infrastructure
- ✅ Handle traffic spikes

---

## 🔒 Security

### 1. API Authentication (Optional)

```typescript
// Add API key check
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return jsonResponse({ error: 'Unauthorized' }, 401);
}
```

### 2. Rate Limiting

```typescript
// Use Cloudflare Rate Limiting
// หรือ implement custom rate limiting
```

---

## 🧪 Testing

### 1. Test Workers API

```bash
# Test mobile sync
curl -X POST https://your-workers.workers.dev/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "device_info": {"isp": "AIS", "network_type": "WiFi"},
    "results": [{
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000
    }]
  }'

# Test get domains
curl https://your-workers.workers.dev/api/mobile-sync/domains

# Test get results
curl https://your-workers.workers.dev/api/results
```

---

## 📝 Summary

**Architecture:**

- Frontend: Cloudflare Pages (Next.js)
- API: Cloudflare Workers
- Storage: Cloudflare KV
- Mobile: Android App → Workers API

**Benefits:**

- ✅ ฟรีทั้งหมด
- ✅ Performance ดี
- ✅ Scalable
- ✅ Global CDN

**Next Steps:**

1. สร้าง Cloudflare Workers
2. Deploy frontend บน Cloudflare Pages
3. Update Android app API URL
4. Test!

---

## 🎉 Ready to Deploy

ตอนนี้มี:

- ✅ Cloudflare Workers code
- ✅ Frontend integration
- ✅ Android app configuration
- ✅ Deployment guide

**Next:** Deploy บน Cloudflare!

## 🎯 เป้าหมาย

Deploy frontend บน Cloudflare Pages และ API บน Cloudflare Workers (ฟรี) แล้วให้ Android app sync กับ Workers

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Android App    │
│  (ISP Network)  │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Workers (API)   │
│ /api/mobile-sync│
└────────┬────────┘
         │ Store
         ▼
┌─────────────────┐
│ KV Storage      │
│ (Cloudflare KV) │
└────────┬────────┘
         │ Fetch
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Pages (Frontend)│
│ Next.js         │
└─────────────────┘
```

---

## 📋 ขั้นตอนการ Deploy

### 1. Cloudflare Workers (API)

#### A. สร้าง Workers Project

```bash
# ติดตั้ง Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# สร้าง project
wrangler init sentinel-dns-api
```

#### B. สร้าง KV Namespace

```bash
# สร้าง KV namespace สำหรับเก็บข้อมูล
wrangler kv:namespace create "SENTINEL_DATA"
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

#### C. สร้าง Workers Code

**`src/index.ts`:**

```typescript
// Cloudflare Workers API
export interface Env {
  SENTINEL_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Mobile Sync API
    if (url.pathname === '/api/mobile-sync' && request.method === 'POST') {
      return handleMobileSync(request, env);
    }

    // Get Domains API
    if (url.pathname === '/api/mobile-sync/domains' && request.method === 'GET') {
      return handleGetDomains(request, env);
    }

    // Get Results API (for frontend)
    if (url.pathname === '/api/results' && request.method === 'GET') {
      return handleGetResults(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Handle mobile sync
async function handleMobileSync(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { device_id, device_info, results } = body;

    if (!device_id || !results || !Array.isArray(results)) {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }

    // Store results in KV
    const timestamp = Date.now();
    const key = `result:${device_id}:${timestamp}`;
    
    await env.SENTINEL_DATA.put(key, JSON.stringify({
      device_id,
      device_info,
      results,
      timestamp,
    }));

    // Also store latest result per domain+ISP
    for (const result of results) {
      const latestKey = `latest:${result.hostname}:${result.isp_name}`;
      await env.SENTINEL_DATA.put(latestKey, JSON.stringify({
        ...result,
        device_id,
        device_info,
        timestamp,
      }));
    }

    return jsonResponse({
      success: true,
      message: `Received ${results.length} results`,
      processed: results.length,
      timestamp,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// Get domains to check
async function handleGetDomains(request: Request, env: Env): Promise<Response> {
  const domains = [
    'ufathai.win',
    'ufathai.com',
    'www.zec777.com',
  ];

  return jsonResponse({
    success: true,
    domains,
    interval: 3600000, // 1 hour
  });
}

// Get results (for frontend)
async function handleGetResults(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.searchParams.get('hostname');
  const isp = url.searchParams.get('isp');

  if (hostname && isp) {
    // Get latest result for specific domain+ISP
    const key = `latest:${hostname}:${isp}`;
    const data = await env.SENTINEL_DATA.get(key);
    
    if (data) {
      return jsonResponse({ success: true, result: JSON.parse(data) });
    }
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
  });
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

#### D. Deploy Workers

```bash
# Deploy
wrangler deploy

# หรือ publish
wrangler publish
```

---

### 2. Cloudflare Pages (Frontend)

#### A. สร้าง Next.js Project

```bash
# สร้าง Next.js project (ถ้ายังไม่มี)
npx create-next-app@latest sentinel-dns-frontend
```

#### B. แก้ไข Frontend ให้ดึงข้อมูลจาก Workers

**`services/apiService.ts`:**

```typescript
// API Service for Cloudflare Workers
const WORKERS_URL = process.env.NEXT_PUBLIC_WORKERS_URL || 'https://your-workers.workers.dev';

export async function fetchResults(hostname?: string, isp?: string): Promise<any> {
  const params = new URLSearchParams();
  if (hostname) params.append('hostname', hostname);
  if (isp) params.append('isp', isp);

  const response = await fetch(`${WORKERS_URL}/api/results?${params}`);
  return response.json();
}

export async function getDomains(): Promise<string[]> {
  const response = await fetch(`${WORKERS_URL}/api/mobile-sync/domains`);
  const data = await response.json();
  return data.domains || [];
}
```

#### C. Deploy บน Cloudflare Pages

```bash
# Build
npm run build

# Deploy via Wrangler
wrangler pages deploy .next

# หรือใช้ GitHub Actions
# Cloudflare จะ auto-deploy เมื่อ push code
```

**หรือใช้ Cloudflare Dashboard:**

1. ไปที่ Cloudflare Dashboard → Pages
2. Connect GitHub repository
3. Build command: `npm run build`
4. Build output directory: `.next`
5. Deploy!

---

### 3. Android App Configuration

**Update API URL ใน Android app:**

```kotlin
// ApiClient.kt
private fun getServerUrl(): String {
    val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
    return prefs.getString("server_url", "https://your-workers.workers.dev") ?: ""
}
```

---

## 🔧 Configuration

### 1. Workers Configuration

**`wrangler.toml`:**

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 2. Environment Variables

**Frontend (.env.local):**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## 📊 Data Flow

### 1. Android App → Workers

```
Android App
  ↓ POST /api/mobile-sync
  ↓ { device_id, device_info, results }
Cloudflare Workers
  ↓ Store in KV
KV Storage
```

### 2. Frontend ← Workers

```
Cloudflare Pages (Frontend)
  ↓ GET /api/results
Cloudflare Workers
  ↓ Read from KV
KV Storage
  ↓ Return results
Frontend displays
```

---

## 💰 Cost

- **Cloudflare Workers:** ฟรี (100,000 requests/day)
- **Cloudflare Pages:** ฟรี (unlimited)
- **Cloudflare KV:** ฟรี (100,000 reads/day, 1,000 writes/day)

**Total: ฟรี!** 🎉

---

## ✅ Advantages

### 1. Cost

- ✅ ฟรีทั้งหมด
- ✅ ไม่มีค่าใช้จ่าย

### 2. Performance

- ✅ Cloudflare CDN (เร็วมาก)
- ✅ Global edge network
- ✅ Low latency

### 3. Scalability

- ✅ Auto-scaling
- ✅ ไม่ต้องจัดการ infrastructure
- ✅ Handle traffic spikes

---

## 🔒 Security

### 1. API Authentication (Optional)

```typescript
// Add API key check
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return jsonResponse({ error: 'Unauthorized' }, 401);
}
```

### 2. Rate Limiting

```typescript
// Use Cloudflare Rate Limiting
// หรือ implement custom rate limiting
```

---

## 🧪 Testing

### 1. Test Workers API

```bash
# Test mobile sync
curl -X POST https://your-workers.workers.dev/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "device_info": {"isp": "AIS", "network_type": "WiFi"},
    "results": [{
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000
    }]
  }'

# Test get domains
curl https://your-workers.workers.dev/api/mobile-sync/domains

# Test get results
curl https://your-workers.workers.dev/api/results
```

---

## 📝 Summary

**Architecture:**

- Frontend: Cloudflare Pages (Next.js)
- API: Cloudflare Workers
- Storage: Cloudflare KV
- Mobile: Android App → Workers API

**Benefits:**

- ✅ ฟรีทั้งหมด
- ✅ Performance ดี
- ✅ Scalable
- ✅ Global CDN

**Next Steps:**

1. สร้าง Cloudflare Workers
2. Deploy frontend บน Cloudflare Pages
3. Update Android app API URL
4. Test!

---

## 🎉 Ready to Deploy

ตอนนี้มี:

- ✅ Cloudflare Workers code
- ✅ Frontend integration
- ✅ Android app configuration
- ✅ Deployment guide

**Next:** Deploy บน Cloudflare!
