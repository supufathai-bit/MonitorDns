# ☁️ Cloudflare Pages Setup Guide

## 🎯 การตั้งค่า Cloudflare Pages สำหรับ Next.js

---

## 📋 ขั้นตอนการตั้งค่า

### 1. Framework Preset

**เลือก:** `Next.js`

Cloudflare จะ auto-detect และตั้งค่าให้อัตโนมัติ

---

### 2. Build Command

**ใส่:** `npm run build`

หรือถ้าใช้ yarn:
```
yarn build
```

---

### 3. Build Output Directory

**สำหรับ Next.js:**
- `.next` (default)
- หรือ `out` (ถ้าใช้ `output: 'export'`)

**แนะนำ:** `.next`

---

### 4. Root Directory (Optional)

**ปล่อยว่างไว้** (ถ้า project อยู่ที่ root)

หรือถ้า project อยู่ใน subfolder:
```
/app
```

---

### 5. Environment Variables (Optional)

**ถ้าต้องการเชื่อมต่อกับ Workers:**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## ✅ สรุปการตั้งค่า

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | (ว่าง) |
| **Environment variables** | (optional) `NEXT_PUBLIC_WORKERS_URL` |

---

## 🚀 หลังจาก Deploy

1. Cloudflare จะ build project
2. Deploy ไปที่ `monitordns.pages.dev`
3. ตั้งค่า custom domain (optional)

---

## ⚠️ หมายเหตุ

### Next.js on Cloudflare Pages

Cloudflare Pages รองรับ Next.js แต่มีข้อจำกัด:

1. **Server-side Features:**
   - API Routes จะทำงานเป็น Cloudflare Functions
   - ไม่รองรับ `getServerSideProps` (ใช้ `getStaticProps` แทน)

2. **Static Export:**
   - ถ้าต้องการ static site ทั้งหมด ใช้ `output: 'export'` ใน `next.config.js`
   - Output directory จะเป็น `out`

3. **API Routes:**
   - API Routes จะทำงานบน Cloudflare Functions
   - ไม่รองรับ UDP (แต่ไม่เป็นปัญหาเพราะใช้ Workers แทน)

---

## 🔧 ถ้า Build ล้มเหลว

### 1. ตรวจสอบ Node Version

เพิ่มใน `package.json`:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### 2. ตรวจสอบ Build Script

ใน `package.json`:
```json
{
  "scripts": {
    "build": "next build"
  }
}
```

### 3. ตรวจสอบ Dependencies

```bash
npm install
```

---

## 📝 Example: Complete Setup

### Step 1: Framework Preset
```
Next.js
```

### Step 2: Build Command
```
npm run build
```

### Step 3: Build Output Directory
```
.next
```

### Step 4: Environment Variables (ถ้าต้องการ)
```
NEXT_PUBLIC_WORKERS_URL=https://sentinel-dns-api.workers.dev
```

### Step 5: Save and Deploy
กดปุ่ม "Save and Deploy"

---

## 🎉 เสร็จสิ้น!

หลังจาก deploy สำเร็จ:
- Frontend จะอยู่ที่ `monitordns.pages.dev`
- API จะอยู่ที่ Workers (แยกกัน)
- Android app จะ sync กับ Workers API

---

## 💡 Tips

1. **Custom Domain:**
   - ไปที่ Settings → Custom domains
   - เพิ่ม domain ของคุณ

2. **Preview Deployments:**
   - ทุก PR จะมี preview URL
   - ทดสอบก่อน merge

3. **Analytics:**
   - เปิด Web Analytics ใน Cloudflare Dashboard
   - ดู traffic และ performance

---

## 🔗 Related Files

- `CLOUDFLARE_DEPLOYMENT.md` - คู่มือ deployment แบบละเอียด
- `cloudflare-workers-api.ts` - Workers API code


## 🎯 การตั้งค่า Cloudflare Pages สำหรับ Next.js

---

## 📋 ขั้นตอนการตั้งค่า

### 1. Framework Preset

**เลือก:** `Next.js`

Cloudflare จะ auto-detect และตั้งค่าให้อัตโนมัติ

---

### 2. Build Command

**ใส่:** `npm run build`

หรือถ้าใช้ yarn:
```
yarn build
```

---

### 3. Build Output Directory

**สำหรับ Next.js:**
- `.next` (default)
- หรือ `out` (ถ้าใช้ `output: 'export'`)

**แนะนำ:** `.next`

---

### 4. Root Directory (Optional)

**ปล่อยว่างไว้** (ถ้า project อยู่ที่ root)

หรือถ้า project อยู่ใน subfolder:
```
/app
```

---

### 5. Environment Variables (Optional)

**ถ้าต้องการเชื่อมต่อกับ Workers:**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## ✅ สรุปการตั้งค่า

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | (ว่าง) |
| **Environment variables** | (optional) `NEXT_PUBLIC_WORKERS_URL` |

---

## 🚀 หลังจาก Deploy

1. Cloudflare จะ build project
2. Deploy ไปที่ `monitordns.pages.dev`
3. ตั้งค่า custom domain (optional)

---

## ⚠️ หมายเหตุ

### Next.js on Cloudflare Pages

Cloudflare Pages รองรับ Next.js แต่มีข้อจำกัด:

1. **Server-side Features:**
   - API Routes จะทำงานเป็น Cloudflare Functions
   - ไม่รองรับ `getServerSideProps` (ใช้ `getStaticProps` แทน)

2. **Static Export:**
   - ถ้าต้องการ static site ทั้งหมด ใช้ `output: 'export'` ใน `next.config.js`
   - Output directory จะเป็น `out`

3. **API Routes:**
   - API Routes จะทำงานบน Cloudflare Functions
   - ไม่รองรับ UDP (แต่ไม่เป็นปัญหาเพราะใช้ Workers แทน)

---

## 🔧 ถ้า Build ล้มเหลว

### 1. ตรวจสอบ Node Version

เพิ่มใน `package.json`:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### 2. ตรวจสอบ Build Script

ใน `package.json`:
```json
{
  "scripts": {
    "build": "next build"
  }
}
```

### 3. ตรวจสอบ Dependencies

```bash
npm install
```

---

## 📝 Example: Complete Setup

### Step 1: Framework Preset
```
Next.js
```

### Step 2: Build Command
```
npm run build
```

### Step 3: Build Output Directory
```
.next
```

### Step 4: Environment Variables (ถ้าต้องการ)
```
NEXT_PUBLIC_WORKERS_URL=https://sentinel-dns-api.workers.dev
```

### Step 5: Save and Deploy
กดปุ่ม "Save and Deploy"

---

## 🎉 เสร็จสิ้น!

หลังจาก deploy สำเร็จ:
- Frontend จะอยู่ที่ `monitordns.pages.dev`
- API จะอยู่ที่ Workers (แยกกัน)
- Android app จะ sync กับ Workers API

---

## 💡 Tips

1. **Custom Domain:**
   - ไปที่ Settings → Custom domains
   - เพิ่ม domain ของคุณ

2. **Preview Deployments:**
   - ทุก PR จะมี preview URL
   - ทดสอบก่อน merge

3. **Analytics:**
   - เปิด Web Analytics ใน Cloudflare Dashboard
   - ดู traffic และ performance

---

## 🔗 Related Files

- `CLOUDFLARE_DEPLOYMENT.md` - คู่มือ deployment แบบละเอียด
- `cloudflare-workers-api.ts` - Workers API code


## 🎯 การตั้งค่า Cloudflare Pages สำหรับ Next.js

---

## 📋 ขั้นตอนการตั้งค่า

### 1. Framework Preset

**เลือก:** `Next.js`

Cloudflare จะ auto-detect และตั้งค่าให้อัตโนมัติ

---

### 2. Build Command

**ใส่:** `npm run build`

หรือถ้าใช้ yarn:
```
yarn build
```

---

### 3. Build Output Directory

**สำหรับ Next.js:**
- `.next` (default)
- หรือ `out` (ถ้าใช้ `output: 'export'`)

**แนะนำ:** `.next`

---

### 4. Root Directory (Optional)

**ปล่อยว่างไว้** (ถ้า project อยู่ที่ root)

หรือถ้า project อยู่ใน subfolder:
```
/app
```

---

### 5. Environment Variables (Optional)

**ถ้าต้องการเชื่อมต่อกับ Workers:**

```
NEXT_PUBLIC_WORKERS_URL=https://your-workers.workers.dev
```

---

## ✅ สรุปการตั้งค่า

| Field | Value |
|-------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | (ว่าง) |
| **Environment variables** | (optional) `NEXT_PUBLIC_WORKERS_URL` |

---

## 🚀 หลังจาก Deploy

1. Cloudflare จะ build project
2. Deploy ไปที่ `monitordns.pages.dev`
3. ตั้งค่า custom domain (optional)

---

## ⚠️ หมายเหตุ

### Next.js on Cloudflare Pages

Cloudflare Pages รองรับ Next.js แต่มีข้อจำกัด:

1. **Server-side Features:**
   - API Routes จะทำงานเป็น Cloudflare Functions
   - ไม่รองรับ `getServerSideProps` (ใช้ `getStaticProps` แทน)

2. **Static Export:**
   - ถ้าต้องการ static site ทั้งหมด ใช้ `output: 'export'` ใน `next.config.js`
   - Output directory จะเป็น `out`

3. **API Routes:**
   - API Routes จะทำงานบน Cloudflare Functions
   - ไม่รองรับ UDP (แต่ไม่เป็นปัญหาเพราะใช้ Workers แทน)

---

## 🔧 ถ้า Build ล้มเหลว

### 1. ตรวจสอบ Node Version

เพิ่มใน `package.json`:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### 2. ตรวจสอบ Build Script

ใน `package.json`:
```json
{
  "scripts": {
    "build": "next build"
  }
}
```

### 3. ตรวจสอบ Dependencies

```bash
npm install
```

---

## 📝 Example: Complete Setup

### Step 1: Framework Preset
```
Next.js
```

### Step 2: Build Command
```
npm run build
```

### Step 3: Build Output Directory
```
.next
```

### Step 4: Environment Variables (ถ้าต้องการ)
```
NEXT_PUBLIC_WORKERS_URL=https://sentinel-dns-api.workers.dev
```

### Step 5: Save and Deploy
กดปุ่ม "Save and Deploy"

---

## 🎉 เสร็จสิ้น!

หลังจาก deploy สำเร็จ:
- Frontend จะอยู่ที่ `monitordns.pages.dev`
- API จะอยู่ที่ Workers (แยกกัน)
- Android app จะ sync กับ Workers API

---

## 💡 Tips

1. **Custom Domain:**
   - ไปที่ Settings → Custom domains
   - เพิ่ม domain ของคุณ

2. **Preview Deployments:**
   - ทุก PR จะมี preview URL
   - ทดสอบก่อน merge

3. **Analytics:**
   - เปิด Web Analytics ใน Cloudflare Dashboard
   - ดู traffic และ performance

---

## 🔗 Related Files

- `CLOUDFLARE_DEPLOYMENT.md` - คู่มือ deployment แบบละเอียด
- `cloudflare-workers-api.ts` - Workers API code

