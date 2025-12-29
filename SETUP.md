# 🔧 คู่มือการตั้งค่า (Setup Guide)

## 📍 การเก็บ Token และ Settings

### สำหรับ Local Development (รันในเครื่อง)

1. **เปิดเว็บ:** `http://localhost:5555`
2. **ไปที่ Settings** (แท็บ Settings)
3. **กรอกข้อมูล:**
   - Telegram Bot Token (จาก @BotFather)
   - Telegram Chat ID
   - Check Interval
4. **กด Save Settings**
5. **ระบบจะเก็บใน localStorage** ของเบราว์เซอร์ (จำได้แม้ปิดเบราว์เซอร์)

✅ **ข้อดี:** ง่าย รวดเร็ว ไม่ต้องตั้งค่าอะไรเพิ่ม  
⚠️ **ข้อจำกัด:** เก็บแค่ในเบราว์เซอร์ที่กรอก ถ้าเปิดเบราว์เซอร์อื่นต้องกรอกใหม่

---

## ☁️ สำหรับ Cloudflare Worker (Deploy ขึ้น Cloud)

### วิธีที่ 1: ใช้ Environment Variables (แนะนำ)

1. **ไปที่ Cloudflare Dashboard**
2. **เลือก Workers & Pages**
3. **เลือก Worker ของคุณ**
4. **ไปที่ Settings → Variables and Secrets**
5. **เพิ่ม Environment Variables:**
   ```
   TELEGRAM_BOT_TOKEN = 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_CHAT_ID = -1001234567890
   CHECK_INTERVAL = 1440
   BACKEND_URL = https://your-worker.workers.dev
   ```

6. **Save และ Deploy**

✅ **ข้อดี:** ปลอดภัย ใช้ได้ทุกที่ ไม่ต้องเก็บในโค้ด  
✅ **เหมาะสำหรับ:** Cron Trigger ที่รันอัตโนมัติ

---

### วิธีที่ 2: ใช้ Cloudflare KV (ถ้าต้องการให้แก้ไขผ่าน UI)

1. **สร้าง KV Namespace:**
   ```bash
   wrangler kv:namespace create "SETTINGS"
   ```

2. **เพิ่มใน `wrangler.toml`:**
   ```toml
   [[kv_namespaces]]
   binding = "SETTINGS"
   id = "your-kv-namespace-id"
   ```

3. **ใช้ในโค้ด:**
   ```typescript
   // เก็บ
   await env.SETTINGS.put('telegramBotToken', token);
   
   // อ่าน
   const token = await env.SETTINGS.get('telegramBotToken');
   ```

---

## 🧪 การทดสอบ

### ทดสอบ Token ใน Local:

```bash
# 1. รัน server
npm run dev

# 2. ทดสอบ Telegram
npm run test:telegram YOUR_BOT_TOKEN YOUR_CHAT_ID

# 3. เปิดเว็บและกรอก Token ใน Settings
# 4. ทดสอบ API
npm run test:api google.com
```

### ทดสอบ Token ใน Cloudflare Worker:

1. **ตั้งค่า Environment Variables** (ตามวิธีที่ 1)
2. **Deploy Worker**
3. **ทดสอบ API endpoint:**
   ```bash
   curl -X POST https://your-worker.workers.dev/api/check \
     -H "Content-Type: application/json" \
     -d '{"hostname":"google.com","isp_name":"Global (Google)"}'
   ```

---

## 📝 หมายเหตุ

- **Local Development:** ใช้ localStorage (ง่าย รวดเร็ว)
- **Cloudflare Worker:** ใช้ Environment Variables (ปลอดภัย แนะนำ)
- **ถ้าต้องการให้แก้ไขผ่าน UI:** ใช้ Cloudflare KV
- **Token ต้องเก็บเป็น Secret** ไม่ควร commit ลง Git

---

## 🔐 Security Tips

1. ✅ ใช้ Environment Variables สำหรับ production
2. ✅ อย่า commit Token ลง Git
3. ✅ ใช้ `.gitignore` เพื่อไม่ให้ commit `.env` files
4. ✅ หมั่นเปลี่ยน Token ถ้าถูก leak

