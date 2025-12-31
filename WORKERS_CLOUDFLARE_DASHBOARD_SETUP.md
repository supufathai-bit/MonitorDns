# ⚙️ Cloudflare Dashboard: Workers Setup

## 🎯 การตั้งค่าใน Cloudflare Dashboard

เมื่อสร้าง Workers จาก GitHub repository:

---

## 📋 การตั้งค่าใน Form

### 1. Repository

- **Repository:** `supufathai-bit/MonitorDns` ✅ (ถูกต้อง)

### 2. Project Name

- **Project name:** `sentinel-dns-api` (หรือชื่อที่ต้องการ)

### 3. Build Command

**⚠️ สำคัญ:** Workers ไม่ต้อง build แบบ Next.js

**ตัวเลือก:**

- **Option 1:** ปล่อยว่าง (ไม่ต้อง build)
- **Option 2:** `cd workers && npm install` (ติดตั้ง dependencies)

**แนะนำ:** ปล่อยว่าง หรือ `cd workers && npm install`

### 4. Deploy Command

**⚠️ สำคัญ:** ต้อง deploy จาก `workers/` folder

**ใส่:**

```
cd workers && npx wrangler deploy
```

หรือถ้าใช้ wrangler ที่ติดตั้งแล้ว:

```
cd workers && wrangler deploy
```

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: Workers อยู่ใน Subfolder

Cloudflare Dashboard อาจไม่รองรับ Workers ที่อยู่ใน subfolder (`workers/`)

**วิธีแก้:**

#### Option 1: Deploy จาก Local (แนะนำ)

```bash
cd workers
npm install
wrangler login
wrangler deploy
```

#### Option 2: สร้าง Workers Project แยก

1. สร้าง repository ใหม่สำหรับ Workers
2. Copy code จาก `workers/` folder
3. Deploy จาก repository นั้น

#### Option 3: ใช้ Wrangler CLI โดยตรง

ไม่ใช้ Dashboard แต่ใช้ CLI:

```bash
cd workers
wrangler login
wrangler deploy
```

---

## ✅ วิธีที่แนะนำ

### ใช้ Wrangler CLI (ง่ายที่สุด)

1. **เปิด Terminal/PowerShell**

2. **ไปที่ workers folder:**

```bash
cd workers
```

1. **ติดตั้ง dependencies:**

```bash
npm install
```

1. **Login (ถ้ายังไม่ได้):**

```bash
wrangler login
```

1. **สร้าง KV Namespace:**

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

1. **อัปเดต wrangler.toml:**
   - ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 5

2. **Deploy:**

```bash
wrangler deploy
```

---

## 📝 สรุป

**สำหรับ Cloudflare Dashboard:**

| Field | Value |
|-------|-------|
| **Repository** | `supufathai-bit/MonitorDns` |
| **Project name** | `sentinel-dns-api` |
| **Build command** | (ว่าง) หรือ `cd workers && npm install` |
| **Deploy command** | `cd workers && npx wrangler deploy` |

**หรือใช้ CLI (แนะนำ):**

```bash
cd workers
npm install
wrangler deploy
```

---

## 🎯 Next Steps

1. ✅ ตั้งค่าใน Dashboard หรือใช้ CLI
2. ⏳ สร้าง KV namespace
3. ⏳ อัปเดต wrangler.toml
4. ⏳ Deploy Workers
5. ⏳ Test API

---

## 💡 Tips

- **CLI ง่ายกว่า Dashboard** สำหรับ Workers ใน subfolder
- **KV namespace** ต้องสร้างก่อน deploy
- **Deploy command** ต้องรันจาก `workers/` folder

## 🎯 การตั้งค่าใน Cloudflare Dashboard

เมื่อสร้าง Workers จาก GitHub repository:

---

## 📋 การตั้งค่าใน Form

### 1. Repository

- **Repository:** `supufathai-bit/MonitorDns` ✅ (ถูกต้อง)

### 2. Project Name

- **Project name:** `sentinel-dns-api` (หรือชื่อที่ต้องการ)

### 3. Build Command

**⚠️ สำคัญ:** Workers ไม่ต้อง build แบบ Next.js

**ตัวเลือก:**

- **Option 1:** ปล่อยว่าง (ไม่ต้อง build)
- **Option 2:** `cd workers && npm install` (ติดตั้ง dependencies)

**แนะนำ:** ปล่อยว่าง หรือ `cd workers && npm install`

### 4. Deploy Command

**⚠️ สำคัญ:** ต้อง deploy จาก `workers/` folder

**ใส่:**

```
cd workers && npx wrangler deploy
```

หรือถ้าใช้ wrangler ที่ติดตั้งแล้ว:

```
cd workers && wrangler deploy
```

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: Workers อยู่ใน Subfolder

Cloudflare Dashboard อาจไม่รองรับ Workers ที่อยู่ใน subfolder (`workers/`)

**วิธีแก้:**

#### Option 1: Deploy จาก Local (แนะนำ)

```bash
cd workers
npm install
wrangler login
wrangler deploy
```

#### Option 2: สร้าง Workers Project แยก

1. สร้าง repository ใหม่สำหรับ Workers
2. Copy code จาก `workers/` folder
3. Deploy จาก repository นั้น

#### Option 3: ใช้ Wrangler CLI โดยตรง

ไม่ใช้ Dashboard แต่ใช้ CLI:

```bash
cd workers
wrangler login
wrangler deploy
```

---

## ✅ วิธีที่แนะนำ

### ใช้ Wrangler CLI (ง่ายที่สุด)

1. **เปิด Terminal/PowerShell**

2. **ไปที่ workers folder:**

```bash
cd workers
```

1. **ติดตั้ง dependencies:**

```bash
npm install
```

1. **Login (ถ้ายังไม่ได้):**

```bash
wrangler login
```

1. **สร้าง KV Namespace:**

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

1. **อัปเดต wrangler.toml:**
   - ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 5

2. **Deploy:**

```bash
wrangler deploy
```

---

## 📝 สรุป

**สำหรับ Cloudflare Dashboard:**

| Field | Value |
|-------|-------|
| **Repository** | `supufathai-bit/MonitorDns` |
| **Project name** | `sentinel-dns-api` |
| **Build command** | (ว่าง) หรือ `cd workers && npm install` |
| **Deploy command** | `cd workers && npx wrangler deploy` |

**หรือใช้ CLI (แนะนำ):**

```bash
cd workers
npm install
wrangler deploy
```

---

## 🎯 Next Steps

1. ✅ ตั้งค่าใน Dashboard หรือใช้ CLI
2. ⏳ สร้าง KV namespace
3. ⏳ อัปเดต wrangler.toml
4. ⏳ Deploy Workers
5. ⏳ Test API

---

## 💡 Tips

- **CLI ง่ายกว่า Dashboard** สำหรับ Workers ใน subfolder
- **KV namespace** ต้องสร้างก่อน deploy
- **Deploy command** ต้องรันจาก `workers/` folder

## 🎯 การตั้งค่าใน Cloudflare Dashboard

เมื่อสร้าง Workers จาก GitHub repository:

---

## 📋 การตั้งค่าใน Form

### 1. Repository

- **Repository:** `supufathai-bit/MonitorDns` ✅ (ถูกต้อง)

### 2. Project Name

- **Project name:** `sentinel-dns-api` (หรือชื่อที่ต้องการ)

### 3. Build Command

**⚠️ สำคัญ:** Workers ไม่ต้อง build แบบ Next.js

**ตัวเลือก:**

- **Option 1:** ปล่อยว่าง (ไม่ต้อง build)
- **Option 2:** `cd workers && npm install` (ติดตั้ง dependencies)

**แนะนำ:** ปล่อยว่าง หรือ `cd workers && npm install`

### 4. Deploy Command

**⚠️ สำคัญ:** ต้อง deploy จาก `workers/` folder

**ใส่:**

```
cd workers && npx wrangler deploy
```

หรือถ้าใช้ wrangler ที่ติดตั้งแล้ว:

```
cd workers && wrangler deploy
```

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: Workers อยู่ใน Subfolder

Cloudflare Dashboard อาจไม่รองรับ Workers ที่อยู่ใน subfolder (`workers/`)

**วิธีแก้:**

#### Option 1: Deploy จาก Local (แนะนำ)

```bash
cd workers
npm install
wrangler login
wrangler deploy
```

#### Option 2: สร้าง Workers Project แยก

1. สร้าง repository ใหม่สำหรับ Workers
2. Copy code จาก `workers/` folder
3. Deploy จาก repository นั้น

#### Option 3: ใช้ Wrangler CLI โดยตรง

ไม่ใช้ Dashboard แต่ใช้ CLI:

```bash
cd workers
wrangler login
wrangler deploy
```

---

## ✅ วิธีที่แนะนำ

### ใช้ Wrangler CLI (ง่ายที่สุด)

1. **เปิด Terminal/PowerShell**

2. **ไปที่ workers folder:**

```bash
cd workers
```

1. **ติดตั้ง dependencies:**

```bash
npm install
```

1. **Login (ถ้ายังไม่ได้):**

```bash
wrangler login
```

1. **สร้าง KV Namespace:**

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

1. **อัปเดต wrangler.toml:**
   - ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 5

2. **Deploy:**

```bash
wrangler deploy
```

---

## 📝 สรุป

**สำหรับ Cloudflare Dashboard:**

| Field | Value |
|-------|-------|
| **Repository** | `supufathai-bit/MonitorDns` |
| **Project name** | `sentinel-dns-api` |
| **Build command** | (ว่าง) หรือ `cd workers && npm install` |
| **Deploy command** | `cd workers && npx wrangler deploy` |

**หรือใช้ CLI (แนะนำ):**

```bash
cd workers
npm install
wrangler deploy
```

---

## 🎯 Next Steps

1. ✅ ตั้งค่าใน Dashboard หรือใช้ CLI
2. ⏳ สร้าง KV namespace
3. ⏳ อัปเดต wrangler.toml
4. ⏳ Deploy Workers
5. ⏳ Test API

---

## 💡 Tips

- **CLI ง่ายกว่า Dashboard** สำหรับ Workers ใน subfolder
- **KV namespace** ต้องสร้างก่อน deploy
- **Deploy command** ต้องรันจาก `workers/` folder
