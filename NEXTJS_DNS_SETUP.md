# ✅ Next.js DNS Checking - เช็ค ISP DNS จริงๆ

## 🎉 สิ่งที่เปลี่ยนแปลง

ตอนนี้ใช้ **Next.js อย่างเดียว** ทั้ง frontend และ backend แล้ว!

### ✅ ข้อดี:
- ✅ ไม่ต้องรัน Python backend server แยก
- ✅ เช็คจาก ISP DNS servers จริงๆ (AIS, True, DTAC, NT)
- ✅ ส่ง UDP DNS query โดยตรง
- ✅ ตรวจจับการบล็อกของ ISP ไทยได้
- ✅ Deploy ง่ายขึ้น (แค่ Next.js)

---

## 🚀 วิธีใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
```

จะติดตั้ง `dns-packet` library อัตโนมัติ

### 2. รัน Next.js Server

```bash
npm run dev
```

Server จะรันที่ `http://localhost:5555`

### 3. ทดสอบ

```bash
# ทดสอบ API
npm run test:api google.com

# ทดสอบ Telegram
npm run test:telegram YOUR_BOT_TOKEN YOUR_CHAT_ID
```

---

## 🔧 วิธีการทำงาน

### API Route (`/api/check`)

1. **รับ request** จาก frontend
2. **ส่ง UDP DNS query** ไป ISP DNS server โดยตรง
3. **Parse response** และส่งผลลัพธ์กลับ
4. **Fallback** ไป Google DoH ถ้า UDP ล้มเหลว

### ISP DNS Servers ที่รองรับ:

- **Global (Google)**: 8.8.8.8
- **AIS**: 202.44.204.34
- **TRUE**: 203.144.206.29
- **DTAC**: 202.44.8.8
- **NT**: 122.155.1.8

---

## 📊 ตัวอย่างผลลัพธ์

```json
{
  "isp": "AIS",
  "status": "ACTIVE",
  "ip": "142.250.191.14",
  "latency": 45,
  "details": "Queried 202.44.204.34 directly",
  "dns_server": "202.44.204.34",
  "source": "udp"
}
```

---

## ⚙️ Configuration

### เปลี่ยน DNS Servers

แก้ไขใน `app/api/check/route.ts`:
```typescript
const ISP_DNS_SERVERS: Record<string, string> = {
  'AIS': 'YOUR_AIS_DNS_IP',
  // ...
};
```

### เปลี่ยน Timeout

แก้ไขใน `app/api/check/route.ts`:
```typescript
await queryDNSServer(hostname, dnsServer, 5000); // 5 seconds
```

---

## 🌐 Deploy

### Vercel

```bash
vercel deploy
```

**หมายเหตุ:** Vercel Serverless Functions รองรับ UDP แต่ต้องตรวจสอบว่า platform รองรับ

### Railway/Render

1. Upload code ไป repository
2. Deploy บน platform
3. ตั้งค่า environment variables (ถ้ามี)

### Self-hosted

```bash
npm run build
npm start
```

---

## ⚠️ ข้อจำกัด

### Cloudflare Workers
- ❌ **ไม่รองรับ** - Cloudflare Workers ไม่สามารถส่ง UDP packets ได้
- 💡 **ทางเลือก:** ใช้ Vercel, Railway, หรือ self-hosted

### Vercel Edge Functions
- ❌ **ไม่รองรับ** - Edge Functions ไม่รองรับ UDP
- ✅ **ใช้ Node.js Runtime** แทน (ซึ่งรองรับ)

---

## 🐛 Troubleshooting

### DNS query timeout

- ตรวจสอบว่า DNS server IP ถูกต้อง
- ตรวจสอบ network connectivity
- เพิ่ม timeout ใน code

### UDP socket errors

- ตรวจสอบว่า platform รองรับ UDP
- ตรวจสอบ firewall settings

### Fallback to DoH

ถ้าเห็น `source: 'doh'` แสดงว่า UDP query ล้มเหลว และใช้ Google DoH แทน

---

## 📝 สรุป

✅ **ใช้ Next.js อย่างเดียว** - ไม่ต้องรัน backend แยก  
✅ **เช็ค ISP DNS จริงๆ** - ตรวจจับการบล็อกได้  
✅ **Deploy ง่าย** - แค่ deploy Next.js app  

---

## 🎯 Next Steps

1. ✅ ติดตั้ง dependencies: `npm install`
2. ✅ รัน server: `npm run dev`
3. ✅ ทดสอบ: `npm run test:api google.com`
4. ✅ ตั้งค่า Telegram Bot Token ใน Settings
5. ✅ Deploy เมื่อพร้อมใช้งาน

