# 🚂 คู่มือ Deploy บน Railway

## วิธีที่ 1: Deploy จาก GitHub (แนะนำ - ง่ายที่สุด)

### ขั้นตอน:

1. **Push code ไป GitHub:**
   ```bash
   # สร้าง repository บน GitHub ก่อน
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/sentinel-dns-monitor.git
   git push -u origin main
   ```

2. **สร้าง Railway Account:**
   - ไปที่ https://railway.app
   - Sign up with GitHub (ง่ายที่สุด)

3. **Deploy:**
   - คลิก **"New Project"**
   - เลือก **"Deploy from GitHub repo"**
   - เลือก repository ของคุณ
   - Railway จะ build และ deploy อัตโนมัติ!

4. **ตั้งค่า Environment Variables (ถ้าต้องการ):**
   - ไปที่ Project → Variables
   - เพิ่ม variables ถ้ามี

---

## วิธีที่ 2: Deploy จาก Local (ไม่ต้องใช้ GitHub)

### ใช้ Railway CLI:

1. **ติดตั้ง Railway CLI:**
   ```bash
   # Windows (PowerShell)
   irm https://railway.app/install.ps1 | iex
   
   # หรือใช้ npm
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Deploy:**
   ```bash
   # ในโฟลเดอร์โปรเจกต์
   railway init
   railway up
   ```

4. **ตั้งค่า:**
   ```bash
   # ตั้งค่า port (ถ้าต้องการ)
   railway variables set PORT=3000
   ```

---

## วิธีที่ 3: Deploy จาก Docker

### สร้าง Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Deploy:

1. **Push Docker image:**
   ```bash
   railway up --dockerfile Dockerfile
   ```

---

## ⚙️ Configuration

### ไฟล์ `railway.json` (มีให้แล้ว):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Environment Variables:

ตั้งค่าใน Railway Dashboard:
- `PORT` - Port ที่จะรัน (default: 3000)
- `NODE_ENV=production`

---

## 🔧 ตั้งค่า Port

Railway จะกำหนด PORT ให้อัตโนมัติ ต้องอัปเดต `package.json`:

```json
{
  "scripts": {
    "start": "next start -p ${PORT:-3000}"
  }
}
```

หรือใช้ environment variable:
```bash
railway variables set PORT=3000
```

---

## 📝 Checklist

- [ ] สร้าง Railway account
- [ ] Push code ไป GitHub (ถ้าใช้วิธีที่ 1)
- [ ] หรือติดตั้ง Railway CLI (ถ้าใช้วิธีที่ 2)
- [ ] Deploy!
- [ ] ตั้งค่า Environment Variables (ถ้ามี)
- [ ] ทดสอบ API endpoint

---

## 🎯 Quick Start (GitHub)

```bash
# 1. Push ไป GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/sentinel-dns-monitor.git
git push -u origin main

# 2. ไปที่ railway.app
# 3. New Project → Deploy from GitHub
# 4. เลือก repository
# 5. Done! 🎉
```

---

## 💡 Tips

- Railway จะให้ URL อัตโนมัติ (เช่น `your-app.railway.app`)
- สามารถตั้งค่า custom domain ได้
- Free tier มี $5 credit/เดือน
- Auto-deploy เมื่อ push code ใหม่

---

## 🐛 Troubleshooting

### Build failed:
- ตรวจสอบ `package.json` scripts
- ตรวจสอบ `railway.json` config

### Port error:
- ตั้งค่า `PORT` environment variable
- อัปเดต `start` script ใน `package.json`

### UDP not working:
- ตรวจสอบว่าใช้ Node.js runtime (ไม่ใช่ Edge)
- ตรวจสอบว่า `export const runtime = 'nodejs'` ใน API route

