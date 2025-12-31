# ✅ Checklist ก่อน Push ไป GitHub

## 🗑️ ไฟล์ที่ควรลบ/ไม่ commit

### 1. ไฟล์ที่ลบแล้ว:
- ✅ `sentinel-dns-monitor.zip` - ไฟล์ zip ไม่ควร commit

### 2. ไฟล์ที่ ignore แล้ว (ใน .gitignore):
- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Next.js build output
- ✅ `*.log` - Log files
- ✅ `.env*.local` - Environment variables
- ✅ `*.zip` - Archive files

---

## 📝 ไฟล์ที่ควร commit

### Source Code:
- ✅ `app/` - Next.js app directory
- ✅ `components/` - React components
- ✅ `services/` - Business logic
- ✅ `constants.ts` - Configuration
- ✅ `types.ts` - TypeScript types

### Config Files:
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ `next.config.js` - Next.js config
- ✅ `tailwind.config.js` - Tailwind config
- ✅ `postcss.config.js` - PostCSS config
- ✅ `.gitignore` - Git ignore rules
- ✅ `.gitattributes` - Git attributes

### Documentation:
- ✅ `README.md` - Main documentation
- ✅ `TESTING.md` - Testing guide
- ✅ `SETUP.md` - Setup guide
- ✅ `RAILWAY_DEPLOY.md` - Deployment guide

### Deployment Configs:
- ✅ `railway.json` - Railway config
- ✅ `render.yaml` - Render config
- ✅ `fly.toml` - Fly.io config

### Test Scripts (Optional):
- ⚠️ `test-api.js` - API test script
- ⚠️ `test-telegram.js` - Telegram test script
- ⚠️ `test-isp-dns.js` - ISP DNS test script

**หมายเหตุ:** Test scripts สามารถเก็บไว้ได้ (มีประโยชน์) หรือลบออกก็ได้

---

## 📚 ไฟล์ Documentation (Optional - อาจรวมเป็นไฟล์เดียว)

### ไฟล์ที่อาจรวมหรือลบ:
- `DEPLOYMENT_GUIDE.md`
- `DNS_CHECKING_LIMITATIONS.md`
- `DNS_RESOLVER_SOLUTION.md`
- `FREE_PLATFORMS.md`
- `NEXTJS_DNS_SETUP.md`

**แนะนำ:** เก็บไว้ทั้งหมด หรือรวมเป็น `docs/` folder

---

## 🔒 Security Checklist

### ✅ ตรวจสอบว่าไม่มี:
- [ ] `.env` files (มี .env*.local ใน .gitignore แล้ว)
- [ ] API keys หรือ secrets ใน code
- [ ] Telegram Bot Token ใน code
- [ ] Passwords หรือ credentials

### ✅ ตรวจสอบ:
- [ ] `.gitignore` มี `.env` และ `.env*.local`
- [ ] ไม่มี sensitive data ใน code

---

## 🚀 ขั้นตอนการ Push

```bash
# 1. ตรวจสอบไฟล์ที่จะ commit
git status

# 2. เพิ่มไฟล์ที่ต้องการ
git add .

# 3. ตรวจสอบอีกครั้ง
git status

# 4. Commit
git commit -m "Initial commit: DNS Monitor with ISP DNS checking"

# 5. เพิ่ม remote (ถ้ายังไม่มี)
git remote add origin https://github.com/supufathai-bit/MonitorDns.git

# 6. Push
git push -u origin main
```

---

## ⚠️ หมายเหตุ

- **อย่า commit `node_modules`** - ใหญ่เกินไป
- **อย่า commit `.env` files** - มี secrets
- **อย่า commit build files** - สร้างใหม่ได้
- **Test scripts** - เก็บไว้ได้ (มีประโยชน์)

---

## ✅ สรุป

**ไฟล์ที่ควร commit:**
- Source code
- Config files
- Documentation
- Deployment configs

**ไฟล์ที่ไม่ควร commit:**
- `node_modules/`
- `.next/`
- `.env*`
- `*.log`
- `*.zip`
- Build outputs


## 🗑️ ไฟล์ที่ควรลบ/ไม่ commit

### 1. ไฟล์ที่ลบแล้ว:
- ✅ `sentinel-dns-monitor.zip` - ไฟล์ zip ไม่ควร commit

### 2. ไฟล์ที่ ignore แล้ว (ใน .gitignore):
- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Next.js build output
- ✅ `*.log` - Log files
- ✅ `.env*.local` - Environment variables
- ✅ `*.zip` - Archive files

---

## 📝 ไฟล์ที่ควร commit

### Source Code:
- ✅ `app/` - Next.js app directory
- ✅ `components/` - React components
- ✅ `services/` - Business logic
- ✅ `constants.ts` - Configuration
- ✅ `types.ts` - TypeScript types

### Config Files:
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ `next.config.js` - Next.js config
- ✅ `tailwind.config.js` - Tailwind config
- ✅ `postcss.config.js` - PostCSS config
- ✅ `.gitignore` - Git ignore rules
- ✅ `.gitattributes` - Git attributes

### Documentation:
- ✅ `README.md` - Main documentation
- ✅ `TESTING.md` - Testing guide
- ✅ `SETUP.md` - Setup guide
- ✅ `RAILWAY_DEPLOY.md` - Deployment guide

### Deployment Configs:
- ✅ `railway.json` - Railway config
- ✅ `render.yaml` - Render config
- ✅ `fly.toml` - Fly.io config

### Test Scripts (Optional):
- ⚠️ `test-api.js` - API test script
- ⚠️ `test-telegram.js` - Telegram test script
- ⚠️ `test-isp-dns.js` - ISP DNS test script

**หมายเหตุ:** Test scripts สามารถเก็บไว้ได้ (มีประโยชน์) หรือลบออกก็ได้

---

## 📚 ไฟล์ Documentation (Optional - อาจรวมเป็นไฟล์เดียว)

### ไฟล์ที่อาจรวมหรือลบ:
- `DEPLOYMENT_GUIDE.md`
- `DNS_CHECKING_LIMITATIONS.md`
- `DNS_RESOLVER_SOLUTION.md`
- `FREE_PLATFORMS.md`
- `NEXTJS_DNS_SETUP.md`

**แนะนำ:** เก็บไว้ทั้งหมด หรือรวมเป็น `docs/` folder

---

## 🔒 Security Checklist

### ✅ ตรวจสอบว่าไม่มี:
- [ ] `.env` files (มี .env*.local ใน .gitignore แล้ว)
- [ ] API keys หรือ secrets ใน code
- [ ] Telegram Bot Token ใน code
- [ ] Passwords หรือ credentials

### ✅ ตรวจสอบ:
- [ ] `.gitignore` มี `.env` และ `.env*.local`
- [ ] ไม่มี sensitive data ใน code

---

## 🚀 ขั้นตอนการ Push

```bash
# 1. ตรวจสอบไฟล์ที่จะ commit
git status

# 2. เพิ่มไฟล์ที่ต้องการ
git add .

# 3. ตรวจสอบอีกครั้ง
git status

# 4. Commit
git commit -m "Initial commit: DNS Monitor with ISP DNS checking"

# 5. เพิ่ม remote (ถ้ายังไม่มี)
git remote add origin https://github.com/supufathai-bit/MonitorDns.git

# 6. Push
git push -u origin main
```

---

## ⚠️ หมายเหตุ

- **อย่า commit `node_modules`** - ใหญ่เกินไป
- **อย่า commit `.env` files** - มี secrets
- **อย่า commit build files** - สร้างใหม่ได้
- **Test scripts** - เก็บไว้ได้ (มีประโยชน์)

---

## ✅ สรุป

**ไฟล์ที่ควร commit:**
- Source code
- Config files
- Documentation
- Deployment configs

**ไฟล์ที่ไม่ควร commit:**
- `node_modules/`
- `.next/`
- `.env*`
- `*.log`
- `*.zip`
- Build outputs


## 🗑️ ไฟล์ที่ควรลบ/ไม่ commit

### 1. ไฟล์ที่ลบแล้ว:
- ✅ `sentinel-dns-monitor.zip` - ไฟล์ zip ไม่ควร commit

### 2. ไฟล์ที่ ignore แล้ว (ใน .gitignore):
- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Next.js build output
- ✅ `*.log` - Log files
- ✅ `.env*.local` - Environment variables
- ✅ `*.zip` - Archive files

---

## 📝 ไฟล์ที่ควร commit

### Source Code:
- ✅ `app/` - Next.js app directory
- ✅ `components/` - React components
- ✅ `services/` - Business logic
- ✅ `constants.ts` - Configuration
- ✅ `types.ts` - TypeScript types

### Config Files:
- ✅ `package.json` - Dependencies
- ✅ `tsconfig.json` - TypeScript config
- ✅ `next.config.js` - Next.js config
- ✅ `tailwind.config.js` - Tailwind config
- ✅ `postcss.config.js` - PostCSS config
- ✅ `.gitignore` - Git ignore rules
- ✅ `.gitattributes` - Git attributes

### Documentation:
- ✅ `README.md` - Main documentation
- ✅ `TESTING.md` - Testing guide
- ✅ `SETUP.md` - Setup guide
- ✅ `RAILWAY_DEPLOY.md` - Deployment guide

### Deployment Configs:
- ✅ `railway.json` - Railway config
- ✅ `render.yaml` - Render config
- ✅ `fly.toml` - Fly.io config

### Test Scripts (Optional):
- ⚠️ `test-api.js` - API test script
- ⚠️ `test-telegram.js` - Telegram test script
- ⚠️ `test-isp-dns.js` - ISP DNS test script

**หมายเหตุ:** Test scripts สามารถเก็บไว้ได้ (มีประโยชน์) หรือลบออกก็ได้

---

## 📚 ไฟล์ Documentation (Optional - อาจรวมเป็นไฟล์เดียว)

### ไฟล์ที่อาจรวมหรือลบ:
- `DEPLOYMENT_GUIDE.md`
- `DNS_CHECKING_LIMITATIONS.md`
- `DNS_RESOLVER_SOLUTION.md`
- `FREE_PLATFORMS.md`
- `NEXTJS_DNS_SETUP.md`

**แนะนำ:** เก็บไว้ทั้งหมด หรือรวมเป็น `docs/` folder

---

## 🔒 Security Checklist

### ✅ ตรวจสอบว่าไม่มี:
- [ ] `.env` files (มี .env*.local ใน .gitignore แล้ว)
- [ ] API keys หรือ secrets ใน code
- [ ] Telegram Bot Token ใน code
- [ ] Passwords หรือ credentials

### ✅ ตรวจสอบ:
- [ ] `.gitignore` มี `.env` และ `.env*.local`
- [ ] ไม่มี sensitive data ใน code

---

## 🚀 ขั้นตอนการ Push

```bash
# 1. ตรวจสอบไฟล์ที่จะ commit
git status

# 2. เพิ่มไฟล์ที่ต้องการ
git add .

# 3. ตรวจสอบอีกครั้ง
git status

# 4. Commit
git commit -m "Initial commit: DNS Monitor with ISP DNS checking"

# 5. เพิ่ม remote (ถ้ายังไม่มี)
git remote add origin https://github.com/supufathai-bit/MonitorDns.git

# 6. Push
git push -u origin main
```

---

## ⚠️ หมายเหตุ

- **อย่า commit `node_modules`** - ใหญ่เกินไป
- **อย่า commit `.env` files** - มี secrets
- **อย่า commit build files** - สร้างใหม่ได้
- **Test scripts** - เก็บไว้ได้ (มีประโยชน์)

---

## ✅ สรุป

**ไฟล์ที่ควร commit:**
- Source code
- Config files
- Documentation
- Deployment configs

**ไฟล์ที่ไม่ควร commit:**
- `node_modules/`
- `.next/`
- `.env*`
- `*.log`
- `*.zip`
- Build outputs

