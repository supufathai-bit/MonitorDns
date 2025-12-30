# 🚀 Workers Deploy Steps (ฉบับย่อ)

## ✅ สถานะปัจจุบัน

- ✅ Frontend ทำงานแล้ว: <https://monitordns.pages.dev/>
- ⏳ Workers ยังไม่ได้ deploy

---

## 📋 ขั้นตอน Deploy Workers

### Option 1: ใช้ Dashboard (ที่ตั้งค่าไว้แล้ว)

1. **กดปุ่ม "Deploy"** ใน Dashboard
2. **รอ deploy เสร็จ**
3. **จะได้ URL:** `https://monitordnswoker.workers.dev` (หรือชื่อที่ตั้ง)

**⚠️ แต่:** อาจมีปัญหาเพราะต้องสร้าง KV namespace ก่อน

---

### Option 2: ใช้ CLI (แนะนำ - แน่ใจกว่า)

#### Step 1: ติดตั้ง Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Login

```bash
wrangler login
```

#### Step 3: ไปที่ workers folder

```bash
cd workers
```

#### Step 4: ติดตั้ง dependencies

```bash
npm install
```

#### Step 5: สร้าง KV Namespace

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

**บันทึก ID ที่ได้:**

- Production ID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Preview ID: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

#### Step 6: อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID
```

#### Step 7: Deploy

```bash
wrangler deploy
```

**จะได้ URL:** `https://sentinel-dns-api.workers.dev`

---

## 🔗 เชื่อมต่อ Frontend กับ Workers

### เพิ่ม Environment Variable ใน Cloudflare Pages

1. ไปที่ **Cloudflare Dashboard** → **Pages** → **monitordns**
2. **Settings** → **Environment variables**
3. เพิ่ม:
   - **Variable name:** `NEXT_PUBLIC_WORKERS_URL`
   - **Value:** `https://sentinel-dns-api.workers.dev` (หรือ URL ที่ได้จาก Workers)
4. **Save**
5. **Redeploy** (Cloudflare จะ rebuild อัตโนมัติ)

---

## ✅ Checklist

- [x] Frontend deploy สำเร็จ
- [ ] ติดตั้ง Wrangler
- [ ] สร้าง KV namespace
- [ ] อัปเดต wrangler.toml
- [ ] Deploy Workers
- [ ] เพิ่ม `NEXT_PUBLIC_WORKERS_URL` ใน Pages
- [ ] Test API

---

## 🎯 Next Steps

1. **Deploy Workers** (ใช้ Dashboard หรือ CLI)
2. **เพิ่ม Environment Variable** ใน Pages
3. **Test API** ว่าทำงาน

---

## 💡 Tips

- **Dashboard:** กด Deploy ได้เลย แต่ต้องสร้าง KV namespace ก่อน
- **CLI:** แนะนำ เพราะแน่ใจกว่าและเห็น error ชัดเจน
- **KV Namespace:** ต้องสร้างก่อน deploy ครั้งแรก
