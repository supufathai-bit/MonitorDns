# ⚡ Quick Workers Deploy

## ✅ สถานะ

- ✅ Frontend: https://monitordns.pages.dev/ (ทำงานแล้ว!)
- ⏳ Workers: ยังไม่ได้ deploy

---

## 🚀 Deploy Workers (2 วิธี)

### วิธีที่ 1: ใช้ Dashboard (ที่ตั้งค่าไว้แล้ว)

**⚠️ แต่:** ต้องสร้าง KV namespace ก่อน

**ขั้นตอน:**
1. กด **"Deploy"** ใน Dashboard
2. ถ้า error → ต้องสร้าง KV namespace ก่อน (ใช้วิธีที่ 2)

---

### วิธีที่ 2: ใช้ CLI (แนะนำ - แน่ใจกว่า)

#### 1. เปิด Terminal/PowerShell

#### 2. ไปที่ workers folder

```bash
cd workers
```

#### 3. ติดตั้ง Wrangler (ถ้ายังไม่มี)

```bash
npm install -g wrangler
```

#### 4. Login

```bash
wrangler login
```

#### 5. ติดตั้ง dependencies

```bash
npm install
```

#### 6. สร้าง KV Namespace

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้** (จะใช้ในขั้นตอนถัดไป)

#### 7. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
- ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 6

#### 8. Deploy

```bash
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### เพิ่ม Environment Variable

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. เพิ่ม:
   - **Variable:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.workers.dev`
4. **Save**
5. **Redeploy** (อัตโนมัติ)

---

## ✅ Checklist

- [x] Frontend deploy สำเร็จ
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Frontend ทำงานแล้ว
- ⏳ ต้อง deploy Workers
- ⏳ เชื่อมต่อ Frontend กับ Workers

**Next:** Deploy Workers แล้วเพิ่ม environment variable!


## ✅ สถานะ

- ✅ Frontend: https://monitordns.pages.dev/ (ทำงานแล้ว!)
- ⏳ Workers: ยังไม่ได้ deploy

---

## 🚀 Deploy Workers (2 วิธี)

### วิธีที่ 1: ใช้ Dashboard (ที่ตั้งค่าไว้แล้ว)

**⚠️ แต่:** ต้องสร้าง KV namespace ก่อน

**ขั้นตอน:**
1. กด **"Deploy"** ใน Dashboard
2. ถ้า error → ต้องสร้าง KV namespace ก่อน (ใช้วิธีที่ 2)

---

### วิธีที่ 2: ใช้ CLI (แนะนำ - แน่ใจกว่า)

#### 1. เปิด Terminal/PowerShell

#### 2. ไปที่ workers folder

```bash
cd workers
```

#### 3. ติดตั้ง Wrangler (ถ้ายังไม่มี)

```bash
npm install -g wrangler
```

#### 4. Login

```bash
wrangler login
```

#### 5. ติดตั้ง dependencies

```bash
npm install
```

#### 6. สร้าง KV Namespace

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้** (จะใช้ในขั้นตอนถัดไป)

#### 7. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
- ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 6

#### 8. Deploy

```bash
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### เพิ่ม Environment Variable

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. เพิ่ม:
   - **Variable:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.workers.dev`
4. **Save**
5. **Redeploy** (อัตโนมัติ)

---

## ✅ Checklist

- [x] Frontend deploy สำเร็จ
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Frontend ทำงานแล้ว
- ⏳ ต้อง deploy Workers
- ⏳ เชื่อมต่อ Frontend กับ Workers

**Next:** Deploy Workers แล้วเพิ่ม environment variable!


## ✅ สถานะ

- ✅ Frontend: https://monitordns.pages.dev/ (ทำงานแล้ว!)
- ⏳ Workers: ยังไม่ได้ deploy

---

## 🚀 Deploy Workers (2 วิธี)

### วิธีที่ 1: ใช้ Dashboard (ที่ตั้งค่าไว้แล้ว)

**⚠️ แต่:** ต้องสร้าง KV namespace ก่อน

**ขั้นตอน:**
1. กด **"Deploy"** ใน Dashboard
2. ถ้า error → ต้องสร้าง KV namespace ก่อน (ใช้วิธีที่ 2)

---

### วิธีที่ 2: ใช้ CLI (แนะนำ - แน่ใจกว่า)

#### 1. เปิด Terminal/PowerShell

#### 2. ไปที่ workers folder

```bash
cd workers
```

#### 3. ติดตั้ง Wrangler (ถ้ายังไม่มี)

```bash
npm install -g wrangler
```

#### 4. Login

```bash
wrangler login
```

#### 5. ติดตั้ง dependencies

```bash
npm install
```

#### 6. สร้าง KV Namespace

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้** (จะใช้ในขั้นตอนถัดไป)

#### 7. อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
- ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 6

#### 8. Deploy

```bash
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### เพิ่ม Environment Variable

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. เพิ่ม:
   - **Variable:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.workers.dev`
4. **Save**
5. **Redeploy** (อัตโนมัติ)

---

## ✅ Checklist

- [x] Frontend deploy สำเร็จ
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 สรุป

**ตอนนี้:**
- ✅ Frontend ทำงานแล้ว
- ⏳ ต้อง deploy Workers
- ⏳ เชื่อมต่อ Frontend กับ Workers

**Next:** Deploy Workers แล้วเพิ่ม environment variable!

