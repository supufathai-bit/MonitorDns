# 📱 Mobile App - วิธี Implement Trigger Check

## ❌ ปัญหาปัจจุบัน

- กด "RUN FULL SCAN" ในหน้าเว็บ
- Frontend ส่ง trigger ไปที่ Workers API
- แต่ Mobile App **ไม่เห็นการเช็คเกิดขึ้น**

## ✅ สาเหตุ

**Mobile App ยังไม่ได้ implement trigger polling**

---

## 🔧 วิธีแก้ไข

### Mobile App ต้องทำ

1. **Polling Trigger** (ทุก 30 วินาที) - **สำคัญมาก!**
2. **เช็ค DNS** เมื่อเห็น trigger
3. **Sync ผลลัพธ์** กลับไปที่ Workers

### ⚠️ ถ้าไม่ทำ

- Frontend จะ timeout หลัง 30 วินาที
- ผู้ใช้ต้องกด "CHECK NOW" ในแอพเอง
- ไม่ได้ประโยชน์จาก trigger system

---

## 📝 Implementation Guide

### 1. เพิ่ม API Client Method

```kotlin
// ApiClient.kt
suspend fun getTriggerCheck(): TriggerCheckResponse {
    val httpRequest = Request.Builder()
        .url("$baseUrl/api/trigger-check")
        .get()
        .build()
    
    val response = client.newCall(httpRequest).execute()
    val responseBody = response.body?.string() ?: ""
    
    return Gson().fromJson(responseBody, TriggerCheckResponse::class.java)
}
```

### 2. เพิ่ม Data Model

```kotlin
// TriggerCheckResponse.kt
data class TriggerCheckResponse(
    val success: Boolean,
    val triggered: Boolean,
    val timestamp: Long? = null,
    val requested_by: String? = null
)
```

### 3. Background Service Polling

```kotlin
// BackgroundService.kt หรือ WorkManager
class DNSCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val apiClient = ApiClient(applicationContext)
        
        // 1. ตรวจสอบ trigger
        val triggerResponse = apiClient.getTriggerCheck()
        
        if (triggerResponse.triggered) {
            // 2. ดึง domains
            val domainsResponse = apiClient.getDomains()
            
            // 3. เช็ค DNS
            val dnsCheckService = DNSCheckService(applicationContext)
            val results = domainsResponse.domains.map { domain ->
                dnsCheckService.checkDNS(domain)
            }
            
            // 4. Sync ผลลัพธ์
            val syncService = SyncService(applicationContext)
            syncService.syncResults(results)
            
            return Result.success()
        }
        
        return Result.success()
    }
}
```

### 4. Periodic Work (WorkManager)

```kotlin
// ใน Application class หรือ MainActivity
fun setupPeriodicCheck() {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()
    
    val periodicWork = PeriodicWorkRequestBuilder<DNSCheckWorker>(
        15, TimeUnit.MINUTES  // ทุก 15 นาที
    )
        .setConstraints(constraints)
        .build()
    
    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
            "dns_check_worker",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork
        )
}
```

### 5. หรือใช้ Foreground Service

```kotlin
// ForegroundService.kt
class DNSCheckForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startPolling()
        return START_STICKY
    }
    
    private fun startPolling() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                checkTrigger()
                handler.postDelayed(this, 30000) // ทุก 30 วินาที
            }
        }, 30000)
    }
    
    private suspend fun checkTrigger() {
        val apiClient = ApiClient(this)
        val triggerResponse = apiClient.getTriggerCheck()
        
        if (triggerResponse.triggered) {
            // เช็ค DNS และ sync
            performDNSCheck()
        }
    }
}
```

---

## 🔄 Flow การทำงาน

### เมื่อ Frontend กด "RUN FULL SCAN"

```
1. Frontend
   ↓ POST /api/trigger-check
2. Workers API
   ↓ เก็บ trigger flag ใน KV
3. Mobile App (Background Service)
   ↓ GET /api/trigger-check (polling ทุก 30 วินาที)
   ↓ เห็น triggered = true
   ↓ GET /api/mobile-sync/domains
   ↓ เช็ค DNS จาก ISP จริง
   ↓ POST /api/mobile-sync (sync ผลลัพธ์)
4. Workers API
   ↓ เก็บผลลัพธ์ใน KV
   ↓ Clear trigger flag
5. Frontend
   ↓ GET /api/results (polling ทุก 2 วินาที)
   ↓ เห็นผลลัพธ์ใหม่ → แสดงผล
```

---

## ⚙️ Configuration

### Polling Interval

**แนะนำ:**

- **Background Service:** ทุก 30 วินาที
- **Foreground:** ทุก 10-15 วินาที
- **เมื่อเปิด app:** เช็คทันที

### Battery Optimization

- ใช้ WorkManager แทน Background Service
- ตั้ง interval ที่เหมาะสม
- ใช้ Doze mode และ App Standby

---

## 🧪 ทดสอบ

### 1. ทดสอบ Trigger API

**เปิดใน browser:**

```
https://monitordnswoker.snowwhite04-01x.workers.dev/api/trigger-check
```

**ควรเห็น:**

```json
{
  "success": true,
  "triggered": false
}
```

### 2. ทดสอบ Frontend Trigger

1. เปิดหน้าเว็บ
2. กด "RUN FULL SCAN"
3. ตรวจสอบ Workers API:

   ```
   GET /api/trigger-check
   ```

   **ควรเห็น:** `{ "triggered": true }`

### 3. ทดสอบ Mobile App

1. เปิด Android app
2. App จะ polling `/api/trigger-check`
3. App เห็น trigger → เช็ค DNS
4. App sync ผลลัพธ์ → Frontend ได้ผลลัพธ์

---

## 📋 Checklist

### Mobile App Implementation

- [ ] เพิ่ม `getTriggerCheck()` ใน ApiClient
- [ ] เพิ่ม TriggerCheckResponse data model
- [ ] Implement Background Service หรือ WorkManager
- [ ] Polling `/api/trigger-check` ทุก 30 วินาที
- [ ] เช็ค DNS เมื่อเห็น trigger
- [ ] Sync ผลลัพธ์กลับไปที่ Workers

---

## 💡 Tips

### 1. Polling Frequency

**ไม่บ่อยเกินไป:**

- ทุก 30 วินาที (ประหยัด battery)
- หรือทุก 15 นาที (WorkManager)

**ไม่ช้าเกินไป:**

- ถ้าช้าเกินไป → Frontend timeout (30 วินาที)

### 2. Error Handling

```kotlin
try {
    val triggerResponse = apiClient.getTriggerCheck()
    if (triggerResponse.triggered) {
        performDNSCheck()
    }
} catch (e: Exception) {
    Log.e("DNSCheck", "Error checking trigger: ${e.message}")
    // Retry later
}
```

### 3. Network Check

```kotlin
if (!isNetworkAvailable()) {
    return // Skip if no network
}
```

---

## 🎯 สรุป

**ตอนนี้:**

- ✅ Frontend ส่ง trigger ไปที่ Workers
- ✅ Workers เก็บ trigger flag
- ⏳ **Mobile App ต้อง implement trigger polling**

**Next:**

- Mobile App ต้อง polling `/api/trigger-check`
- Mobile App ต้องเช็ค DNS เมื่อเห็น trigger
- Mobile App ต้อง sync ผลลัพธ์กลับไปที่ Workers

**ดู `ANDROID_APP_DESIGN.md` สำหรับ code examples เพิ่มเติม!** 🎉
