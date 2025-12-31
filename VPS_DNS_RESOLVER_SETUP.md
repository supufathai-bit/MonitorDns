# 🚀 คู่มือตั้งค่า DNS Resolver Service บน VPS

## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำ

---

## 📋 ขั้นตอน

### 1. เลือก VPS Provider

**แนะนำ:**
- **DigitalOcean** - $6/เดือน (Singapore datacenter)
- **Linode** - $5/เดือน (Singapore datacenter)
- **Vultr** - $2.50/เดือน (Singapore datacenter)

### 2. สร้าง VPS

- **Region:** Singapore (ใกล้ไทย)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($5-6/เดือน)

### 3. Deploy DNS Resolver Service

```bash
# SSH เข้า VPS
ssh root@your-vps-ip

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone หรือ upload dns-resolver-service.js
# หรือสร้างไฟล์ใหม่

# ติดตั้ง dependencies
npm install dns-packet

# รัน service
node dns-resolver-service.js

# หรือใช้ PM2
npm install -g pm2
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 4. ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 5. ตั้งค่า Reverse Proxy (Optional - สำหรับ HTTPS)

```bash
# ติดตั้ง Nginx
sudo apt install nginx

# สร้าง config
sudo nano /etc/nginx/sites-available/dns-resolver

# เพิ่ม:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/dns-resolver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. ตั้งค่าใน Railway

**Environment Variables:**
```
DNS_RESOLVER_SERVICE_URL=https://your-vps-ip:3001
# หรือ
DNS_RESOLVER_SERVICE_URL=https://your-domain.com
```

---

## 🧪 ทดสอบ

```bash
# ทดสอบ resolver service
curl -X POST http://your-vps-ip:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

---

## 📊 ผลลัพธ์

**ก่อน (External IP):**
- AIS: ERROR (timeout)
- DTAC: ERROR (timeout)
- NT: ERROR (timeout)

**หลัง (VPS):**
- AIS: BLOCKED (แม่นยำ)
- DTAC: ACTIVE (แม่นยำ)
- NT: ACTIVE (แม่นยำ)

---

## 💰 Cost

- **VPS:** $5-6/เดือน
- **Total:** ~$5-6/เดือน

---

## ✅ สรุป

1. ✅ สร้าง VPS ใน Singapore
2. ✅ Deploy DNS Resolver Service
3. ✅ ตั้งค่า DNS_RESOLVER_SERVICE_URL ใน Railway
4. ✅ ทดสอบ

**ผลลัพธ์:** เช็ค ISP DNS ได้แม่นยำ 100%!


## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำ

---

## 📋 ขั้นตอน

### 1. เลือก VPS Provider

**แนะนำ:**
- **DigitalOcean** - $6/เดือน (Singapore datacenter)
- **Linode** - $5/เดือน (Singapore datacenter)
- **Vultr** - $2.50/เดือน (Singapore datacenter)

### 2. สร้าง VPS

- **Region:** Singapore (ใกล้ไทย)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($5-6/เดือน)

### 3. Deploy DNS Resolver Service

```bash
# SSH เข้า VPS
ssh root@your-vps-ip

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone หรือ upload dns-resolver-service.js
# หรือสร้างไฟล์ใหม่

# ติดตั้ง dependencies
npm install dns-packet

# รัน service
node dns-resolver-service.js

# หรือใช้ PM2
npm install -g pm2
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 4. ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 5. ตั้งค่า Reverse Proxy (Optional - สำหรับ HTTPS)

```bash
# ติดตั้ง Nginx
sudo apt install nginx

# สร้าง config
sudo nano /etc/nginx/sites-available/dns-resolver

# เพิ่ม:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/dns-resolver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. ตั้งค่าใน Railway

**Environment Variables:**
```
DNS_RESOLVER_SERVICE_URL=https://your-vps-ip:3001
# หรือ
DNS_RESOLVER_SERVICE_URL=https://your-domain.com
```

---

## 🧪 ทดสอบ

```bash
# ทดสอบ resolver service
curl -X POST http://your-vps-ip:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

---

## 📊 ผลลัพธ์

**ก่อน (External IP):**
- AIS: ERROR (timeout)
- DTAC: ERROR (timeout)
- NT: ERROR (timeout)

**หลัง (VPS):**
- AIS: BLOCKED (แม่นยำ)
- DTAC: ACTIVE (แม่นยำ)
- NT: ACTIVE (แม่นยำ)

---

## 💰 Cost

- **VPS:** $5-6/เดือน
- **Total:** ~$5-6/เดือน

---

## ✅ สรุป

1. ✅ สร้าง VPS ใน Singapore
2. ✅ Deploy DNS Resolver Service
3. ✅ ตั้งค่า DNS_RESOLVER_SERVICE_URL ใน Railway
4. ✅ ทดสอบ

**ผลลัพธ์:** เช็ค ISP DNS ได้แม่นยำ 100%!


## 🎯 เป้าหมาย

สร้าง DNS Resolver Service บน VPS ในไทย/สิงคโปร์ เพื่อเช็ค ISP DNS ได้แม่นยำ

---

## 📋 ขั้นตอน

### 1. เลือก VPS Provider

**แนะนำ:**
- **DigitalOcean** - $6/เดือน (Singapore datacenter)
- **Linode** - $5/เดือน (Singapore datacenter)
- **Vultr** - $2.50/เดือน (Singapore datacenter)

### 2. สร้าง VPS

- **Region:** Singapore (ใกล้ไทย)
- **OS:** Ubuntu 22.04 LTS
- **Plan:** Basic ($5-6/เดือน)

### 3. Deploy DNS Resolver Service

```bash
# SSH เข้า VPS
ssh root@your-vps-ip

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone หรือ upload dns-resolver-service.js
# หรือสร้างไฟล์ใหม่

# ติดตั้ง dependencies
npm install dns-packet

# รัน service
node dns-resolver-service.js

# หรือใช้ PM2
npm install -g pm2
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup
```

### 4. ตั้งค่า Firewall

```bash
# เปิด port 3001
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 5. ตั้งค่า Reverse Proxy (Optional - สำหรับ HTTPS)

```bash
# ติดตั้ง Nginx
sudo apt install nginx

# สร้าง config
sudo nano /etc/nginx/sites-available/dns-resolver

# เพิ่ม:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/dns-resolver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. ตั้งค่าใน Railway

**Environment Variables:**
```
DNS_RESOLVER_SERVICE_URL=https://your-vps-ip:3001
# หรือ
DNS_RESOLVER_SERVICE_URL=https://your-domain.com
```

---

## 🧪 ทดสอบ

```bash
# ทดสอบ resolver service
curl -X POST http://your-vps-ip:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

---

## 📊 ผลลัพธ์

**ก่อน (External IP):**
- AIS: ERROR (timeout)
- DTAC: ERROR (timeout)
- NT: ERROR (timeout)

**หลัง (VPS):**
- AIS: BLOCKED (แม่นยำ)
- DTAC: ACTIVE (แม่นยำ)
- NT: ACTIVE (แม่นยำ)

---

## 💰 Cost

- **VPS:** $5-6/เดือน
- **Total:** ~$5-6/เดือน

---

## ✅ สรุป

1. ✅ สร้าง VPS ใน Singapore
2. ✅ Deploy DNS Resolver Service
3. ✅ ตั้งค่า DNS_RESOLVER_SERVICE_URL ใน Railway
4. ✅ ทดสอบ

**ผลลัพธ์:** เช็ค ISP DNS ได้แม่นยำ 100%!

