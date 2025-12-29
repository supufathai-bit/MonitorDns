# 📦 สร้าง KV Namespace สำหรับ Workers

## 🎯 เป้าหมาย

สร้าง KV Namespace เพื่อเก็บข้อมูลจาก Android app

---

## 🚀 วิธีที่ 1: ใช้ Wrangler CLI (แนะนำ)

### Step 1: ติดตั้ง Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login

```bash
wrangler login
```

จะเปิด browser ให้ login Cloudflare

### Step 3: สร้าง KV Namespace

```bash
# Production namespace
wrangler kv:namespace create "SENTINEL_DATA"

# Preview namespace (สำหรับ development)
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

### Step 4: บันทึก ID ที่ได้

**ตัวอย่าง output:**
```
🌀  Creating namespace with title "SENTINEL_DATA"
✨  Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "SENTINEL_DATA", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

**บันทึก ID นี้ไว้!**

### Step 5: อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID
```

---

## 🌐 วิธีที่ 2: ใช้ Cloudflare Dashboard

### Step 1: ไปที่ Workers & Pages

1. เปิด https://dash.cloudflare.com
2. เลือก account ของคุณ
3. ไปที่ **Workers & Pages** → **KV**

### Step 2: สร้าง Namespace

1. กดปุ่ม **"Create a namespace"**
2. ใส่ชื่อ: `SENTINEL_DATA`
3. กด **"Add"**

### Step 3: บันทึก Namespace ID

1. ดู Namespace ที่สร้าง
2. **Copy ID** (จะเป็น string ยาวๆ)

### Step 4: อัปเดต wrangler.toml

แก้ไข `workers/wrangler.toml`:
- ใส่ ID ที่ได้จาก Dashboard

---

## 📝 ตัวอย่าง wrangler.toml

```toml
name = "sentinel-dns-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SENTINEL_DATA"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Production ID
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # Preview ID (optional)
```

---

## ✅ Checklist

- [ ] ติดตั้ง Wrangler
- [ ] Login Cloudflare
- [ ] สร้าง Production namespace
- [ ] สร้าง Preview namespace (optional)
- [ ] บันทึก ID ทั้งสอง
- [ ] อัปเดต wrangler.toml
- [ ] Deploy Workers

---

## 🎯 Next Steps

หลังจากสร้าง KV namespace แล้ว:

1. **อัปเดต wrangler.toml** ด้วย ID ที่ได้
2. **Deploy Workers:**
   ```bash
   cd workers
   wrangler deploy
   ```

---

## 💡 Tips

- **Production namespace:** ใช้สำหรับ production
- **Preview namespace:** ใช้สำหรับ development/testing
- **ID:** ต้องใส่ใน wrangler.toml ก่อน deploy
- **Binding:** ชื่อที่ใช้ใน code (`env.SENTINEL_DATA`)

---

## 🐛 Troubleshooting

### Error: "Namespace already exists"

- Namespace อาจถูกสร้างไว้แล้ว
- ตรวจสอบใน Dashboard หรือใช้ `wrangler kv:namespace list`

### Error: "Not authenticated"

- ต้อง `wrangler login` ก่อน

### Error: "Invalid namespace ID"

- ตรวจสอบว่า ID ถูกต้อง
- ID ต้องเป็น string ยาวๆ (32 characters)

---

## 📚 เอกสารเพิ่มเติม

- [Cloudflare KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler KV Commands](https://developers.cloudflare.com/workers/wrangler/commands/#kv)

