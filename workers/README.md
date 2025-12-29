# ☁️ Cloudflare Workers API

API สำหรับ Sentinel DNS Monitor บน Cloudflare Workers

---

## 🚀 Quick Start

### 1. ติดตั้ง Wrangler

```bash
npm install -g wrangler
```

### 2. Login

```bash
wrangler login
```

### 3. สร้าง KV Namespace

```bash
# Production
wrangler kv:namespace create "SENTINEL_DATA"

# Preview
wrangler kv:namespace create "SENTINEL_DATA" --preview
```

### 4. อัปเดต wrangler.toml

แก้ไข `wrangler.toml`:
- ใส่ KV namespace ID ที่ได้จากขั้นตอนที่ 3

### 5. Deploy

```bash
npm install
wrangler deploy
```

---

## 📋 API Endpoints

### POST /api/mobile-sync

รับข้อมูล DNS check จาก Android app

**Request:**
```json
{
  "device_id": "device-123",
  "device_info": {
    "isp": "AIS",
    "network_type": "WiFi"
  },
  "results": [
    {
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000
    }
  ]
}
```

### GET /api/mobile-sync/domains

ดึง domains ที่ต้องเช็ค

**Response:**
```json
{
  "success": true,
  "domains": ["ufathai.win", "ufathai.com"],
  "interval": 3600000
}
```

### GET /api/results

ดึงผลลัพธ์ล่าสุด

**Query params:**
- `hostname` (optional)
- `isp` (optional)

---

## 🔧 Configuration

### Environment Variables

ใน Cloudflare Dashboard → Workers → Settings → Variables:

- `API_KEY` (optional) - สำหรับ authentication

### KV Namespace

ต้องสร้าง KV namespace ก่อน:
- Name: `SENTINEL_DATA`
- Binding: `SENTINEL_DATA`

---

## 📝 Notes

- **DNS Check (`/api/check`)**: ไม่รองรับใน Workers (ไม่มี UDP support)
- ใช้ Android app หรือ VPS สำหรับ DNS checking
- Workers ใช้สำหรับเก็บและดึงข้อมูลจาก mobile app

---

## 🧪 Testing

```bash
# Test mobile sync
curl -X POST https://your-workers.workers.dev/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test",
    "device_info": {"isp": "AIS", "network_type": "WiFi"},
    "results": [{
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000
    }]
  }'

# Test get domains
curl https://your-workers.workers.dev/api/mobile-sync/domains

# Test get results
curl https://your-workers.workers.dev/api/results
```

---

## 🎯 Next Steps

1. ✅ Create Workers project
2. ⏳ Create KV namespace
3. ⏳ Update wrangler.toml
4. ⏳ Deploy Workers
5. ⏳ Update frontend to use Workers URL

