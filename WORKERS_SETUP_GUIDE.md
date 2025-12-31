# 🚀 Cloudflare Workers Setup Guide

## ✅ ใช่! ต้องสร้าง Workers

**เหตุผล:**
- Frontend (Cloudflare Pages) เป็น static site → API routes ไม่ทำงาน
- ต้องใช้ Workers สำหรับ API endpoints

---

## 📋 ขั้นตอนการสร้าง Workers

### 1. สร้าง Workers Project

```bash
# สร้าง folder
mkdir workers
cd workers

# ติดตั้ง Wrangler
npm install -g wrangler

# Login
wrangler login
```

### 2. สร้าง KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "SENTINEL_DATA"

# Preview namespace (สำหรับ development)
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้:**
- Production ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Preview ID: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### 3. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID
```

### 4. Deploy Workers

```bash
cd workers
npm install
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### 1. เพิ่ม Environment Variable ใน Cloudflare Pages

**Settings → Environment variables:**
- Variable: `NEXT_PUBLIC_WORKERS_URL`
- Value: `https://sentinel-dns-api.workers.dev`

### 2. Frontend จะเรียก Workers API อัตโนมัติ

Code ใน `services/dnsService.ts` จะใช้ Workers URL อัตโนมัติ

---

## 📊 Architecture

```
Android App
    ↓ POST /api/mobile-sync
Cloudflare Workers (API)
    ↓ Store in KV
Cloudflare KV Storage
    ↓ GET /api/results
Cloudflare Pages (Frontend)
    ↓ Display
User Browser
```

---

## ✅ Checklist

- [ ] ติดตั้ง Wrangler
- [ ] Login Cloudflare
- [ ] สร้าง KV namespace
- [ ] อัปเดต wrangler.toml
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

1. **Frontend (Pages)**: Static site - แสดงผล
2. **Workers**: API - รับ/เก็บข้อมูล
3. **KV**: Storage - เก็บข้อมูล
4. **Android App**: เช็ค DNS และ sync กับ Workers

**ทั้งหมดฟรี!** 🎉


## ✅ ใช่! ต้องสร้าง Workers

**เหตุผล:**
- Frontend (Cloudflare Pages) เป็น static site → API routes ไม่ทำงาน
- ต้องใช้ Workers สำหรับ API endpoints

---

## 📋 ขั้นตอนการสร้าง Workers

### 1. สร้าง Workers Project

```bash
# สร้าง folder
mkdir workers
cd workers

# ติดตั้ง Wrangler
npm install -g wrangler

# Login
wrangler login
```

### 2. สร้าง KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "SENTINEL_DATA"

# Preview namespace (สำหรับ development)
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้:**
- Production ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Preview ID: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### 3. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID
```

### 4. Deploy Workers

```bash
cd workers
npm install
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### 1. เพิ่ม Environment Variable ใน Cloudflare Pages

**Settings → Environment variables:**
- Variable: `NEXT_PUBLIC_WORKERS_URL`
- Value: `https://sentinel-dns-api.workers.dev`

### 2. Frontend จะเรียก Workers API อัตโนมัติ

Code ใน `services/dnsService.ts` จะใช้ Workers URL อัตโนมัติ

---

## 📊 Architecture

```
Android App
    ↓ POST /api/mobile-sync
Cloudflare Workers (API)
    ↓ Store in KV
Cloudflare KV Storage
    ↓ GET /api/results
Cloudflare Pages (Frontend)
    ↓ Display
User Browser
```

---

## ✅ Checklist

- [ ] ติดตั้ง Wrangler
- [ ] Login Cloudflare
- [ ] สร้าง KV namespace
- [ ] อัปเดต wrangler.toml
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

1. **Frontend (Pages)**: Static site - แสดงผล
2. **Workers**: API - รับ/เก็บข้อมูล
3. **KV**: Storage - เก็บข้อมูล
4. **Android App**: เช็ค DNS และ sync กับ Workers

**ทั้งหมดฟรี!** 🎉


## ✅ ใช่! ต้องสร้าง Workers

**เหตุผล:**
- Frontend (Cloudflare Pages) เป็น static site → API routes ไม่ทำงาน
- ต้องใช้ Workers สำหรับ API endpoints

---

## 📋 ขั้นตอนการสร้าง Workers

### 1. สร้าง Workers Project

```bash
# สร้าง folder
mkdir workers
cd workers

# ติดตั้ง Wrangler
npm install -g wrangler

# Login
wrangler login
```

### 2. สร้าง KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "SENTINEL_DATA"

# Preview namespace (สำหรับ development)
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้:**
- Production ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Preview ID: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### 3. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID
```

### 4. Deploy Workers

```bash
cd workers
npm install
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### 1. เพิ่ม Environment Variable ใน Cloudflare Pages

**Settings → Environment variables:**
- Variable: `NEXT_PUBLIC_WORKERS_URL`
- Value: `https://sentinel-dns-api.workers.dev`

### 2. Frontend จะเรียก Workers API อัตโนมัติ

Code ใน `services/dnsService.ts` จะใช้ Workers URL อัตโนมัติ

---

## 📊 Architecture

```
Android App
    ↓ POST /api/mobile-sync
Cloudflare Workers (API)
    ↓ Store in KV
Cloudflare KV Storage
    ↓ GET /api/results
Cloudflare Pages (Frontend)
    ↓ Display
User Browser
```

---

## ✅ Checklist

- [ ] ติดตั้ง Wrangler
- [ ] Login Cloudflare
- [ ] สร้าง KV namespace
- [ ] อัปเดต wrangler.toml
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

1. **Frontend (Pages)**: Static site - แสดงผล
2. **Workers**: API - รับ/เก็บข้อมูล
3. **KV**: Storage - เก็บข้อมูล
4. **Android App**: เช็ค DNS และ sync กับ Workers

**ทั้งหมดฟรี!** 🎉

