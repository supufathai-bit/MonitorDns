# ⚠️ ปัญหา: UDP DNS Query ไม่ทำงาน

## 🔍 สาเหตุ

Next.js Serverless Functions (Vercel/Cloudflare) **ไม่รองรับ UDP sockets** (`dgram` module)

### ผลกระทบ:
- UDP query ไป ISP DNS servers timeout
- Fallback ไป Google DoH (แสดงผลผิด - ไม่ตรวจจับการบล็อกของ ISP)

---

## ✅ วิธีแก้ไข

### ทางเลือกที่ 1: ใช้ External DNS Resolver API (แนะนำ)

ใช้บริการ DNS resolver ที่รองรับการ query จาก DNS servers ต่างๆ:

**ตัวอย่าง Services:**
- `https://dns.google/resolve` (แต่ไม่สามารถระบุ DNS server ได้)
- Custom DNS resolver service
- Third-party DNS checker APIs

### ทางเลือกที่ 2: Deploy บน VPS/Server ที่รองรับ UDP

1. **Self-hosted Next.js** บน VPS
2. **Railway/Render** (รองรับ UDP)
3. **DigitalOcean App Platform** (รองรับ UDP)

### ทางเลือกที่ 3: ใช้ DNS over HTTPS (DoH) ของ ISP (ถ้ามี)

บาง ISP มี DoH endpoint:
- AIS: (ต้องตรวจสอบ)
- True: (ต้องตรวจสอบ)
- DTAC: (ต้องตรวจสอบ)

---

## 🛠️ Solution ที่แนะนำ

### ใช้ External DNS Resolver Service

สร้าง API endpoint ที่:
1. รับ request จาก Next.js
2. Query ISP DNS servers โดยตรง (UDP)
3. ส่งผลลัพธ์กลับ

**Deploy options:**
- VPS (DigitalOcean, Linode, etc.)
- Railway
- Render
- Fly.io

---

## 📝 สรุป

**ปัญหาหลัก:** Next.js Serverless Functions ไม่รองรับ UDP  
**วิธีแก้:** ใช้ external DNS resolver service หรือ deploy บน platform ที่รองรับ UDP


## 🔍 สาเหตุ

Next.js Serverless Functions (Vercel/Cloudflare) **ไม่รองรับ UDP sockets** (`dgram` module)

### ผลกระทบ:
- UDP query ไป ISP DNS servers timeout
- Fallback ไป Google DoH (แสดงผลผิด - ไม่ตรวจจับการบล็อกของ ISP)

---

## ✅ วิธีแก้ไข

### ทางเลือกที่ 1: ใช้ External DNS Resolver API (แนะนำ)

ใช้บริการ DNS resolver ที่รองรับการ query จาก DNS servers ต่างๆ:

**ตัวอย่าง Services:**
- `https://dns.google/resolve` (แต่ไม่สามารถระบุ DNS server ได้)
- Custom DNS resolver service
- Third-party DNS checker APIs

### ทางเลือกที่ 2: Deploy บน VPS/Server ที่รองรับ UDP

1. **Self-hosted Next.js** บน VPS
2. **Railway/Render** (รองรับ UDP)
3. **DigitalOcean App Platform** (รองรับ UDP)

### ทางเลือกที่ 3: ใช้ DNS over HTTPS (DoH) ของ ISP (ถ้ามี)

บาง ISP มี DoH endpoint:
- AIS: (ต้องตรวจสอบ)
- True: (ต้องตรวจสอบ)
- DTAC: (ต้องตรวจสอบ)

---

## 🛠️ Solution ที่แนะนำ

### ใช้ External DNS Resolver Service

สร้าง API endpoint ที่:
1. รับ request จาก Next.js
2. Query ISP DNS servers โดยตรง (UDP)
3. ส่งผลลัพธ์กลับ

**Deploy options:**
- VPS (DigitalOcean, Linode, etc.)
- Railway
- Render
- Fly.io

---

## 📝 สรุป

**ปัญหาหลัก:** Next.js Serverless Functions ไม่รองรับ UDP  
**วิธีแก้:** ใช้ external DNS resolver service หรือ deploy บน platform ที่รองรับ UDP


## 🔍 สาเหตุ

Next.js Serverless Functions (Vercel/Cloudflare) **ไม่รองรับ UDP sockets** (`dgram` module)

### ผลกระทบ:
- UDP query ไป ISP DNS servers timeout
- Fallback ไป Google DoH (แสดงผลผิด - ไม่ตรวจจับการบล็อกของ ISP)

---

## ✅ วิธีแก้ไข

### ทางเลือกที่ 1: ใช้ External DNS Resolver API (แนะนำ)

ใช้บริการ DNS resolver ที่รองรับการ query จาก DNS servers ต่างๆ:

**ตัวอย่าง Services:**
- `https://dns.google/resolve` (แต่ไม่สามารถระบุ DNS server ได้)
- Custom DNS resolver service
- Third-party DNS checker APIs

### ทางเลือกที่ 2: Deploy บน VPS/Server ที่รองรับ UDP

1. **Self-hosted Next.js** บน VPS
2. **Railway/Render** (รองรับ UDP)
3. **DigitalOcean App Platform** (รองรับ UDP)

### ทางเลือกที่ 3: ใช้ DNS over HTTPS (DoH) ของ ISP (ถ้ามี)

บาง ISP มี DoH endpoint:
- AIS: (ต้องตรวจสอบ)
- True: (ต้องตรวจสอบ)
- DTAC: (ต้องตรวจสอบ)

---

## 🛠️ Solution ที่แนะนำ

### ใช้ External DNS Resolver Service

สร้าง API endpoint ที่:
1. รับ request จาก Next.js
2. Query ISP DNS servers โดยตรง (UDP)
3. ส่งผลลัพธ์กลับ

**Deploy options:**
- VPS (DigitalOcean, Linode, etc.)
- Railway
- Render
- Fly.io

---

## 📝 สรุป

**ปัญหาหลัก:** Next.js Serverless Functions ไม่รองรับ UDP  
**วิธีแก้:** ใช้ external DNS resolver service หรือ deploy บน platform ที่รองรับ UDP

