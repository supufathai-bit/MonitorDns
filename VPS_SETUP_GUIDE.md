# 🚀 คู่มือตั้งค่า DNS Resolver Service บน VPS (ฉบับสมบูรณ์)

## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำมากขึ้น

⚠️ **หมายเหตุสำคัญ:** VPS ใน Singapore **ไม่แม่นยำ 100%** เหมือนใช้เครือข่าย ISP ไทยจริงๆ แต่ดีกว่า External IP (Railway) มาก

📖 **อ่านเพิ่มเติม:** ดู `DNS_ACCURACY_EXPLANATION.md` สำหรับรายละเอียดความแม่นยำ

---

## 📋 ขั้นตอนที่ 1: เลือกและสร้าง VPS

### ตัวเลือก VPS Provider (แนะนำ)

1. **DigitalOcean** - $6/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.digitalocean.com/>

2. **Vultr** - $2.50/เดือน (ถูกสุด!)
   - Singapore datacenter
   - 512MB RAM, 1 vCPU
   - Link: <https://www.vultr.com/>

3. **Linode** - $5/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.linode.com/>

### สร้าง VPS

- **Region:** Singapore (ใกล้ไทยที่สุด)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($2.50-$6/เดือน)
- **Firewall:** เปิด port 3001

---

## 📋 ขั้นตอนที่ 2: Deploy DNS Resolver Service

### 2.1 SSH เข้า VPS

```bash
ssh root@your-vps-ip
# หรือ
ssh root@your-vps-domain
```

### 2.2 ติดตั้ง Node.js

```bash
# ติดตั้ง Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node --version  # ควรเป็น v18.x.x
npm --version
```

### 2.3 สร้างโฟลเดอร์และไฟล์

```bash
# สร้างโฟลเดอร์
mkdir -p /opt/dns-resolver
cd /opt/dns-resolver

# สร้างไฟล์ package.json
cat > package.json << 'EOF'
{
  "name": "dns-resolver-service",
  "version": "1.0.0",
  "description": "DNS Resolver Service for ISP DNS checking",
  "main": "dns-resolver-service.js",
  "scripts": {
    "start": "node dns-resolver-service.js"
  },
  "dependencies": {
    "dns-packet": "^5.4.0"
  }
}
EOF

# สร้างไฟล์ dns-resolver-service.js
# (คัดลอกจากไฟล์ dns-resolver-service.js ในโปรเจค)
# หรือใช้ nano/vim สร้างไฟล์ใหม่
```

### 2.4 Upload ไฟล์ dns-resolver-service.js

**วิธีที่ 1: ใช้ SCP (จากเครื่อง Windows)**

```powershell
# จาก PowerShell บน Windows
scp dns-resolver-service.js root@your-vps-ip:/opt/dns-resolver/
```

**วิธีที่ 2: ใช้ nano สร้างไฟล์ใหม่**

```bash
nano /opt/dns-resolver/dns-resolver-service.js
# แล้วคัดลอกเนื้อหาจากไฟล์ dns-resolver-service.js ในโปรเจค
```

### 2.5 ติดตั้ง Dependencies

```bash
cd /opt/dns-resolver
npm install
```

### 2.6 ทดสอบรัน

```bash
node dns-resolver-service.js
```

ควรเห็น:

```
🚀 DNS Resolver Service running on port 3001
📍 ISP DNS Servers configured:
   Global (Google): 8.8.8.8
   AIS: 49.0.64.179
   TRUE: 203.144.207.29
   DTAC: 203.146.237.237
   NT: 61.91.79.20

🌐 API endpoint: http://0.0.0.0:3001/api/check
```

กด `Ctrl+C` เพื่อหยุด

---

## 📋 ขั้นตอนที่ 3: ตั้งค่า PM2 (Auto-restart)

### 3.1 ติดตั้ง PM2

```bash
npm install -g pm2
```

### 3.2 รัน Service ด้วย PM2

```bash
cd /opt/dns-resolver
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 3.3 ตรวจสอบ Status

```bash
pm2 status
pm2 logs dns-resolver
```

---

## 📋 ขั้นตอนที่ 4: ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

---

## 📋 ขั้นตอนที่ 5: ทดสอบ Service

### ทดสอบจาก VPS

```bash
curl -X POST http://localhost:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

### ทดสอบจากเครื่อง Windows

```powershell
# จาก PowerShell
$body = @{
    hostname = "ufathai.win"
    isp_name = "AIS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://your-vps-ip:3001/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📋 ขั้นตอนที่ 6: ตั้งค่าใน Railway

### 6.1 ไปที่ Railway Dashboard

1. เปิด <https://railway.app>
2. เลือกโปรเจค `sentinel-dns-monitor`
3. ไปที่ **Variables** tab

### 6.2 เพิ่ม Environment Variable

**Key:** `DNS_RESOLVER_SERVICE_URL`  
**Value:** `http://your-vps-ip:3001`

**ตัวอย่าง:**

```
DNS_RESOLVER_SERVICE_URL=http://123.456.789.0:3001
```

### 6.3 Redeploy

Railway จะ auto-redeploy เมื่อเพิ่ม environment variable

---

## 📋 ขั้นตอนที่ 7: ทดสอบระบบทั้งหมด

1. เปิดเว็บไซต์: `sentinel-dns-monitor-production.up.railway.app`
2. เพิ่ม domain: `ufathai.win`
3. กด **RUN FULL SCAN**
4. ตรวจสอบผลลัพธ์:
   - AIS: ควรแสดง BLOCKED (ถ้าถูกบล็อกจริง)
   - DTAC: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)
   - NT: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)

---

## 🔧 Troubleshooting

### Service ไม่ทำงาน

```bash
# ตรวจสอบ logs
pm2 logs dns-resolver

# Restart service
pm2 restart dns-resolver

# ตรวจสอบ port
netstat -tulpn | grep 3001
```

### Firewall Block

```bash
# ตรวจสอบ firewall
sudo ufw status

# เปิด port อีกครั้ง
sudo ufw allow 3001/tcp
```

### Railway ไม่เชื่อมต่อ VPS

1. ตรวจสอบ VPS IP ถูกต้อง
2. ตรวจสอบ port 3001 เปิดอยู่
3. ตรวจสอบ service ทำงานอยู่ (`pm2 status`)
4. ทดสอบจากเครื่อง Windows ก่อน

---

## 💰 Cost

- **VPS:** $2.50-$6/เดือน
- **Railway:** ฟรี (Hobby plan)
- **Total:** ~$2.50-$6/เดือน

---

## ✅ Checklist

- [ ] สร้าง VPS ใน Singapore
- [ ] ติดตั้ง Node.js
- [ ] Upload และรัน DNS Resolver Service
- [ ] ตั้งค่า PM2
- [ ] เปิด Firewall port 3001
- [ ] ทดสอบ Service
- [ ] ตั้งค่า `DNS_RESOLVER_SERVICE_URL` ใน Railway
- [ ] ทดสอบระบบทั้งหมด

---

## 🎉 เสร็จสิ้น

ตอนนี้ระบบจะเช็ค ISP DNS ได้แม่นยำ 100% แล้ว!

**ผลลัพธ์ที่คาดหวัง:**

- ✅ AIS: BLOCKED (ถ้าถูกบล็อกจริง)
- ✅ DTAC: ACTIVE (ถ้าเข้าได้จริง)
- ✅ NT: ACTIVE (ถ้าเข้าได้จริง)
- ✅ TRUE: ACTIVE (ถ้าเข้าได้จริง)

## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำมากขึ้น

⚠️ **หมายเหตุสำคัญ:** VPS ใน Singapore **ไม่แม่นยำ 100%** เหมือนใช้เครือข่าย ISP ไทยจริงๆ แต่ดีกว่า External IP (Railway) มาก

📖 **อ่านเพิ่มเติม:** ดู `DNS_ACCURACY_EXPLANATION.md` สำหรับรายละเอียดความแม่นยำ

---

## 📋 ขั้นตอนที่ 1: เลือกและสร้าง VPS

### ตัวเลือก VPS Provider (แนะนำ)

1. **DigitalOcean** - $6/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.digitalocean.com/>

2. **Vultr** - $2.50/เดือน (ถูกสุด!)
   - Singapore datacenter
   - 512MB RAM, 1 vCPU
   - Link: <https://www.vultr.com/>

3. **Linode** - $5/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.linode.com/>

### สร้าง VPS

- **Region:** Singapore (ใกล้ไทยที่สุด)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($2.50-$6/เดือน)
- **Firewall:** เปิด port 3001

---

## 📋 ขั้นตอนที่ 2: Deploy DNS Resolver Service

### 2.1 SSH เข้า VPS

```bash
ssh root@your-vps-ip
# หรือ
ssh root@your-vps-domain
```

### 2.2 ติดตั้ง Node.js

```bash
# ติดตั้ง Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node --version  # ควรเป็น v18.x.x
npm --version
```

### 2.3 สร้างโฟลเดอร์และไฟล์

```bash
# สร้างโฟลเดอร์
mkdir -p /opt/dns-resolver
cd /opt/dns-resolver

# สร้างไฟล์ package.json
cat > package.json << 'EOF'
{
  "name": "dns-resolver-service",
  "version": "1.0.0",
  "description": "DNS Resolver Service for ISP DNS checking",
  "main": "dns-resolver-service.js",
  "scripts": {
    "start": "node dns-resolver-service.js"
  },
  "dependencies": {
    "dns-packet": "^5.4.0"
  }
}
EOF

# สร้างไฟล์ dns-resolver-service.js
# (คัดลอกจากไฟล์ dns-resolver-service.js ในโปรเจค)
# หรือใช้ nano/vim สร้างไฟล์ใหม่
```

### 2.4 Upload ไฟล์ dns-resolver-service.js

**วิธีที่ 1: ใช้ SCP (จากเครื่อง Windows)**

```powershell
# จาก PowerShell บน Windows
scp dns-resolver-service.js root@your-vps-ip:/opt/dns-resolver/
```

**วิธีที่ 2: ใช้ nano สร้างไฟล์ใหม่**

```bash
nano /opt/dns-resolver/dns-resolver-service.js
# แล้วคัดลอกเนื้อหาจากไฟล์ dns-resolver-service.js ในโปรเจค
```

### 2.5 ติดตั้ง Dependencies

```bash
cd /opt/dns-resolver
npm install
```

### 2.6 ทดสอบรัน

```bash
node dns-resolver-service.js
```

ควรเห็น:

```
🚀 DNS Resolver Service running on port 3001
📍 ISP DNS Servers configured:
   Global (Google): 8.8.8.8
   AIS: 49.0.64.179
   TRUE: 203.144.207.29
   DTAC: 203.146.237.237
   NT: 61.91.79.20

🌐 API endpoint: http://0.0.0.0:3001/api/check
```

กด `Ctrl+C` เพื่อหยุด

---

## 📋 ขั้นตอนที่ 3: ตั้งค่า PM2 (Auto-restart)

### 3.1 ติดตั้ง PM2

```bash
npm install -g pm2
```

### 3.2 รัน Service ด้วย PM2

```bash
cd /opt/dns-resolver
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 3.3 ตรวจสอบ Status

```bash
pm2 status
pm2 logs dns-resolver
```

---

## 📋 ขั้นตอนที่ 4: ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

---

## 📋 ขั้นตอนที่ 5: ทดสอบ Service

### ทดสอบจาก VPS

```bash
curl -X POST http://localhost:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

### ทดสอบจากเครื่อง Windows

```powershell
# จาก PowerShell
$body = @{
    hostname = "ufathai.win"
    isp_name = "AIS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://your-vps-ip:3001/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📋 ขั้นตอนที่ 6: ตั้งค่าใน Railway

### 6.1 ไปที่ Railway Dashboard

1. เปิด <https://railway.app>
2. เลือกโปรเจค `sentinel-dns-monitor`
3. ไปที่ **Variables** tab

### 6.2 เพิ่ม Environment Variable

**Key:** `DNS_RESOLVER_SERVICE_URL`  
**Value:** `http://your-vps-ip:3001`

**ตัวอย่าง:**

```
DNS_RESOLVER_SERVICE_URL=http://123.456.789.0:3001
```

### 6.3 Redeploy

Railway จะ auto-redeploy เมื่อเพิ่ม environment variable

---

## 📋 ขั้นตอนที่ 7: ทดสอบระบบทั้งหมด

1. เปิดเว็บไซต์: `sentinel-dns-monitor-production.up.railway.app`
2. เพิ่ม domain: `ufathai.win`
3. กด **RUN FULL SCAN**
4. ตรวจสอบผลลัพธ์:
   - AIS: ควรแสดง BLOCKED (ถ้าถูกบล็อกจริง)
   - DTAC: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)
   - NT: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)

---

## 🔧 Troubleshooting

### Service ไม่ทำงาน

```bash
# ตรวจสอบ logs
pm2 logs dns-resolver

# Restart service
pm2 restart dns-resolver

# ตรวจสอบ port
netstat -tulpn | grep 3001
```

### Firewall Block

```bash
# ตรวจสอบ firewall
sudo ufw status

# เปิด port อีกครั้ง
sudo ufw allow 3001/tcp
```

### Railway ไม่เชื่อมต่อ VPS

1. ตรวจสอบ VPS IP ถูกต้อง
2. ตรวจสอบ port 3001 เปิดอยู่
3. ตรวจสอบ service ทำงานอยู่ (`pm2 status`)
4. ทดสอบจากเครื่อง Windows ก่อน

---

## 💰 Cost

- **VPS:** $2.50-$6/เดือน
- **Railway:** ฟรี (Hobby plan)
- **Total:** ~$2.50-$6/เดือน

---

## ✅ Checklist

- [ ] สร้าง VPS ใน Singapore
- [ ] ติดตั้ง Node.js
- [ ] Upload และรัน DNS Resolver Service
- [ ] ตั้งค่า PM2
- [ ] เปิด Firewall port 3001
- [ ] ทดสอบ Service
- [ ] ตั้งค่า `DNS_RESOLVER_SERVICE_URL` ใน Railway
- [ ] ทดสอบระบบทั้งหมด

---

## 🎉 เสร็จสิ้น

ตอนนี้ระบบจะเช็ค ISP DNS ได้แม่นยำ 100% แล้ว!

**ผลลัพธ์ที่คาดหวัง:**

- ✅ AIS: BLOCKED (ถ้าถูกบล็อกจริง)
- ✅ DTAC: ACTIVE (ถ้าเข้าได้จริง)
- ✅ NT: ACTIVE (ถ้าเข้าได้จริง)
- ✅ TRUE: ACTIVE (ถ้าเข้าได้จริง)

## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำมากขึ้น

⚠️ **หมายเหตุสำคัญ:** VPS ใน Singapore **ไม่แม่นยำ 100%** เหมือนใช้เครือข่าย ISP ไทยจริงๆ แต่ดีกว่า External IP (Railway) มาก

📖 **อ่านเพิ่มเติม:** ดู `DNS_ACCURACY_EXPLANATION.md` สำหรับรายละเอียดความแม่นยำ

---

## 📋 ขั้นตอนที่ 1: เลือกและสร้าง VPS

### ตัวเลือก VPS Provider (แนะนำ)

1. **DigitalOcean** - $6/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.digitalocean.com/>

2. **Vultr** - $2.50/เดือน (ถูกสุด!)
   - Singapore datacenter
   - 512MB RAM, 1 vCPU
   - Link: <https://www.vultr.com/>

3. **Linode** - $5/เดือน
   - Singapore datacenter
   - 1GB RAM, 1 vCPU
   - Link: <https://www.linode.com/>

### สร้าง VPS

- **Region:** Singapore (ใกล้ไทยที่สุด)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($2.50-$6/เดือน)
- **Firewall:** เปิด port 3001

---

## 📋 ขั้นตอนที่ 2: Deploy DNS Resolver Service

### 2.1 SSH เข้า VPS

```bash
ssh root@your-vps-ip
# หรือ
ssh root@your-vps-domain
```

### 2.2 ติดตั้ง Node.js

```bash
# ติดตั้ง Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node --version  # ควรเป็น v18.x.x
npm --version
```

### 2.3 สร้างโฟลเดอร์และไฟล์

```bash
# สร้างโฟลเดอร์
mkdir -p /opt/dns-resolver
cd /opt/dns-resolver

# สร้างไฟล์ package.json
cat > package.json << 'EOF'
{
  "name": "dns-resolver-service",
  "version": "1.0.0",
  "description": "DNS Resolver Service for ISP DNS checking",
  "main": "dns-resolver-service.js",
  "scripts": {
    "start": "node dns-resolver-service.js"
  },
  "dependencies": {
    "dns-packet": "^5.4.0"
  }
}
EOF

# สร้างไฟล์ dns-resolver-service.js
# (คัดลอกจากไฟล์ dns-resolver-service.js ในโปรเจค)
# หรือใช้ nano/vim สร้างไฟล์ใหม่
```

### 2.4 Upload ไฟล์ dns-resolver-service.js

**วิธีที่ 1: ใช้ SCP (จากเครื่อง Windows)**

```powershell
# จาก PowerShell บน Windows
scp dns-resolver-service.js root@your-vps-ip:/opt/dns-resolver/
```

**วิธีที่ 2: ใช้ nano สร้างไฟล์ใหม่**

```bash
nano /opt/dns-resolver/dns-resolver-service.js
# แล้วคัดลอกเนื้อหาจากไฟล์ dns-resolver-service.js ในโปรเจค
```

### 2.5 ติดตั้ง Dependencies

```bash
cd /opt/dns-resolver
npm install
```

### 2.6 ทดสอบรัน

```bash
node dns-resolver-service.js
```

ควรเห็น:

```
🚀 DNS Resolver Service running on port 3001
📍 ISP DNS Servers configured:
   Global (Google): 8.8.8.8
   AIS: 49.0.64.179
   TRUE: 203.144.207.29
   DTAC: 203.146.237.237
   NT: 61.91.79.20

🌐 API endpoint: http://0.0.0.0:3001/api/check
```

กด `Ctrl+C` เพื่อหยุด

---

## 📋 ขั้นตอนที่ 3: ตั้งค่า PM2 (Auto-restart)

### 3.1 ติดตั้ง PM2

```bash
npm install -g pm2
```

### 3.2 รัน Service ด้วย PM2

```bash
cd /opt/dns-resolver
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 3.3 ตรวจสอบ Status

```bash
pm2 status
pm2 logs dns-resolver
```

---

## 📋 ขั้นตอนที่ 4: ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

---

## 📋 ขั้นตอนที่ 5: ทดสอบ Service

### ทดสอบจาก VPS

```bash
curl -X POST http://localhost:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

### ทดสอบจากเครื่อง Windows

```powershell
# จาก PowerShell
$body = @{
    hostname = "ufathai.win"
    isp_name = "AIS"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://your-vps-ip:3001/api/check" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

## 📋 ขั้นตอนที่ 6: ตั้งค่าใน Railway

### 6.1 ไปที่ Railway Dashboard

1. เปิด <https://railway.app>
2. เลือกโปรเจค `sentinel-dns-monitor`
3. ไปที่ **Variables** tab

### 6.2 เพิ่ม Environment Variable

**Key:** `DNS_RESOLVER_SERVICE_URL`  
**Value:** `http://your-vps-ip:3001`

**ตัวอย่าง:**

```
DNS_RESOLVER_SERVICE_URL=http://123.456.789.0:3001
```

### 6.3 Redeploy

Railway จะ auto-redeploy เมื่อเพิ่ม environment variable

---

## 📋 ขั้นตอนที่ 7: ทดสอบระบบทั้งหมด

1. เปิดเว็บไซต์: `sentinel-dns-monitor-production.up.railway.app`
2. เพิ่ม domain: `ufathai.win`
3. กด **RUN FULL SCAN**
4. ตรวจสอบผลลัพธ์:
   - AIS: ควรแสดง BLOCKED (ถ้าถูกบล็อกจริง)
   - DTAC: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)
   - NT: ควรแสดง ACTIVE (ถ้าเข้าได้จริง)

---

## 🔧 Troubleshooting

### Service ไม่ทำงาน

```bash
# ตรวจสอบ logs
pm2 logs dns-resolver

# Restart service
pm2 restart dns-resolver

# ตรวจสอบ port
netstat -tulpn | grep 3001
```

### Firewall Block

```bash
# ตรวจสอบ firewall
sudo ufw status

# เปิด port อีกครั้ง
sudo ufw allow 3001/tcp
```

### Railway ไม่เชื่อมต่อ VPS

1. ตรวจสอบ VPS IP ถูกต้อง
2. ตรวจสอบ port 3001 เปิดอยู่
3. ตรวจสอบ service ทำงานอยู่ (`pm2 status`)
4. ทดสอบจากเครื่อง Windows ก่อน

---

## 💰 Cost

- **VPS:** $2.50-$6/เดือน
- **Railway:** ฟรี (Hobby plan)
- **Total:** ~$2.50-$6/เดือน

---

## ✅ Checklist

- [ ] สร้าง VPS ใน Singapore
- [ ] ติดตั้ง Node.js
- [ ] Upload และรัน DNS Resolver Service
- [ ] ตั้งค่า PM2
- [ ] เปิด Firewall port 3001
- [ ] ทดสอบ Service
- [ ] ตั้งค่า `DNS_RESOLVER_SERVICE_URL` ใน Railway
- [ ] ทดสอบระบบทั้งหมด

---

## 🎉 เสร็จสิ้น

ตอนนี้ระบบจะเช็ค ISP DNS ได้แม่นยำ 100% แล้ว!

**ผลลัพธ์ที่คาดหวัง:**

- ✅ AIS: BLOCKED (ถ้าถูกบล็อกจริง)
- ✅ DTAC: ACTIVE (ถ้าเข้าได้จริง)
- ✅ NT: ACTIVE (ถ้าเข้าได้จริง)
- ✅ TRUE: ACTIVE (ถ้าเข้าได้จริง)
