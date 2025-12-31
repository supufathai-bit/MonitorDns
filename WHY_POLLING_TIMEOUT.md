# ⏱️ ทำไม Frontend Polling Timeout?

## ❌ ปัญหา

เมื่อกด "RUN FULL SCAN":
- Frontend ส่ง trigger ไปที่ Workers API ✅
- Frontend polling รอผลลัพธ์ (ทุก 2 วินาที, max 30 วินาที) ✅
- แต่ Mobile App **ไม่ได้ polling trigger อัตโนมัติ** ❌
- Frontend timeout หลัง 30 วินาที
- ต้องกด "CHECK NOW" ในแอพเอง

---

## 🔍 สาเหตุ

**Mobile App ยังไม่ได้ implement trigger polling**

### Flow ที่ควรเป็น:

```
1. Frontend
   ↓ POST /api/trigger-check
2. Workers API
   ↓ เก็บ trigger flag ใน KV
3. Mobile App (Background Service)
   ↓ GET /api/trigger-check (polling ทุก 30 วินาที) ← ยังไม่มี!
   ↓ เห็น triggered = true
   ↓ GET /api/mobile-sync/domains
   ↓ เช็ค DNS จาก ISP จริง
   ↓ POST /api/mobile-sync (sync ผลลัพธ์)
4. Workers API
   ↓ เก็บผลลัพธ์ใน KV
   ↓ Clear trigger flag
5. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ เห็นผลลัพธ์ใหม่ (timestamp >= trigger timestamp)
   ↓ แสดงผลลัพธ์
```

### Flow ที่เป็นอยู่ตอนนี้:

```
1. Frontend
   ↓ POST /api/trigger-check ✅
2. Workers API
   ↓ เก็บ trigger flag ใน KV ✅
3. Mobile App
   ↓ ไม่ได้ polling trigger ❌
   ↓ ผู้ใช้ต้องกด "CHECK NOW" เอง
4. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ ไม่เห็นผลลัพธ์ใหม่
   ↓ Timeout หลัง 30 วินาที ❌
```

---

## ✅ วิธีแก้ไข

### Mobile App ต้อง implement:

1. **Background Service หรือ WorkManager**
   - Polling `/api/trigger-check` ทุก 30 วินาที
   - เช็ค DNS เมื่อเห็น trigger
   - Sync ผลลัพธ์กลับไปที่ Workers

2. **ดูคู่มือ:**
   - `MOBILE_APP_TRIGGER_IMPLEMENTATION.md` - Implementation guide
   - `ANDROID_APP_DESIGN.md` - Architecture และ code examples

---

## 🔧 Frontend Timeout Settings

### Current Settings:
- **Polling interval:** ทุก 2 วินาที
- **Max attempts:** 15 ครั้ง
- **Total timeout:** 30 วินาที (15 × 2 = 30)

### ถ้าต้องการเพิ่ม timeout:
- เพิ่ม `maxAttempts` ใน `runAllChecks`
- หรือเพิ่ม polling interval

---

## 💡 Tips

### 1. Debug Trigger

**ตรวจสอบว่า trigger ถูกตั้งค่าหรือไม่:**
```javascript
// เปิด Console (F12)
fetch('https://monitordnswoker.snowwhite04-01x.workers.dev/api/trigger-check')
  .then(r => r.json())
  .then(console.log);
```

**ควรเห็น:**
```json
{
  "success": true,
  "triggered": true,
  "timestamp": 1767075508125
}
```

### 2. ตรวจสอบ Mobile App

**Mobile App ต้อง:**
- ✅ Polling `/api/trigger-check` ทุก 30 วินาที
- ✅ เช็ค DNS เมื่อเห็น trigger
- ✅ Sync ผลลัพธ์กลับไปที่ Workers

**ถ้ายังไม่ได้ implement:**
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`
- หรือใช้ "CHECK NOW" ในแอพเอง

---

## 🎯 Checklist

- [ ] Mobile App polling `/api/trigger-check` ทุก 30 วินาที
- [ ] Mobile App เช็ค DNS เมื่อเห็น trigger
- [ ] Mobile App sync ผลลัพธ์กลับไปที่ Workers
- [ ] Frontend เห็นผลลัพธ์ใหม่ภายใน 30 วินาที

---

## 🎉 สรุป

**ปัญหาคือ:**
- Mobile App ยังไม่ได้ polling trigger อัตโนมัติ
- Frontend timeout หลัง 30 วินาที

**วิธีแก้ไข:**
- Mobile App ต้อง implement trigger polling
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`

**ตอนนี้:**
- Frontend ทำงานถูกต้อง
- Mobile App ต้อง implement trigger polling

**Next:**
- Mobile App developer ต้อง implement trigger polling
- หรือใช้ "CHECK NOW" ในแอพเอง


## ❌ ปัญหา

เมื่อกด "RUN FULL SCAN":
- Frontend ส่ง trigger ไปที่ Workers API ✅
- Frontend polling รอผลลัพธ์ (ทุก 2 วินาที, max 30 วินาที) ✅
- แต่ Mobile App **ไม่ได้ polling trigger อัตโนมัติ** ❌
- Frontend timeout หลัง 30 วินาที
- ต้องกด "CHECK NOW" ในแอพเอง

---

## 🔍 สาเหตุ

**Mobile App ยังไม่ได้ implement trigger polling**

### Flow ที่ควรเป็น:

```
1. Frontend
   ↓ POST /api/trigger-check
2. Workers API
   ↓ เก็บ trigger flag ใน KV
3. Mobile App (Background Service)
   ↓ GET /api/trigger-check (polling ทุก 30 วินาที) ← ยังไม่มี!
   ↓ เห็น triggered = true
   ↓ GET /api/mobile-sync/domains
   ↓ เช็ค DNS จาก ISP จริง
   ↓ POST /api/mobile-sync (sync ผลลัพธ์)
4. Workers API
   ↓ เก็บผลลัพธ์ใน KV
   ↓ Clear trigger flag
5. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ เห็นผลลัพธ์ใหม่ (timestamp >= trigger timestamp)
   ↓ แสดงผลลัพธ์
```

### Flow ที่เป็นอยู่ตอนนี้:

```
1. Frontend
   ↓ POST /api/trigger-check ✅
2. Workers API
   ↓ เก็บ trigger flag ใน KV ✅
3. Mobile App
   ↓ ไม่ได้ polling trigger ❌
   ↓ ผู้ใช้ต้องกด "CHECK NOW" เอง
4. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ ไม่เห็นผลลัพธ์ใหม่
   ↓ Timeout หลัง 30 วินาที ❌
```

---

## ✅ วิธีแก้ไข

### Mobile App ต้อง implement:

1. **Background Service หรือ WorkManager**
   - Polling `/api/trigger-check` ทุก 30 วินาที
   - เช็ค DNS เมื่อเห็น trigger
   - Sync ผลลัพธ์กลับไปที่ Workers

2. **ดูคู่มือ:**
   - `MOBILE_APP_TRIGGER_IMPLEMENTATION.md` - Implementation guide
   - `ANDROID_APP_DESIGN.md` - Architecture และ code examples

---

## 🔧 Frontend Timeout Settings

### Current Settings:
- **Polling interval:** ทุก 2 วินาที
- **Max attempts:** 15 ครั้ง
- **Total timeout:** 30 วินาที (15 × 2 = 30)

### ถ้าต้องการเพิ่ม timeout:
- เพิ่ม `maxAttempts` ใน `runAllChecks`
- หรือเพิ่ม polling interval

---

## 💡 Tips

### 1. Debug Trigger

**ตรวจสอบว่า trigger ถูกตั้งค่าหรือไม่:**
```javascript
// เปิด Console (F12)
fetch('https://monitordnswoker.snowwhite04-01x.workers.dev/api/trigger-check')
  .then(r => r.json())
  .then(console.log);
```

**ควรเห็น:**
```json
{
  "success": true,
  "triggered": true,
  "timestamp": 1767075508125
}
```

### 2. ตรวจสอบ Mobile App

**Mobile App ต้อง:**
- ✅ Polling `/api/trigger-check` ทุก 30 วินาที
- ✅ เช็ค DNS เมื่อเห็น trigger
- ✅ Sync ผลลัพธ์กลับไปที่ Workers

**ถ้ายังไม่ได้ implement:**
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`
- หรือใช้ "CHECK NOW" ในแอพเอง

---

## 🎯 Checklist

- [ ] Mobile App polling `/api/trigger-check` ทุก 30 วินาที
- [ ] Mobile App เช็ค DNS เมื่อเห็น trigger
- [ ] Mobile App sync ผลลัพธ์กลับไปที่ Workers
- [ ] Frontend เห็นผลลัพธ์ใหม่ภายใน 30 วินาที

---

## 🎉 สรุป

**ปัญหาคือ:**
- Mobile App ยังไม่ได้ polling trigger อัตโนมัติ
- Frontend timeout หลัง 30 วินาที

**วิธีแก้ไข:**
- Mobile App ต้อง implement trigger polling
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`

**ตอนนี้:**
- Frontend ทำงานถูกต้อง
- Mobile App ต้อง implement trigger polling

**Next:**
- Mobile App developer ต้อง implement trigger polling
- หรือใช้ "CHECK NOW" ในแอพเอง


## ❌ ปัญหา

เมื่อกด "RUN FULL SCAN":
- Frontend ส่ง trigger ไปที่ Workers API ✅
- Frontend polling รอผลลัพธ์ (ทุก 2 วินาที, max 30 วินาที) ✅
- แต่ Mobile App **ไม่ได้ polling trigger อัตโนมัติ** ❌
- Frontend timeout หลัง 30 วินาที
- ต้องกด "CHECK NOW" ในแอพเอง

---

## 🔍 สาเหตุ

**Mobile App ยังไม่ได้ implement trigger polling**

### Flow ที่ควรเป็น:

```
1. Frontend
   ↓ POST /api/trigger-check
2. Workers API
   ↓ เก็บ trigger flag ใน KV
3. Mobile App (Background Service)
   ↓ GET /api/trigger-check (polling ทุก 30 วินาที) ← ยังไม่มี!
   ↓ เห็น triggered = true
   ↓ GET /api/mobile-sync/domains
   ↓ เช็ค DNS จาก ISP จริง
   ↓ POST /api/mobile-sync (sync ผลลัพธ์)
4. Workers API
   ↓ เก็บผลลัพธ์ใน KV
   ↓ Clear trigger flag
5. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ เห็นผลลัพธ์ใหม่ (timestamp >= trigger timestamp)
   ↓ แสดงผลลัพธ์
```

### Flow ที่เป็นอยู่ตอนนี้:

```
1. Frontend
   ↓ POST /api/trigger-check ✅
2. Workers API
   ↓ เก็บ trigger flag ใน KV ✅
3. Mobile App
   ↓ ไม่ได้ polling trigger ❌
   ↓ ผู้ใช้ต้องกด "CHECK NOW" เอง
4. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ ไม่เห็นผลลัพธ์ใหม่
   ↓ Timeout หลัง 30 วินาที ❌
```

---

## ✅ วิธีแก้ไข

### Mobile App ต้อง implement:

1. **Background Service หรือ WorkManager**
   - Polling `/api/trigger-check` ทุก 30 วินาที
   - เช็ค DNS เมื่อเห็น trigger
   - Sync ผลลัพธ์กลับไปที่ Workers

2. **ดูคู่มือ:**
   - `MOBILE_APP_TRIGGER_IMPLEMENTATION.md` - Implementation guide
   - `ANDROID_APP_DESIGN.md` - Architecture และ code examples

---

## 🔧 Frontend Timeout Settings

### Current Settings:
- **Polling interval:** ทุก 2 วินาที
- **Max attempts:** 15 ครั้ง
- **Total timeout:** 30 วินาที (15 × 2 = 30)

### ถ้าต้องการเพิ่ม timeout:
- เพิ่ม `maxAttempts` ใน `runAllChecks`
- หรือเพิ่ม polling interval

---

## 💡 Tips

### 1. Debug Trigger

**ตรวจสอบว่า trigger ถูกตั้งค่าหรือไม่:**
```javascript
// เปิด Console (F12)
fetch('https://monitordnswoker.snowwhite04-01x.workers.dev/api/trigger-check')
  .then(r => r.json())
  .then(console.log);
```

**ควรเห็น:**
```json
{
  "success": true,
  "triggered": true,
  "timestamp": 1767075508125
}
```

### 2. ตรวจสอบ Mobile App

**Mobile App ต้อง:**
- ✅ Polling `/api/trigger-check` ทุก 30 วินาที
- ✅ เช็ค DNS เมื่อเห็น trigger
- ✅ Sync ผลลัพธ์กลับไปที่ Workers

**ถ้ายังไม่ได้ implement:**
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`
- หรือใช้ "CHECK NOW" ในแอพเอง

---

## 🎯 Checklist

- [ ] Mobile App polling `/api/trigger-check` ทุก 30 วินาที
- [ ] Mobile App เช็ค DNS เมื่อเห็น trigger
- [ ] Mobile App sync ผลลัพธ์กลับไปที่ Workers
- [ ] Frontend เห็นผลลัพธ์ใหม่ภายใน 30 วินาที

---

## 🎉 สรุป

**ปัญหาคือ:**
- Mobile App ยังไม่ได้ polling trigger อัตโนมัติ
- Frontend timeout หลัง 30 วินาที

**วิธีแก้ไข:**
- Mobile App ต้อง implement trigger polling
- ดู `MOBILE_APP_TRIGGER_IMPLEMENTATION.md`

**ตอนนี้:**
- Frontend ทำงานถูกต้อง
- Mobile App ต้อง implement trigger polling

**Next:**
- Mobile App developer ต้อง implement trigger polling
- หรือใช้ "CHECK NOW" ในแอพเอง

