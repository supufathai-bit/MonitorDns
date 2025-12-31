# Migration Guide: KV → D1

## Overview

Migrate จาก Cloudflare KV ไป Cloudflare D1 เพื่อ:
- ✅ เพิ่ม writes limit จาก 1,000/วัน → 3,333/วัน (ฟรี!)
- ✅ ใช้ SQL database (ง่ายต่อการ query)
- ✅ ทำงานบน Edge (เร็ว)

---

## Step 1: สร้าง D1 Database

```bash
cd workers
wrangler d1 create sentinel-dns-db
```

Output จะเป็นแบบนี้:
```
✅ Successfully created DB 'sentinel-dns-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Step 2: Update wrangler.toml

เพิ่ม D1 binding ใน `workers/wrangler.toml`:

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace (keep for backward compatibility)
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "a62456a79f7b4522bb4d9ccabb16b86e"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # จาก Step 1
```

---

## Step 3: สร้าง Database Schema

สร้างไฟล์ `workers/schema.sql`:

```sql
-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  hostname TEXT UNIQUE NOT NULL,
  url TEXT,
  is_monitoring INTEGER DEFAULT 1,
  telegram_chat_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Results table (latest results per domain+ISP+device)
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  isp_name TEXT NOT NULL,
  status TEXT NOT NULL,
  ip TEXT,
  latency INTEGER,
  device_id TEXT,
  device_info TEXT,  -- JSON string
  timestamp INTEGER NOT NULL,
  source TEXT DEFAULT 'mobile-app',
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostname, isp_name, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_hostname ON results(hostname);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_results_device ON results(device_id);
```

---

## Step 4: Deploy Schema

```bash
cd workers
wrangler d1 execute sentinel-dns-db --file=./schema.sql
```

---

## Step 5: Update Workers Code

Update `workers/src/index.ts`:

### 5.1 Update Env Interface

```typescript
export interface Env {
    SENTINEL_DATA: KVNamespace;  // Keep for backward compatibility
    DB: D1Database;  // Add D1 database
    API_KEY?: string;
}
```

### 5.2 Helper Functions

```typescript
// Helper: Get domains from D1
async function getDomainsFromD1(env: Env): Promise<string[]> {
    const result = await env.DB.prepare(
        "SELECT hostname FROM domains WHERE is_monitoring = 1 ORDER BY hostname"
    ).all();
    
    return result.results.map((row: any) => row.hostname);
}

// Helper: Save domain to D1
async function saveDomainToD1(env: Env, hostname: string, url?: string): Promise<void> {
    await env.DB.prepare(
        "INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(
        crypto.randomUUID(),
        hostname,
        url || hostname,
        Date.now()
    ).run();
}

// Helper: Save result to D1
async function saveResultToD1(
    env: Env,
    hostname: string,
    ispName: string,
    status: string,
    ip: string,
    latency: number,
    deviceId: string,
    deviceInfo: any,
    timestamp: number
): Promise<void> {
    const id = `${hostname}:${ispName}:${deviceId}`;
    
    await env.DB.prepare(
        `INSERT OR REPLACE INTO results 
         (id, hostname, isp_name, status, ip, latency, device_id, device_info, timestamp, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        hostname,
        ispName,
        status,
        ip,
        latency,
        deviceId,
        JSON.stringify(deviceInfo),
        timestamp,
        Date.now()
    ).run();
}

// Helper: Get latest results from D1
async function getLatestResultsFromD1(env: Env, hostname?: string): Promise<any[]> {
    let query = env.DB.prepare(
        `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
         FROM results
         WHERE timestamp > ?
         ORDER BY timestamp DESC
         LIMIT 1000`
    ).bind(Date.now() - 86400000 * 7); // Last 7 days
    
    if (hostname) {
        query = env.DB.prepare(
            `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
             FROM results
             WHERE hostname = ? AND timestamp > ?
             ORDER BY timestamp DESC`
        ).bind(hostname, Date.now() - 86400000 * 7);
    }
    
    const result = await query.all();
    return result.results.map((row: any) => ({
        ...row,
        device_info: JSON.parse(row.device_info || '{}')
    }));
}
```

### 5.3 Update handleGetDomains

```typescript
async function handleGetDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first, fallback to KV
        let domains: string[] = [];
        
        try {
            domains = await getDomainsFromD1(env);
        } catch (d1Error) {
            console.error('D1 error, falling back to KV:', d1Error);
            // Fallback to KV
            const storedDomains = await env.SENTINEL_DATA.get('domains:list');
            if (storedDomains) {
                domains = JSON.parse(storedDomains);
            }
        }
        
        if (domains.length === 0) {
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
            interval: 3600000,
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
```

### 5.4 Update handleUpdateDomains

```typescript
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
        
        // Normalize hostnames
        const hostnames = domains.map(domain => {
            const str = typeof domain === 'string' ? domain : (domain.hostname || domain.url || String(domain));
            return str.replace(/^www\./i, '').toLowerCase();
        });
        const uniqueHostnames = [...new Set(hostnames)].sort();
        
        // Save to D1
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname => 
            stmt.bind(crypto.randomUUID(), hostname, hostname, Date.now())
        );
        
        await env.DB.batch(batch);
        
        // Also save to KV for backward compatibility
        await env.SENTINEL_DATA.put('domains:list', JSON.stringify(uniqueHostnames));
        
        return jsonResponse({
            success: true,
            message: `Updated ${uniqueHostnames.length} domains`,
            domains: uniqueHostnames,
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
```

---

## Step 6: Migrate Existing Data (Optional)

สร้าง migration script `workers/migrate-kv-to-d1.ts`:

```typescript
// Run with: wrangler d1 execute sentinel-dns-db --command="SELECT 1"
// Then manually migrate data from KV to D1

async function migrateKVToD1(env: Env) {
    // Get domains from KV
    const domainsStr = await env.SENTINEL_DATA.get('domains:list');
    if (domainsStr) {
        const domains = JSON.parse(domainsStr);
        for (const domain of domains) {
            await saveDomainToD1(env, domain, domain);
        }
    }
    
    // Get results from KV (latest:* keys)
    // This is more complex - need to iterate through KV keys
    // Or just let new results populate D1 naturally
}
```

---

## Step 7: Deploy

```bash
cd workers
npm run deploy
```

---

## Step 8: Test

1. Test GET domains endpoint
2. Test POST domains endpoint
3. Test mobile sync (results)
4. Verify data in D1

---

## Benefits After Migration

✅ **3x more writes** (3,333/day vs 1,000/day)
✅ **SQL queries** (ง่ายต่อการ query)
✅ **Better performance** (indexed queries)
✅ **Free tier** (ไม่ต้องจ่ายเงิน)

---

## Rollback Plan

ถ้ามีปัญหา สามารถ rollback ได้:
1. Keep KV code (backward compatibility)
2. D1 และ KV ทำงานพร้อมกัน
3. ถ้า D1 fail → fallback to KV

---

## Notes

- D1 และ KV สามารถทำงานพร้อมกันได้
- เริ่มใช้ D1 สำหรับ writes ใหม่
- Keep KV สำหรับ reads (backward compatibility)
- Gradually migrate ข้อมูลเก่าจาก KV → D1


## Overview

Migrate จาก Cloudflare KV ไป Cloudflare D1 เพื่อ:
- ✅ เพิ่ม writes limit จาก 1,000/วัน → 3,333/วัน (ฟรี!)
- ✅ ใช้ SQL database (ง่ายต่อการ query)
- ✅ ทำงานบน Edge (เร็ว)

---

## Step 1: สร้าง D1 Database

```bash
cd workers
wrangler d1 create sentinel-dns-db
```

Output จะเป็นแบบนี้:
```
✅ Successfully created DB 'sentinel-dns-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Step 2: Update wrangler.toml

เพิ่ม D1 binding ใน `workers/wrangler.toml`:

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace (keep for backward compatibility)
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "a62456a79f7b4522bb4d9ccabb16b86e"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # จาก Step 1
```

---

## Step 3: สร้าง Database Schema

สร้างไฟล์ `workers/schema.sql`:

```sql
-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  hostname TEXT UNIQUE NOT NULL,
  url TEXT,
  is_monitoring INTEGER DEFAULT 1,
  telegram_chat_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Results table (latest results per domain+ISP+device)
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  isp_name TEXT NOT NULL,
  status TEXT NOT NULL,
  ip TEXT,
  latency INTEGER,
  device_id TEXT,
  device_info TEXT,  -- JSON string
  timestamp INTEGER NOT NULL,
  source TEXT DEFAULT 'mobile-app',
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostname, isp_name, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_hostname ON results(hostname);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_results_device ON results(device_id);
```

---

## Step 4: Deploy Schema

```bash
cd workers
wrangler d1 execute sentinel-dns-db --file=./schema.sql
```

---

## Step 5: Update Workers Code

Update `workers/src/index.ts`:

### 5.1 Update Env Interface

```typescript
export interface Env {
    SENTINEL_DATA: KVNamespace;  // Keep for backward compatibility
    DB: D1Database;  // Add D1 database
    API_KEY?: string;
}
```

### 5.2 Helper Functions

```typescript
// Helper: Get domains from D1
async function getDomainsFromD1(env: Env): Promise<string[]> {
    const result = await env.DB.prepare(
        "SELECT hostname FROM domains WHERE is_monitoring = 1 ORDER BY hostname"
    ).all();
    
    return result.results.map((row: any) => row.hostname);
}

// Helper: Save domain to D1
async function saveDomainToD1(env: Env, hostname: string, url?: string): Promise<void> {
    await env.DB.prepare(
        "INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(
        crypto.randomUUID(),
        hostname,
        url || hostname,
        Date.now()
    ).run();
}

// Helper: Save result to D1
async function saveResultToD1(
    env: Env,
    hostname: string,
    ispName: string,
    status: string,
    ip: string,
    latency: number,
    deviceId: string,
    deviceInfo: any,
    timestamp: number
): Promise<void> {
    const id = `${hostname}:${ispName}:${deviceId}`;
    
    await env.DB.prepare(
        `INSERT OR REPLACE INTO results 
         (id, hostname, isp_name, status, ip, latency, device_id, device_info, timestamp, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        hostname,
        ispName,
        status,
        ip,
        latency,
        deviceId,
        JSON.stringify(deviceInfo),
        timestamp,
        Date.now()
    ).run();
}

// Helper: Get latest results from D1
async function getLatestResultsFromD1(env: Env, hostname?: string): Promise<any[]> {
    let query = env.DB.prepare(
        `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
         FROM results
         WHERE timestamp > ?
         ORDER BY timestamp DESC
         LIMIT 1000`
    ).bind(Date.now() - 86400000 * 7); // Last 7 days
    
    if (hostname) {
        query = env.DB.prepare(
            `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
             FROM results
             WHERE hostname = ? AND timestamp > ?
             ORDER BY timestamp DESC`
        ).bind(hostname, Date.now() - 86400000 * 7);
    }
    
    const result = await query.all();
    return result.results.map((row: any) => ({
        ...row,
        device_info: JSON.parse(row.device_info || '{}')
    }));
}
```

### 5.3 Update handleGetDomains

```typescript
async function handleGetDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first, fallback to KV
        let domains: string[] = [];
        
        try {
            domains = await getDomainsFromD1(env);
        } catch (d1Error) {
            console.error('D1 error, falling back to KV:', d1Error);
            // Fallback to KV
            const storedDomains = await env.SENTINEL_DATA.get('domains:list');
            if (storedDomains) {
                domains = JSON.parse(storedDomains);
            }
        }
        
        if (domains.length === 0) {
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
            interval: 3600000,
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
```

### 5.4 Update handleUpdateDomains

```typescript
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
        
        // Normalize hostnames
        const hostnames = domains.map(domain => {
            const str = typeof domain === 'string' ? domain : (domain.hostname || domain.url || String(domain));
            return str.replace(/^www\./i, '').toLowerCase();
        });
        const uniqueHostnames = [...new Set(hostnames)].sort();
        
        // Save to D1
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname => 
            stmt.bind(crypto.randomUUID(), hostname, hostname, Date.now())
        );
        
        await env.DB.batch(batch);
        
        // Also save to KV for backward compatibility
        await env.SENTINEL_DATA.put('domains:list', JSON.stringify(uniqueHostnames));
        
        return jsonResponse({
            success: true,
            message: `Updated ${uniqueHostnames.length} domains`,
            domains: uniqueHostnames,
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
```

---

## Step 6: Migrate Existing Data (Optional)

สร้าง migration script `workers/migrate-kv-to-d1.ts`:

```typescript
// Run with: wrangler d1 execute sentinel-dns-db --command="SELECT 1"
// Then manually migrate data from KV to D1

async function migrateKVToD1(env: Env) {
    // Get domains from KV
    const domainsStr = await env.SENTINEL_DATA.get('domains:list');
    if (domainsStr) {
        const domains = JSON.parse(domainsStr);
        for (const domain of domains) {
            await saveDomainToD1(env, domain, domain);
        }
    }
    
    // Get results from KV (latest:* keys)
    // This is more complex - need to iterate through KV keys
    // Or just let new results populate D1 naturally
}
```

---

## Step 7: Deploy

```bash
cd workers
npm run deploy
```

---

## Step 8: Test

1. Test GET domains endpoint
2. Test POST domains endpoint
3. Test mobile sync (results)
4. Verify data in D1

---

## Benefits After Migration

✅ **3x more writes** (3,333/day vs 1,000/day)
✅ **SQL queries** (ง่ายต่อการ query)
✅ **Better performance** (indexed queries)
✅ **Free tier** (ไม่ต้องจ่ายเงิน)

---

## Rollback Plan

ถ้ามีปัญหา สามารถ rollback ได้:
1. Keep KV code (backward compatibility)
2. D1 และ KV ทำงานพร้อมกัน
3. ถ้า D1 fail → fallback to KV

---

## Notes

- D1 และ KV สามารถทำงานพร้อมกันได้
- เริ่มใช้ D1 สำหรับ writes ใหม่
- Keep KV สำหรับ reads (backward compatibility)
- Gradually migrate ข้อมูลเก่าจาก KV → D1


## Overview

Migrate จาก Cloudflare KV ไป Cloudflare D1 เพื่อ:
- ✅ เพิ่ม writes limit จาก 1,000/วัน → 3,333/วัน (ฟรี!)
- ✅ ใช้ SQL database (ง่ายต่อการ query)
- ✅ ทำงานบน Edge (เร็ว)

---

## Step 1: สร้าง D1 Database

```bash
cd workers
wrangler d1 create sentinel-dns-db
```

Output จะเป็นแบบนี้:
```
✅ Successfully created DB 'sentinel-dns-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Step 2: Update wrangler.toml

เพิ่ม D1 binding ใน `workers/wrangler.toml`:

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace (keep for backward compatibility)
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "a62456a79f7b4522bb4d9ccabb16b86e"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "sentinel-dns-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # จาก Step 1
```

---

## Step 3: สร้าง Database Schema

สร้างไฟล์ `workers/schema.sql`:

```sql
-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  hostname TEXT UNIQUE NOT NULL,
  url TEXT,
  is_monitoring INTEGER DEFAULT 1,
  telegram_chat_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Results table (latest results per domain+ISP+device)
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL,
  isp_name TEXT NOT NULL,
  status TEXT NOT NULL,
  ip TEXT,
  latency INTEGER,
  device_id TEXT,
  device_info TEXT,  -- JSON string
  timestamp INTEGER NOT NULL,
  source TEXT DEFAULT 'mobile-app',
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostname, isp_name, device_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_hostname ON results(hostname);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_results_device ON results(device_id);
```

---

## Step 4: Deploy Schema

```bash
cd workers
wrangler d1 execute sentinel-dns-db --file=./schema.sql
```

---

## Step 5: Update Workers Code

Update `workers/src/index.ts`:

### 5.1 Update Env Interface

```typescript
export interface Env {
    SENTINEL_DATA: KVNamespace;  // Keep for backward compatibility
    DB: D1Database;  // Add D1 database
    API_KEY?: string;
}
```

### 5.2 Helper Functions

```typescript
// Helper: Get domains from D1
async function getDomainsFromD1(env: Env): Promise<string[]> {
    const result = await env.DB.prepare(
        "SELECT hostname FROM domains WHERE is_monitoring = 1 ORDER BY hostname"
    ).all();
    
    return result.results.map((row: any) => row.hostname);
}

// Helper: Save domain to D1
async function saveDomainToD1(env: Env, hostname: string, url?: string): Promise<void> {
    await env.DB.prepare(
        "INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(
        crypto.randomUUID(),
        hostname,
        url || hostname,
        Date.now()
    ).run();
}

// Helper: Save result to D1
async function saveResultToD1(
    env: Env,
    hostname: string,
    ispName: string,
    status: string,
    ip: string,
    latency: number,
    deviceId: string,
    deviceInfo: any,
    timestamp: number
): Promise<void> {
    const id = `${hostname}:${ispName}:${deviceId}`;
    
    await env.DB.prepare(
        `INSERT OR REPLACE INTO results 
         (id, hostname, isp_name, status, ip, latency, device_id, device_info, timestamp, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id,
        hostname,
        ispName,
        status,
        ip,
        latency,
        deviceId,
        JSON.stringify(deviceInfo),
        timestamp,
        Date.now()
    ).run();
}

// Helper: Get latest results from D1
async function getLatestResultsFromD1(env: Env, hostname?: string): Promise<any[]> {
    let query = env.DB.prepare(
        `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
         FROM results
         WHERE timestamp > ?
         ORDER BY timestamp DESC
         LIMIT 1000`
    ).bind(Date.now() - 86400000 * 7); // Last 7 days
    
    if (hostname) {
        query = env.DB.prepare(
            `SELECT hostname, isp_name, status, ip, latency, device_id, device_info, timestamp
             FROM results
             WHERE hostname = ? AND timestamp > ?
             ORDER BY timestamp DESC`
        ).bind(hostname, Date.now() - 86400000 * 7);
    }
    
    const result = await query.all();
    return result.results.map((row: any) => ({
        ...row,
        device_info: JSON.parse(row.device_info || '{}')
    }));
}
```

### 5.3 Update handleGetDomains

```typescript
async function handleGetDomains(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Try D1 first, fallback to KV
        let domains: string[] = [];
        
        try {
            domains = await getDomainsFromD1(env);
        } catch (d1Error) {
            console.error('D1 error, falling back to KV:', d1Error);
            // Fallback to KV
            const storedDomains = await env.SENTINEL_DATA.get('domains:list');
            if (storedDomains) {
                domains = JSON.parse(storedDomains);
            }
        }
        
        if (domains.length === 0) {
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
            interval: 3600000,
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
```

### 5.4 Update handleUpdateDomains

```typescript
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
        
        // Normalize hostnames
        const hostnames = domains.map(domain => {
            const str = typeof domain === 'string' ? domain : (domain.hostname || domain.url || String(domain));
            return str.replace(/^www\./i, '').toLowerCase();
        });
        const uniqueHostnames = [...new Set(hostnames)].sort();
        
        // Save to D1
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO domains (id, hostname, url, updated_at) VALUES (?, ?, ?, ?)");
        const batch = uniqueHostnames.map(hostname => 
            stmt.bind(crypto.randomUUID(), hostname, hostname, Date.now())
        );
        
        await env.DB.batch(batch);
        
        // Also save to KV for backward compatibility
        await env.SENTINEL_DATA.put('domains:list', JSON.stringify(uniqueHostnames));
        
        return jsonResponse({
            success: true,
            message: `Updated ${uniqueHostnames.length} domains`,
            domains: uniqueHostnames,
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
```

---

## Step 6: Migrate Existing Data (Optional)

สร้าง migration script `workers/migrate-kv-to-d1.ts`:

```typescript
// Run with: wrangler d1 execute sentinel-dns-db --command="SELECT 1"
// Then manually migrate data from KV to D1

async function migrateKVToD1(env: Env) {
    // Get domains from KV
    const domainsStr = await env.SENTINEL_DATA.get('domains:list');
    if (domainsStr) {
        const domains = JSON.parse(domainsStr);
        for (const domain of domains) {
            await saveDomainToD1(env, domain, domain);
        }
    }
    
    // Get results from KV (latest:* keys)
    // This is more complex - need to iterate through KV keys
    // Or just let new results populate D1 naturally
}
```

---

## Step 7: Deploy

```bash
cd workers
npm run deploy
```

---

## Step 8: Test

1. Test GET domains endpoint
2. Test POST domains endpoint
3. Test mobile sync (results)
4. Verify data in D1

---

## Benefits After Migration

✅ **3x more writes** (3,333/day vs 1,000/day)
✅ **SQL queries** (ง่ายต่อการ query)
✅ **Better performance** (indexed queries)
✅ **Free tier** (ไม่ต้องจ่ายเงิน)

---

## Rollback Plan

ถ้ามีปัญหา สามารถ rollback ได้:
1. Keep KV code (backward compatibility)
2. D1 และ KV ทำงานพร้อมกัน
3. ถ้า D1 fail → fallback to KV

---

## Notes

- D1 และ KV สามารถทำงานพร้อมกันได้
- เริ่มใช้ D1 สำหรับ writes ใหม่
- Keep KV สำหรับ reads (backward compatibility)
- Gradually migrate ข้อมูลเก่าจาก KV → D1

