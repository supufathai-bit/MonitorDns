# ⚡ Quick Setup: DNS Resolver Service บน VPS

## 🎯 เป้าหมาย

ตั้งค่า DNS Resolver Service บน VPS ใน 10 นาที

---

## 📝 ขั้นตอนแบบย่อ

### 1. สร้าง VPS (5 นาที)

- **Provider:** Vultr/DigitalOcean/Linode
- **Region:** Singapore
- **OS:** Ubuntu 22.04
- **Plan:** $2.50-$6/เดือน

### 2. SSH เข้า VPS

```bash
ssh root@your-vps-ip
```

### 3. รันคำสั่งทั้งหมดนี้

```bash
# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# สร้างโฟลเดอร์
mkdir -p /opt/dns-resolver
cd /opt/dns-resolver

# สร้าง package.json
cat > package.json << 'EOF'
{
  "name": "dns-resolver-service",
  "version": "1.0.0",
  "main": "dns-resolver-service.js",
  "scripts": {
    "start": "node dns-resolver-service.js"
  },
  "dependencies": {
    "dns-packet": "^5.4.0"
  }
}
EOF

# Upload ไฟล์ dns-resolver-service.js มาที่นี่
# (ใช้ SCP หรือ nano สร้างใหม่)

# ติดตั้ง dependencies
npm install

# ติดตั้ง PM2
npm install -g pm2

# รัน service
pm2 start dns-resolver-service.js --name dns-resolver
pm2 save
pm2 startup

# เปิด firewall
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 4. ทดสอบ

```bash
curl -X POST http://localhost:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"hostname":"ufathai.win","isp_name":"AIS"}'
```

### 5. ตั้งค่าใน Railway

1. ไปที่ Railway Dashboard → Variables
2. เพิ่ม: `DNS_RESOLVER_SERVICE_URL` = `http://your-vps-ip:3001`
3. รอ auto-redeploy

---

## ✅ เสร็จ!

ตอนนี้ระบบจะเช็คได้แม่นยำแล้ว 🎉

