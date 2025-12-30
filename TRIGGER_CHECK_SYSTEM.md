# 🚀 Trigger Check System - Frontend สั่ง Mobile App เช็ค DNS

## 🎯 เป้าหมาย

เมื่อกด **"RUN FULL SCAN"** ในหน้าเว็บ:
1. Frontend ส่งคำสั่งไปที่ Workers API
2. Workers API เก็บ trigger flag
3. Mobile App polling Workers API
4. Mobile App เห็น trigger → เช็ค DNS จาก ISP จริง
5. Mobile App sync ผลลัพธ์กลับไปที่ Workers
6. Frontend polling Workers → ได้ผลลัพธ์ใหม่ → แสดงผล

---

## 🔄 Flow การทำงาน

### 1. Frontend กด "RUN FULL SCAN"
```
Frontend
  ↓ POST /api/trigger-check
Workers API
  ↓ เก็บ trigger flag ใน KV (expires 5 นาที)
  ↓ Return success
```

### 2. Mobile App Polling
```
Mobile App (Background Service)
  ↓ GET /api/trigger-check (ทุก 10-30 วินาที)
Workers API
  ↓ ตรวจสอบ trigger flag
  ↓ Return { triggered: true } ถ้ามี
Mobile App
  ↓ เห็น triggered = true
  ↓ เช็ค DNS จาก ISP จริง
  ↓ POST /api/mobile-sync (sync ผลลัพธ์)
```

### 3. Frontend Polling Results
```
Frontend
  ↓ GET /api/results (ทุก 2 วินาที, max 30 วินาที)
Workers API
  ↓ ส่งผลลัพธ์จาก Mobile App
Frontend
  ↓ ตรวจสอบว่า results ใหม่กว่า trigger time
  ↓ แสดงผลลัพธ์
```

---

## 📡 API Endpoints

### 1. POST /api/trigger-check
**สำหรับ:** Frontend สั่ง Mobile App เช็ค DNS

**Request:**
```json
POST /api/trigger-check
```

**Response:**
```json
{
  "success": true,
  "message": "Check triggered. Mobile app will check DNS soon.",
  "timestamp": 1703846400000
}
```

### 2. GET /api/trigger-check
**สำหรับ:** Mobile App ตรวจสอบว่ามีคำสั่งให้เช็คหรือไม่

**Response (ถ้ามี trigger):**
```json
{
  "success": true,
  "triggered": true,
  "timestamp": 1703846400000,
  "requested_by": "frontend"
}
```

**Response (ถ้าไม่มี trigger):**
```json
{
  "success": true,
  "triggered": false
}
```

---

## 📱 Mobile App Implementation

### 1. Background Service Polling

```kotlin
// ใน BackgroundService หรือ WorkManager
suspend fun checkTrigger() {
    val response = apiClient.getTriggerCheck()
    if (response.triggered) {
        // เช็ค DNS
        checkAllDomains()
        // Sync ผลลัพธ์
        syncResults()
    }
}

// Polling ทุก 10-30 วินาที
```

### 2. เมื่อเห็น Trigger

```kotlin
if (triggered) {
    // 1. ดึง domains จาก Workers
    val domains = apiClient.getDomains()
    
    // 2. เช็ค DNS จาก ISP จริง
    val results = domains.domains.map { domain ->
        dnsCheckService.checkDNS(domain)
    }
    
    // 3. Sync ผลลัพธ์กลับไปที่ Workers
    apiClient.syncResults(results)
}
```

---

## 🧪 ทดสอบ

### 1. ทดสอบ Trigger

**Frontend:**
1. เปิด https://monitordns.pages.dev/
2. กด **"RUN FULL SCAN"**
3. ดู Logs → ควรเห็น:
   - "Requesting mobile app to check DNS..."
   - "Mobile app check triggered. Waiting for results..."

**Workers API:**
```
GET https://monitordnswoker.snowwhite04-01x.workers.dev/api/trigger-check
```

**ควรเห็น:** `{ "triggered": true }`

### 2. ทดสอบ Mobile App

1. เปิด Android app
2. App จะ polling Workers API
3. App เห็น trigger → เช็ค DNS
4. App sync ผลลัพธ์กลับไปที่ Workers

### 3. ทดสอบ Frontend Polling

1. Frontend จะ polling Workers API ทุก 2 วินาที
2. เมื่อได้ผลลัพธ์ใหม่ → แสดงผล
3. ดู Logs → ควรเห็น:
   - "Loaded X results from mobile app"
   - "Scan complete."

---

## ⚙️ Configuration

### Trigger Expiration
- Trigger flag expires ใน **5 นาที**
- ถ้า Mobile App ไม่เช็คภายใน 5 นาที → trigger หายไป

### Frontend Polling
- Polling ทุก **2 วินาที**
- Maximum **15 attempts** (30 วินาที)
- ถ้าไม่มีผลลัพธ์ใหม่ → timeout

### Mobile App Polling
- Polling ทุก **10-30 วินาที** (ขึ้นอยู่กับ app)
- ตรวจสอบ trigger flag
- เช็ค DNS เมื่อเห็น trigger

---

## 💡 Tips

### 1. Mobile App ควร Polling บ่อยแค่ไหน?

**แนะนำ:**
- **Background Service:** ทุก 10-30 วินาที
- **Foreground:** ทุก 5-10 วินาที
- **เมื่อเปิด app:** เช็คทันที

### 2. Frontend Timeout

**ถ้า Mobile App ไม่ตอบสนอง:**
- Frontend จะ timeout หลังจาก 30 วินาที
- แสดง error message
- แนะนำให้เช็คจาก Mobile App โดยตรง

### 3. Multiple Devices

**ถ้ามีหลาย Mobile Apps:**
- ทุก app จะเห็น trigger เดียวกัน
- App แรกที่เช็ค → sync ผลลัพธ์
- Frontend จะได้ผลลัพธ์จาก app แรก

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Frontend สั่ง Mobile App เช็ค DNS ได้
- ✅ Mobile App polling trigger flag
- ✅ Frontend polling results
- ✅ แสดงผลลัพธ์จาก Mobile App

**Next:**
- Mobile App ต้อง implement polling trigger
- Mobile App ต้องเช็ค DNS เมื่อเห็น trigger
- Mobile App ต้อง sync ผลลัพธ์กลับไปที่ Workers

**ระบบพร้อมแล้ว!** 🎉

