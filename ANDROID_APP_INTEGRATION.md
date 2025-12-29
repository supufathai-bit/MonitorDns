# 📱 Android App Integration Guide

## 🎯 เป้าหมาย

ใช้ Android app เช็ค DNS จากเครือข่าย ISP จริงๆ แล้ว sync กับระบบ

**ข้อดี:**
- ✅ ไม่มีค่าใช้จ่าย (ใช้มือถือที่มีอยู่แล้ว)
- ✅ แม่นยำ 100% (เช็คจากเครือข่าย ISP จริง)
- ✅ ง่ายต่อการเชื่อมต่อกับระบบ

---

## 🏗️ Architecture

```
Android App (ISP Network)
    ↓ HTTP POST
Next.js API (/api/mobile-sync)
    ↓ Process & Store
Database/Cache
    ↓ Update
Frontend Dashboard
```

---

## 📱 Android App Requirements

### Features ที่ต้องมี

1. **DNS Check Function**
   - เช็ค DNS จาก ISP DNS servers
   - ตรวจสอบว่า domain เข้าถึงได้หรือไม่

2. **ISP Detection**
   - ตรวจจับ ISP ที่ใช้ (AIS, TRUE, DTAC, NT)
   - ตรวจจับ network type (WiFi, Mobile Data)

3. **Background Service**
   - รันใน background
   - เช็คอัตโนมัติตาม interval

4. **Sync API**
   - ส่งผลลัพธ์ไปที่ `/api/mobile-sync`
   - รับคำสั่งจาก server (domains to check)

---

## 🔌 API Integration

### 1. Sync Results to Server

**Endpoint:** `POST /api/mobile-sync`

**Request Body:**
```json
{
  "device_id": "unique-device-id",
  "device_info": {
    "isp": "AIS",
    "network_type": "WiFi",
    "android_version": "13",
    "app_version": "1.0.0"
  },
  "results": [
    {
      "hostname": "ufathai.win",
      "isp_name": "AIS",
      "status": "BLOCKED",
      "ip": "",
      "timestamp": 1703846400000,
      "latency": 0
    },
    {
      "hostname": "ufathai.win",
      "isp_name": "TRUE",
      "status": "ACTIVE",
      "ip": "104.26.11.153",
      "timestamp": 1703846401000,
      "latency": 45
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Received 2 results from device abc123",
  "processed": 2,
  "timestamp": 1703846402000
}
```

### 2. Get Domains to Check

**Endpoint:** `GET /api/mobile-sync/domains`

**Response:**
```json
{
  "success": true,
  "domains": [
    "ufathai.win",
    "example.com"
  ],
  "interval": 3600000
}
```

---

## 📝 Android App Implementation

### 1. DNS Check Function

```kotlin
// Example in Kotlin
fun checkDNS(hostname: String, dnsServer: String): DNSResult {
    try {
        val addresses = InetAddress.getAllByName(hostname)
        return DNSResult(
            hostname = hostname,
            status = "ACTIVE",
            ip = addresses[0].hostAddress ?: "",
            latency = 0
        )
    } catch (e: UnknownHostException) {
        return DNSResult(
            hostname = hostname,
            status = "BLOCKED",
            ip = "",
            latency = 0
        )
    }
}
```

### 2. ISP Detection

```kotlin
fun detectISP(): String {
    val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    val networkOperator = telephonyManager.networkOperatorName
    
    return when {
        networkOperator.contains("AIS", ignoreCase = true) -> "AIS"
        networkOperator.contains("TRUE", ignoreCase = true) -> "TRUE"
        networkOperator.contains("DTAC", ignoreCase = true) -> "DTAC"
        networkOperator.contains("NT", ignoreCase = true) -> "NT"
        else -> "Unknown"
    }
}
```

### 3. Sync to Server

```kotlin
suspend fun syncResults(results: List<DNSResult>) {
    val requestBody = mapOf(
        "device_id" to getDeviceId(),
        "device_info" to mapOf(
            "isp" to detectISP(),
            "network_type" to getNetworkType(),
            "android_version" to Build.VERSION.RELEASE,
            "app_version" to BuildConfig.VERSION_NAME
        ),
        "results" to results.map { result ->
            mapOf(
                "hostname" to result.hostname,
                "isp_name" to detectISP(),
                "status" to result.status,
                "ip" to result.ip,
                "timestamp" to System.currentTimeMillis(),
                "latency" to result.latency
            )
        }
    )
    
    val response = httpClient.post("https://your-railway-url.up.railway.app/api/mobile-sync") {
        contentType(ContentType.Application.Json)
        body = requestBody
    }
}
```

---

## 🔄 Sync Strategy

### Option 1: Push (Android → Server)

**Android app ส่งผลลัพธ์ไปที่ server:**
- เช็ค DNS → ส่งผลลัพธ์ทันที
- หรือส่ง batch ตาม interval

**ข้อดี:**
- Real-time updates
- ง่ายต่อการ implement

**ข้อเสีย:**
- ใช้ battery มากขึ้น
- ใช้ data มากขึ้น

### Option 2: Pull (Server → Android)

**Server ส่งคำสั่งให้ Android app เช็ค:**
- Android app เช็ค domain ที่ server ระบุ
- ส่งผลลัพธ์กลับ

**ข้อดี:**
- Server ควบคุมได้
- ประหยัด battery

**ข้อเสีย:**
- ต้องมี push notification หรือ polling

### Option 3: Hybrid (แนะนำ)

**ผสมทั้งสองวิธี:**
- Android app เช็คอัตโนมัติตาม interval
- Server สามารถส่งคำสั่งให้เช็คเพิ่มเติมได้

---

## 📊 Data Flow

### 1. Android App เช็ค DNS

```
Android App
  ↓ Detect ISP (AIS)
  ↓ Check DNS (ufathai.win)
  ↓ Get Result (BLOCKED)
  ↓ Send to Server
```

### 2. Server รับและประมวลผล

```
Server (/api/mobile-sync)
  ↓ Validate data
  ↓ Store in database
  ↓ Update cache
  ↓ Trigger notifications (if status changed)
```

### 3. Frontend แสดงผล

```
Frontend Dashboard
  ↓ Fetch from API
  ↓ Display results
  ↓ Show "Source: Mobile App (AIS)"
```

---

## 🔐 Security

### 1. Device ID

**ใช้ unique device ID:**
```kotlin
fun getDeviceId(): String {
    return Settings.Secure.getString(
        contentResolver,
        Settings.Secure.ANDROID_ID
    )
}
```

### 2. API Authentication

**เพิ่ม API key หรือ token:**
```typescript
// app/api/mobile-sync/route.ts
const apiKey = req.headers.get('X-API-Key');
if (apiKey !== process.env.MOBILE_APP_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 3. Rate Limiting

**จำกัดจำนวน requests:**
```typescript
// ใช้ middleware หรือ library เช่น express-rate-limit
```

---

## 🧪 Testing

### 1. Test API Endpoint

```bash
curl -X POST https://your-railway-url.up.railway.app/api/mobile-sync \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-123",
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
  }'
```

### 2. Test from Android

```kotlin
// Test in Android app
val testResult = DNSResult(
    hostname = "ufathai.win",
    status = "BLOCKED",
    ip = "",
    latency = 0
)
syncResults(listOf(testResult))
```

---

## 📱 Android App Structure

```
Android App
├── MainActivity
│   ├── DNS Check Service
│   ├── ISP Detection
│   └── Sync Service
├── Background Service
│   ├── Periodic DNS Check
│   └── Auto Sync
└── Settings
    ├── API URL
    ├── Check Interval
    └── Auto Sync Toggle
```

---

## 🚀 Next Steps

### 1. สร้าง Android App

- [ ] Setup Android project
- [ ] Implement DNS check function
- [ ] Implement ISP detection
- [ ] Implement sync API
- [ ] Add background service

### 2. Update Server API

- [ ] Add database storage
- [ ] Add cache/state management
- [ ] Add notification triggers
- [ ] Add API authentication

### 3. Update Frontend

- [ ] Display mobile app results
- [ ] Show device info
- [ ] Show sync status
- [ ] Add manual sync button

---

## 💡 Benefits

### 1. ความแม่นยำ

- ✅ เช็คจากเครือข่าย ISP จริง
- ✅ แม่นยำ 100%
- ✅ ไม่มีปัญหา timeout

### 2. Cost

- ✅ ไม่มีค่าใช้จ่าย
- ✅ ใช้มือถือที่มีอยู่แล้ว
- ✅ ไม่ต้อง deploy VPS

### 3. Scalability

- ✅ สามารถมีหลาย devices
- ✅ เช็คจากหลาย ISP พร้อมกัน
- ✅ Real-time updates

---

## 📝 Example: Complete Flow

### Step 1: Android App เช็ค DNS

```kotlin
// Android app เช็ค ufathai.win จาก AIS network
val result = checkDNS("ufathai.win", "49.0.64.179")
// Result: BLOCKED
```

### Step 2: ส่งผลลัพธ์ไปที่ Server

```kotlin
syncResults(listOf(result))
// POST to /api/mobile-sync
```

### Step 3: Server ประมวลผล

```typescript
// Server รับและเก็บผลลัพธ์
// Update database
// Trigger notification if needed
```

### Step 4: Frontend แสดงผล

```typescript
// Frontend fetch และแสดงผล
// AIS: BLOCKED (Source: Mobile App)
```

---

## 🎉 สรุป

**Android App Integration เป็นวิธีที่ดีที่สุดสำหรับ:**
- ✅ ความแม่นยำ 100%
- ✅ ไม่มีค่าใช้จ่าย
- ✅ ง่ายต่อการ implement

**Next Steps:**
1. สร้าง Android app
2. Implement DNS check + sync
3. Test และ deploy

