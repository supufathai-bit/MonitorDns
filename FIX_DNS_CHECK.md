# 🔧 แก้ไข DNS Check Error

## ✅ สิ่งที่แก้ไข

### 1. เพิ่ม `/api/check` endpoint ใน Workers

**ปัญหา:**
- Frontend เป็น static site (ไม่มี API routes)
- พยายามเรียก `/api/check` แต่ไม่มี
- แสดง ERROR ทั้งหมด

**แก้ไข:**
- ✅ เพิ่ม `/api/check` endpoint ใน Workers
- ✅ ใช้ DNS-over-HTTPS (DoH) สำหรับ Global (Google)
- ✅ ใช้ cached results สำหรับ ISP-specific (AIS, True, DTAC, NT)

---

## 🧪 ทดสอบ

### 1. ทดสอบ Global (Google)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "isp": "Global (Google)",
  "status": "ACTIVE",
  "ip": "142.250.191.14",
  "latency": 0,
  "details": "Resolved via Google DoH",
  "dns_server": "8.8.8.8",
  "source": "doh"
}
```

### 2. ทดสอบ ISP-specific (AIS, True, DTAC, NT)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"AIS"}'
```

**ผลลัพธ์:**
- ถ้ามี cached result จาก mobile app → แสดงผลลัพธ์
- ถ้าไม่มี → แสดง ERROR พร้อมข้อความแนะนำให้ใช้ Android app

---

## 🔗 อัพเดท Frontend

### Step 1: อัพเดท Workers URL

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. อัพเดทหรือเพิ่ม:
   - **Variable name:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.snowwhite04-01x.workers.dev`
4. **Save**
5. **Redeploy** (Cloudflare จะ rebuild อัตโนมัติ)

### Step 2: ทดสอบ Frontend

1. เปิด https://monitordns.pages.dev/
2. เพิ่ม domain: `google.com`
3. กด **"RUN FULL SCAN"**

**ผลลัพธ์ที่คาดหวัง:**
- ✅ **Global (Google)**: ACTIVE (ใช้ DoH)
- ⚠️ **AIS, True, DTAC, NT**: ERROR หรือ cached result (ถ้ามี)

---

## ⚠️ ข้อจำกัด

### Workers ไม่สามารถทำ UDP DNS queries ได้

**ทำไม:**
- Cloudflare Workers รันบน Edge network
- ไม่รองรับ UDP sockets
- ไม่สามารถ query ISP DNS servers โดยตรงได้

**วิธีแก้:**
1. ✅ **Global (Google)**: ใช้ DNS-over-HTTPS (DoH) → ทำงานได้
2. ⚠️ **ISP-specific**: ต้องใช้ Android app → เช็คจาก ISP network จริง

---

## 📱 วิธีแก้ไขให้แม่นยำ 100%

### ใช้ Android App

1. สร้าง Android app (ดู `ANDROID_APP_DESIGN.md`)
2. App เช็ค DNS จาก ISP network จริง
3. Sync ผลลัพธ์ไปที่ Workers
4. Frontend แสดงผลลัพธ์จาก Workers

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Global (Google) ทำงานได้แล้ว (ใช้ DoH)
- ⚠️ ISP-specific ต้องใช้ Android app

**Next Steps:**
1. อัพเดท `NEXT_PUBLIC_WORKERS_URL` ใน Pages
2. ทดสอบ Frontend
3. สร้าง Android app (เพื่อเช็ค ISP-specific แม่นยำ)

---

## 💡 Tips

- **Global check**: ใช้ DoH → ทำงานได้ทันที
- **ISP check**: ต้องใช้ Android app → แม่นยำ 100%
- **Frontend**: แสดงผลลัพธ์จาก Workers (Global + cached ISP results)


## ✅ สิ่งที่แก้ไข

### 1. เพิ่ม `/api/check` endpoint ใน Workers

**ปัญหา:**
- Frontend เป็น static site (ไม่มี API routes)
- พยายามเรียก `/api/check` แต่ไม่มี
- แสดง ERROR ทั้งหมด

**แก้ไข:**
- ✅ เพิ่ม `/api/check` endpoint ใน Workers
- ✅ ใช้ DNS-over-HTTPS (DoH) สำหรับ Global (Google)
- ✅ ใช้ cached results สำหรับ ISP-specific (AIS, True, DTAC, NT)

---

## 🧪 ทดสอบ

### 1. ทดสอบ Global (Google)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "isp": "Global (Google)",
  "status": "ACTIVE",
  "ip": "142.250.191.14",
  "latency": 0,
  "details": "Resolved via Google DoH",
  "dns_server": "8.8.8.8",
  "source": "doh"
}
```

### 2. ทดสอบ ISP-specific (AIS, True, DTAC, NT)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"AIS"}'
```

**ผลลัพธ์:**
- ถ้ามี cached result จาก mobile app → แสดงผลลัพธ์
- ถ้าไม่มี → แสดง ERROR พร้อมข้อความแนะนำให้ใช้ Android app

---

## 🔗 อัพเดท Frontend

### Step 1: อัพเดท Workers URL

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. อัพเดทหรือเพิ่ม:
   - **Variable name:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.snowwhite04-01x.workers.dev`
4. **Save**
5. **Redeploy** (Cloudflare จะ rebuild อัตโนมัติ)

### Step 2: ทดสอบ Frontend

1. เปิด https://monitordns.pages.dev/
2. เพิ่ม domain: `google.com`
3. กด **"RUN FULL SCAN"**

**ผลลัพธ์ที่คาดหวัง:**
- ✅ **Global (Google)**: ACTIVE (ใช้ DoH)
- ⚠️ **AIS, True, DTAC, NT**: ERROR หรือ cached result (ถ้ามี)

---

## ⚠️ ข้อจำกัด

### Workers ไม่สามารถทำ UDP DNS queries ได้

**ทำไม:**
- Cloudflare Workers รันบน Edge network
- ไม่รองรับ UDP sockets
- ไม่สามารถ query ISP DNS servers โดยตรงได้

**วิธีแก้:**
1. ✅ **Global (Google)**: ใช้ DNS-over-HTTPS (DoH) → ทำงานได้
2. ⚠️ **ISP-specific**: ต้องใช้ Android app → เช็คจาก ISP network จริง

---

## 📱 วิธีแก้ไขให้แม่นยำ 100%

### ใช้ Android App

1. สร้าง Android app (ดู `ANDROID_APP_DESIGN.md`)
2. App เช็ค DNS จาก ISP network จริง
3. Sync ผลลัพธ์ไปที่ Workers
4. Frontend แสดงผลลัพธ์จาก Workers

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Global (Google) ทำงานได้แล้ว (ใช้ DoH)
- ⚠️ ISP-specific ต้องใช้ Android app

**Next Steps:**
1. อัพเดท `NEXT_PUBLIC_WORKERS_URL` ใน Pages
2. ทดสอบ Frontend
3. สร้าง Android app (เพื่อเช็ค ISP-specific แม่นยำ)

---

## 💡 Tips

- **Global check**: ใช้ DoH → ทำงานได้ทันที
- **ISP check**: ต้องใช้ Android app → แม่นยำ 100%
- **Frontend**: แสดงผลลัพธ์จาก Workers (Global + cached ISP results)


## ✅ สิ่งที่แก้ไข

### 1. เพิ่ม `/api/check` endpoint ใน Workers

**ปัญหา:**
- Frontend เป็น static site (ไม่มี API routes)
- พยายามเรียก `/api/check` แต่ไม่มี
- แสดง ERROR ทั้งหมด

**แก้ไข:**
- ✅ เพิ่ม `/api/check` endpoint ใน Workers
- ✅ ใช้ DNS-over-HTTPS (DoH) สำหรับ Global (Google)
- ✅ ใช้ cached results สำหรับ ISP-specific (AIS, True, DTAC, NT)

---

## 🧪 ทดสอบ

### 1. ทดสอบ Global (Google)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "isp": "Global (Google)",
  "status": "ACTIVE",
  "ip": "142.250.191.14",
  "latency": 0,
  "details": "Resolved via Google DoH",
  "dns_server": "8.8.8.8",
  "source": "doh"
}
```

### 2. ทดสอบ ISP-specific (AIS, True, DTAC, NT)

**ใช้ curl หรือ PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"hostname":"google.com","isp_name":"AIS"}'
```

**ผลลัพธ์:**
- ถ้ามี cached result จาก mobile app → แสดงผลลัพธ์
- ถ้าไม่มี → แสดง ERROR พร้อมข้อความแนะนำให้ใช้ Android app

---

## 🔗 อัพเดท Frontend

### Step 1: อัพเดท Workers URL

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. อัพเดทหรือเพิ่ม:
   - **Variable name:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.snowwhite04-01x.workers.dev`
4. **Save**
5. **Redeploy** (Cloudflare จะ rebuild อัตโนมัติ)

### Step 2: ทดสอบ Frontend

1. เปิด https://monitordns.pages.dev/
2. เพิ่ม domain: `google.com`
3. กด **"RUN FULL SCAN"**

**ผลลัพธ์ที่คาดหวัง:**
- ✅ **Global (Google)**: ACTIVE (ใช้ DoH)
- ⚠️ **AIS, True, DTAC, NT**: ERROR หรือ cached result (ถ้ามี)

---

## ⚠️ ข้อจำกัด

### Workers ไม่สามารถทำ UDP DNS queries ได้

**ทำไม:**
- Cloudflare Workers รันบน Edge network
- ไม่รองรับ UDP sockets
- ไม่สามารถ query ISP DNS servers โดยตรงได้

**วิธีแก้:**
1. ✅ **Global (Google)**: ใช้ DNS-over-HTTPS (DoH) → ทำงานได้
2. ⚠️ **ISP-specific**: ต้องใช้ Android app → เช็คจาก ISP network จริง

---

## 📱 วิธีแก้ไขให้แม่นยำ 100%

### ใช้ Android App

1. สร้าง Android app (ดู `ANDROID_APP_DESIGN.md`)
2. App เช็ค DNS จาก ISP network จริง
3. Sync ผลลัพธ์ไปที่ Workers
4. Frontend แสดงผลลัพธ์จาก Workers

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Global (Google) ทำงานได้แล้ว (ใช้ DoH)
- ⚠️ ISP-specific ต้องใช้ Android app

**Next Steps:**
1. อัพเดท `NEXT_PUBLIC_WORKERS_URL` ใน Pages
2. ทดสอบ Frontend
3. สร้าง Android app (เพื่อเช็ค ISP-specific แม่นยำ)

---

## 💡 Tips

- **Global check**: ใช้ DoH → ทำงานได้ทันที
- **ISP check**: ต้องใช้ Android app → แม่นยำ 100%
- **Frontend**: แสดงผลลัพธ์จาก Workers (Global + cached ISP results)

