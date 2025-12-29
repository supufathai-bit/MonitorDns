# 🚀 คู่มือการ Deploy

## ⚠️ ข้อจำกัดของ Cloudflare Workers

**Cloudflare Workers/Pages ไม่สามารถเช็ค ISP DNS ได้แม่นยำ** เพราะ:
- ❌ ไม่รองรับ UDP sockets (`dgram`)
- ❌ เช็คจาก external IP (ไม่ใช่ ISP network)
- ❌ ISP DNS servers มักไม่ตอบกลับ external queries

---

## ✅ วิธีแก้ไขที่ถูกต้อง

### ทางเลือกที่ 1: Deploy บน VPS ที่ใช้ ISP Network (แนะนำ)

**Deploy Next.js บน VPS ที่ใช้ ISP network:**

#### ตัวอย่าง:
- **VPS ที่ใช้ AIS network** → เช็ค AIS DNS ได้แม่นยำ
- **VPS ที่ใช้ DTAC network** → เช็ค DTAC DNS ได้แม่นยำ
- **VPS ที่ใช้ True network** → เช็ค True DNS ได้แม่นยำ

#### Platforms ที่รองรับ:
- **DigitalOcean** - เลือก datacenter ในไทย
- **Linode** - เลือก datacenter ในไทย
- **Vultr** - เลือก datacenter ในไทย
- **AWS/GCP** - เลือก region ในไทย

#### วิธี Deploy:

```bash
# 1. Build Next.js app
npm run build

# 2. Upload ไป VPS
scp -r .next package.json node_modules user@your-vps:/path/to/app

# 3. SSH เข้า VPS
ssh user@your-vps

# 4. Install dependencies (ถ้ายังไม่มี)
npm install --production

# 5. รันด้วย PM2 หรือ systemd
pm2 start npm --name "dns-monitor" -- start
# หรือ
npm start
```

---

### ทางเลือกที่ 2: ใช้ External DNS Resolver Service

**สร้าง DNS resolver service แยก:**

1. **Deploy DNS resolver บน VPS** (รองรับ UDP)
2. **Next.js เรียก API** ของ DNS resolver service
3. **DNS resolver เช็ค ISP DNS** จาก VPS network

#### Architecture:
```
Next.js (Cloudflare) 
    ↓ HTTP API
DNS Resolver Service (VPS on ISP network)
    ↓ UDP DNS Query
ISP DNS Servers
```

---

### ทางเลือกที่ 3: ใช้ Third-Party DNS Checker API

**ใช้บริการ DNS checker ที่มีอยู่แล้ว:**
- DNS checker APIs
- Custom DNS resolver services

---

## 📊 เปรียบเทียบ

| Platform | UDP Support | ISP Network | ความแม่นยำ |
|----------|-------------|-------------|------------|
| Cloudflare Workers | ❌ | ❌ | ⚠️ ไม่แม่นยำ |
| Vercel | ❌ | ❌ | ⚠️ ไม่แม่นยำ |
| Railway | ✅ | ⚠️ | ✅ ดี |
| Render | ✅ | ⚠️ | ✅ ดี |
| VPS (ISP Network) | ✅ | ✅ | ✅✅ แม่นยำที่สุด |

---

## 🎯 คำแนะนำ

### สำหรับ Production:

1. **Deploy Next.js บน VPS** ที่ใช้ ISP network
2. **หรือใช้ Hybrid Architecture:**
   - Frontend: Cloudflare Pages (static)
   - Backend API: VPS (UDP support)

### สำหรับ Development:

- รัน local ได้ปกติ (ทดสอบได้)
- แต่ผลลัพธ์อาจไม่แม่นยำ 100%

---

## 📝 สรุป

**Cloudflare Workers/Pages:**
- ❌ ไม่สามารถเช็ค ISP DNS ได้แม่นยำ
- ✅ ใช้ได้สำหรับ frontend/static content

**VPS (ISP Network):**
- ✅ เช็ค ISP DNS ได้แม่นยำ
- ✅ รองรับ UDP sockets
- ✅ อยู่บน ISP network

**แนะนำ:** Deploy บน VPS ที่ใช้ ISP network สำหรับความแม่นยำ

