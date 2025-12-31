# ✅ Deployment สำเร็จ!

## 🎉 URL ที่ได้:

**Production URL:** https://sentinel-dns-monitor-production.up.railway.app

---

## 🧪 ทดสอบ

### 1. ทดสอบ Frontend:
เปิดเบราว์เซอร์ไปที่:
```
https://sentinel-dns-monitor-production.up.railway.app
```

### 2. ทดสอบ API:
```bash
# ทดสอบ DNS check
curl -X POST https://sentinel-dns-monitor-production.up.railway.app/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

### 3. ทดสอบจาก Local:
```bash
# อัปเดต test script
node test-api.js google.com https://sentinel-dns-monitor-production.up.railway.app
```

---

## ⚙️ ตั้งค่า

### 1. ตั้งค่า Telegram Bot:
1. เปิดเว็บ: https://sentinel-dns-monitor-production.up.railway.app
2. ไปที่ **Settings**
3. กรอก:
   - Telegram Bot Token
   - Telegram Chat ID
4. Save Settings

### 2. เพิ่ม Domains:
1. ไปที่ **Dashboard**
2. เพิ่ม domain ที่ต้องการ monitor
3. กด **RUN FULL SCAN**

---

## 📊 ตรวจสอบ Status

### ใน Railway Dashboard:
- **Deployments** - ดู deployment history
- **Metrics** - ดู CPU/Memory usage
- **Logs** - ดู application logs
- **Variables** - ดู environment variables

---

## 🔧 Environment Variables

### ที่ตั้งค่าแล้ว:
- `PORT` - Railway กำหนดให้อัตโนมัติ
- `NODE_ENV=production`

### ที่อาจต้องเพิ่ม (ถ้าต้องการ):
- `TELEGRAM_BOT_TOKEN` - สำหรับ default bot token
- `TELEGRAM_CHAT_ID` - สำหรับ default chat ID

---

## 🎯 Next Steps

1. ✅ **ทดสอบ Frontend** - เปิด URL ในเบราว์เซอร์
2. ✅ **ทดสอบ API** - ใช้ curl หรือ test script
3. ✅ **ตั้งค่า Telegram** - ใน Settings panel
4. ✅ **เพิ่ม Domains** - ใน Dashboard
5. ✅ **ทดสอบ DNS Check** - กด RUN FULL SCAN

---

## 🐛 Troubleshooting

### ถ้าได้ 404:
- ตรวจสอบ build logs
- ตรวจสอบว่า deployment สำเร็จ
- ลองรอสักครู่แล้ว refresh

### ถ้า API ไม่ทำงาน:
- ตรวจสอบ logs ใน Railway
- ตรวจสอบว่า PORT ถูกต้อง
- ตรวจสอบว่า build สำเร็จ

---

## 📝 สรุป

✅ **Deploy สำเร็จ!**  
✅ **URL:** https://sentinel-dns-monitor-production.up.railway.app  
✅ **พร้อมใช้งาน!**

---

## 🔗 Links

- **Railway Dashboard:** https://railway.app
- **GitHub Repository:** https://github.com/supufathai-bit/MonitorDns
- **Production URL:** https://sentinel-dns-monitor-production.up.railway.app


## 🎉 URL ที่ได้:

**Production URL:** https://sentinel-dns-monitor-production.up.railway.app

---

## 🧪 ทดสอบ

### 1. ทดสอบ Frontend:
เปิดเบราว์เซอร์ไปที่:
```
https://sentinel-dns-monitor-production.up.railway.app
```

### 2. ทดสอบ API:
```bash
# ทดสอบ DNS check
curl -X POST https://sentinel-dns-monitor-production.up.railway.app/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

### 3. ทดสอบจาก Local:
```bash
# อัปเดต test script
node test-api.js google.com https://sentinel-dns-monitor-production.up.railway.app
```

---

## ⚙️ ตั้งค่า

### 1. ตั้งค่า Telegram Bot:
1. เปิดเว็บ: https://sentinel-dns-monitor-production.up.railway.app
2. ไปที่ **Settings**
3. กรอก:
   - Telegram Bot Token
   - Telegram Chat ID
4. Save Settings

### 2. เพิ่ม Domains:
1. ไปที่ **Dashboard**
2. เพิ่ม domain ที่ต้องการ monitor
3. กด **RUN FULL SCAN**

---

## 📊 ตรวจสอบ Status

### ใน Railway Dashboard:
- **Deployments** - ดู deployment history
- **Metrics** - ดู CPU/Memory usage
- **Logs** - ดู application logs
- **Variables** - ดู environment variables

---

## 🔧 Environment Variables

### ที่ตั้งค่าแล้ว:
- `PORT` - Railway กำหนดให้อัตโนมัติ
- `NODE_ENV=production`

### ที่อาจต้องเพิ่ม (ถ้าต้องการ):
- `TELEGRAM_BOT_TOKEN` - สำหรับ default bot token
- `TELEGRAM_CHAT_ID` - สำหรับ default chat ID

---

## 🎯 Next Steps

1. ✅ **ทดสอบ Frontend** - เปิด URL ในเบราว์เซอร์
2. ✅ **ทดสอบ API** - ใช้ curl หรือ test script
3. ✅ **ตั้งค่า Telegram** - ใน Settings panel
4. ✅ **เพิ่ม Domains** - ใน Dashboard
5. ✅ **ทดสอบ DNS Check** - กด RUN FULL SCAN

---

## 🐛 Troubleshooting

### ถ้าได้ 404:
- ตรวจสอบ build logs
- ตรวจสอบว่า deployment สำเร็จ
- ลองรอสักครู่แล้ว refresh

### ถ้า API ไม่ทำงาน:
- ตรวจสอบ logs ใน Railway
- ตรวจสอบว่า PORT ถูกต้อง
- ตรวจสอบว่า build สำเร็จ

---

## 📝 สรุป

✅ **Deploy สำเร็จ!**  
✅ **URL:** https://sentinel-dns-monitor-production.up.railway.app  
✅ **พร้อมใช้งาน!**

---

## 🔗 Links

- **Railway Dashboard:** https://railway.app
- **GitHub Repository:** https://github.com/supufathai-bit/MonitorDns
- **Production URL:** https://sentinel-dns-monitor-production.up.railway.app


## 🎉 URL ที่ได้:

**Production URL:** https://sentinel-dns-monitor-production.up.railway.app

---

## 🧪 ทดสอบ

### 1. ทดสอบ Frontend:
เปิดเบราว์เซอร์ไปที่:
```
https://sentinel-dns-monitor-production.up.railway.app
```

### 2. ทดสอบ API:
```bash
# ทดสอบ DNS check
curl -X POST https://sentinel-dns-monitor-production.up.railway.app/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"google.com","isp_name":"Global (Google)"}'
```

### 3. ทดสอบจาก Local:
```bash
# อัปเดต test script
node test-api.js google.com https://sentinel-dns-monitor-production.up.railway.app
```

---

## ⚙️ ตั้งค่า

### 1. ตั้งค่า Telegram Bot:
1. เปิดเว็บ: https://sentinel-dns-monitor-production.up.railway.app
2. ไปที่ **Settings**
3. กรอก:
   - Telegram Bot Token
   - Telegram Chat ID
4. Save Settings

### 2. เพิ่ม Domains:
1. ไปที่ **Dashboard**
2. เพิ่ม domain ที่ต้องการ monitor
3. กด **RUN FULL SCAN**

---

## 📊 ตรวจสอบ Status

### ใน Railway Dashboard:
- **Deployments** - ดู deployment history
- **Metrics** - ดู CPU/Memory usage
- **Logs** - ดู application logs
- **Variables** - ดู environment variables

---

## 🔧 Environment Variables

### ที่ตั้งค่าแล้ว:
- `PORT` - Railway กำหนดให้อัตโนมัติ
- `NODE_ENV=production`

### ที่อาจต้องเพิ่ม (ถ้าต้องการ):
- `TELEGRAM_BOT_TOKEN` - สำหรับ default bot token
- `TELEGRAM_CHAT_ID` - สำหรับ default chat ID

---

## 🎯 Next Steps

1. ✅ **ทดสอบ Frontend** - เปิด URL ในเบราว์เซอร์
2. ✅ **ทดสอบ API** - ใช้ curl หรือ test script
3. ✅ **ตั้งค่า Telegram** - ใน Settings panel
4. ✅ **เพิ่ม Domains** - ใน Dashboard
5. ✅ **ทดสอบ DNS Check** - กด RUN FULL SCAN

---

## 🐛 Troubleshooting

### ถ้าได้ 404:
- ตรวจสอบ build logs
- ตรวจสอบว่า deployment สำเร็จ
- ลองรอสักครู่แล้ว refresh

### ถ้า API ไม่ทำงาน:
- ตรวจสอบ logs ใน Railway
- ตรวจสอบว่า PORT ถูกต้อง
- ตรวจสอบว่า build สำเร็จ

---

## 📝 สรุป

✅ **Deploy สำเร็จ!**  
✅ **URL:** https://sentinel-dns-monitor-production.up.railway.app  
✅ **พร้อมใช้งาน!**

---

## 🔗 Links

- **Railway Dashboard:** https://railway.app
- **GitHub Repository:** https://github.com/supufathai-bit/MonitorDns
- **Production URL:** https://sentinel-dns-monitor-production.up.railway.app

