# 🔧 Railway Troubleshooting - 404 Error

## ⚠️ ปัญหา: 404 Not Found

### สาเหตุที่เป็นไปได้:

1. **PORT ไม่ตรง**
   - Railway กำหนด PORT ให้อัตโนมัติ
   - Next.js ต้องใช้ PORT จาก environment variable

2. **Build ไม่สำเร็จ**
   - ตรวจสอบ build logs ใน Railway

3. **Routing ไม่ถูกต้อง**
   - ตรวจสอบว่า Next.js app structure ถูกต้อง

---

## ✅ วิธีแก้ไข

### 1. แก้ไข Start Command

ใน Railway Settings → Deploy → Custom Start Command:
```
npm start
```

**ไม่ต้องระบุ port** - Next.js จะใช้ PORT จาก environment variable อัตโนมัติ

### 2. ตรวจสอบ PORT Variable

ใน Railway Variables:
- `PORT` - Railway จะกำหนดให้อัตโนมัติ (ไม่ต้องตั้งเอง)
- `NODE_ENV=production`

### 3. ตรวจสอบ Build Logs

1. ไปที่ Railway → Deployments
2. ดู build logs
3. ตรวจสอบว่ามี error หรือไม่

---

## 🔍 ตรวจสอบ

### ตรวจสอบว่า App รันอยู่:

1. ไปที่ Railway → Metrics
2. ดู CPU/Memory usage
3. ถ้าไม่มี activity = app ไม่รัน

### ตรวจสอบ Logs:

1. ไปที่ Railway → Deployments
2. คลิก deployment ล่าสุด
3. ดู logs

---

## 📝 Checklist

- [ ] Start command: `npm start` (ไม่ระบุ port)
- [ ] Build command: `npm install && npm run build`
- [ ] PORT variable: Railway กำหนดให้อัตโนมัติ
- [ ] NODE_ENV=production
- [ ] Build สำเร็จ (ไม่มี error)
- [ ] App รันอยู่ (ดู Metrics)

---

## 🚀 Quick Fix

1. **แก้ไข Start Command:**
   - Settings → Deploy → Custom Start Command
   - เปลี่ยนเป็น: `npm start`

2. **Redeploy:**
   - คลิก "Redeploy" หรือ push code ใหม่

3. **ตรวจสอบ:**
   - ดู logs
   - ทดสอบ URL

---

## 💡 หมายเหตุ

- Railway จะกำหนด PORT ให้อัตโนมัติ
- Next.js จะอ่าน PORT จาก `process.env.PORT`
- ไม่ต้อง hardcode port ใน start command

