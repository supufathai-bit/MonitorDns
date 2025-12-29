# 🧪 ทดสอบระบบที่ Deploy แล้ว

## ✅ สถานะ

- ✅ Frontend: https://monitordns.pages.dev/
- ✅ Workers: https://monitordnswoker.snowwhite04-01x.workers.dev

---

## 🧪 ทดสอบ Workers API

### 1. Test Get Domains

**เปิดใน browser หรือใช้ curl:**
```
https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync/domains
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "domains": ["ufathai.win", "ufathai.com", "www.zec777.com"],
  "interval": 3600000,
  "message": "Domains to check"
}
```

### 2. Test Mobile Sync (POST)

**ใช้ curl หรือ Postman:**
```bash
curl -X POST https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-123",
    "device_info": {
      "isp": "AIS",
      "network_type": "WiFi"
    },
    "results": [
      {
        "hostname": "ufathai.win",
        "isp_name": "AIS",
        "status": "BLOCKED",
        "ip": "",
        "timestamp": 1703846400000,
        "latency": 0
      }
    ]
  }'
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "message": "Received 1 results from device test-device-123",
  "processed": 1,
  "timestamp": 1703846400000
}
```

### 3. Test Get Results

**เปิดใน browser:**
```
https://monitordnswoker.snowwhite04-01x.workers.dev/api/results
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "results": [
    {
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "device_id": "test-device-123",
      "timestamp": 1703846400000
    }
  ],
  "count": 1
}
```

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### Step 1: เพิ่ม Environment Variable ใน Pages

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. เพิ่ม:
   - **Variable name:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://monitordnswoker.snowwhite04-01x.workers.dev`
4. **Save**
5. **Redeploy** (Cloudflare จะ rebuild อัตโนมัติ)

### Step 2: ตรวจสอบ Frontend

1. เปิด https://monitordns.pages.dev/
2. ควรเห็นหน้าเว็บปกติ
3. เพิ่ม domain และทดสอบ

---

## 📱 ทดสอบ Frontend

### 1. เปิดเว็บ

เปิด: https://monitordns.pages.dev/

**ควรเห็น:**
- Dashboard
- Form สำหรับเพิ่ม domain
- Status Control section

### 2. เพิ่ม Domain

1. ใส่ domain: `ufathai.win`
2. กดปุ่ม **+**
3. Domain ควรถูกเพิ่ม

### 3. Run Check

1. กดปุ่ม **"RUN FULL SCAN"**
2. ดูผลลัพธ์

**หมายเหตุ:** ตอนนี้ DNS check อาจไม่ทำงานเพราะ:
- Frontend เป็น static site (ไม่มี API routes)
- ต้องใช้ Workers API หรือ Android app

---

## 📱 ทดสอบ Android App (เมื่อสร้างเสร็จ)

### 1. ตั้งค่า Server URL

ใน Android app Settings:
- Server URL: `https://monitordnswoker.snowwhite04-01x.workers.dev`

### 2. เช็ค DNS

1. เปิด app
2. กด **"Check Now"**
3. App จะเช็ค DNS จาก ISP จริง

### 3. Sync Results

1. App จะส่งผลลัพธ์ไปที่ Workers API
2. ตรวจสอบใน Workers → Logs

---

## ✅ Checklist

### Workers API
- [ ] Test `/api/mobile-sync/domains` - ควรได้ domains list
- [ ] Test `/api/mobile-sync` (POST) - ควรรับข้อมูลสำเร็จ
- [ ] Test `/api/results` - ควรได้ results

### Frontend
- [ ] เปิดเว็บได้
- [ ] เพิ่ม domain ได้
- [ ] UI แสดงผลปกติ

### Integration
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Frontend เชื่อมต่อ Workers ได้

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Workers API ทำงานแล้ว
- ✅ Frontend ทำงานแล้ว
- ⏳ ต้องเชื่อมต่อ Frontend กับ Workers
- ⏳ ต้องสร้าง Android app

**Next Steps:**
1. เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
2. Test Frontend
3. สร้าง Android app

---

## 💡 Tips

- **Workers URL:** ใช้สำหรับ Android app และ Frontend
- **Frontend:** แสดงผลลัพธ์จาก Workers
- **Android App:** เช็ค DNS และ sync กับ Workers

