# 🔧 Fix: Cloudflare Pages 404 Error

## ⚠️ ปัญหา

Cloudflare Pages แสดง 404 error เพราะ:
- Next.js บน Cloudflare Pages ต้องใช้ **static export**
- API routes ไม่ทำงานบน static export
- ต้องใช้ **Cloudflare Workers** สำหรับ API

---

## ✅ วิธีแก้ไข

### 1. ตั้งค่า Static Export

**`next.config.js`:**
```javascript
const nextConfig = {
  output: 'export', // Static export for Cloudflare Pages
  trailingSlash: false,
};
```

### 2. เปลี่ยน Build Output Directory

ใน Cloudflare Pages settings:
- **Build output directory:** `out` (ไม่ใช่ `.next`)

### 3. ใช้ Workers สำหรับ API

Frontend จะเรียก Workers API แทน local API routes:
- Workers URL: `https://your-workers.workers.dev`
- Environment variable: `NEXT_PUBLIC_WORKERS_URL`

---

## 📋 Cloudflare Pages Settings

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |
| **Environment variables** | `NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev` |

---

## 🚀 Next Steps

1. ✅ Static export configured
2. ⏳ Create Cloudflare Workers (for API)
3. ⏳ Update frontend to use Workers API
4. ⏳ Deploy and test

---

## 💡 Architecture

```
Frontend (Cloudflare Pages - Static)
    ↓ HTTP API calls
Cloudflare Workers (API)
    ↓ Store/Process
Cloudflare KV
```

---

## ⚠️ หมายเหตุ

- API routes (`/api/*`) ไม่ทำงานบน static export
- ต้องใช้ Workers สำหรับ API
- Frontend เป็น static site ทั้งหมด

