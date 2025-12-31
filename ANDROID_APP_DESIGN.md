# 📱 Android App Design Guide

## 🎯 เป้าหมาย

ออกแบบ Android app สำหรับเช็ค DNS จากเครือข่าย ISP จริงๆ และ sync กับระบบ

---

## 🎨 UI/UX Design

### 1. Main Screen (Dashboard)

**Layout:**

```
┌─────────────────────────────────┐
│  🛡️ Sentinel DNS Monitor        │
│  Status: ✅ Active               │
├─────────────────────────────────┤
│  📊 Current ISP: AIS            │
│  📡 Network: WiFi               │
│  🔄 Last Sync: 2 mins ago       │
├─────────────────────────────────┤
│  📋 Domains to Check:           │
│                                 │
│  ☑️ ufathai.win                │
│     Status: BLOCKED            │
│     Last Check: 5 mins ago     │
│                                 │
│  ☑️ ufathai.com                │
│     Status: ACTIVE             │
│     Last Check: 3 mins ago     │
│                                 │
│  ☑️ www.zec777.com             │
│     Status: ACTIVE             │
│     Last Check: 1 min ago      │
├─────────────────────────────────┤
│  [🔄 Check Now]  [⚙️ Settings] │
└─────────────────────────────────┘
```

**Features:**

- แสดง ISP ปัจจุบัน
- แสดงสถานะการ sync
- แสดง domains ที่ต้องเช็ค
- ปุ่ม Check Now
- ปุ่ม Settings

---

### 2. Settings Screen

**Layout:**

```
┌─────────────────────────────────┐
│  ⚙️ Settings                    │
├─────────────────────────────────┤
│  🌐 Server URL                 │
│  [https://your-url.railway.app]│
│                                 │
│  ⏰ Auto Check Interval        │
│  [1 hour] ▼                    │
│                                 │
│  📱 Background Service         │
│  [✅ Enabled]                  │
│                                 │
│  🔔 Notifications              │
│  [✅ Enabled]                  │
│                                 │
│  📊 Show Device Info           │
│  [✅ Enabled]                  │
├─────────────────────────────────┤
│  [💾 Save]  [🔄 Test Connection] │
└─────────────────────────────────┘
```

**Features:**

- ตั้งค่า Server URL
- ตั้งค่า Auto Check Interval
- เปิด/ปิด Background Service
- เปิด/ปิด Notifications
- Test Connection

---

### 3. Check Results Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📊 Check Results               │
│  Domain: ufathai.win            │
├─────────────────────────────────┤
│  🌐 ISP: AIS                    │
│  Status: ❌ BLOCKED             │
│  IP: -                          │
│  Latency: 0ms                   │
│  Time: 2 mins ago               │
├─────────────────────────────────┤
│  📡 Network Info                │
│  Type: WiFi                     │
│  SSID: HomeNetwork              │
│  Signal: ████████░░ 80%         │
├─────────────────────────────────┤
│  [🔄 Check Again]  [📤 Sync]    │
└─────────────────────────────────┘
```

**Features:**

- แสดงผลการเช็ค
- แสดง network info
- ปุ่ม Check Again
- ปุ่ม Sync

---

### 4. Sync Status Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📤 Sync Status                  │
├─────────────────────────────────┤
│  ✅ Last Sync: Success          │
│  📅 Time: 2 mins ago            │
│  📊 Results: 3 domains          │
│                                 │
│  📋 Sync History:               │
│                                 │
│  ✅ 2 mins ago - 3 domains     │
│  ✅ 1 hour ago - 3 domains     │
│  ✅ 2 hours ago - 3 domains     │
│  ❌ 3 hours ago - Failed        │
│                                 │
├─────────────────────────────────┤
│  [🔄 Sync Now]  [📊 View Logs] │
└─────────────────────────────────┘
```

**Features:**

- แสดง sync status
- แสดง sync history
- ปุ่ม Sync Now
- View Logs

---

## 🏗️ Architecture

### App Structure

```
Android App
├── UI Layer
│   ├── MainActivity (Dashboard)
│   ├── SettingsActivity
│   ├── CheckResultsActivity
│   └── SyncStatusActivity
├── Service Layer
│   ├── DNSCheckService
│   ├── SyncService
│   └── BackgroundService
├── Data Layer
│   ├── LocalDatabase (Room)
│   ├── SharedPreferences
│   └── Network API Client
└── Utils
    ├── ISPDetector
    ├── NetworkUtils
    └── NotificationManager
```

---

## 📱 Features

### 1. Core Features

**DNS Check:**

- เช็ค DNS จาก ISP DNS servers
- ตรวจจับ ISP อัตโนมัติ
- แสดงผลลัพธ์ทันที

**Auto Sync:**

- เช็คอัตโนมัติตาม interval
- Sync ผลลัพธ์ไปที่ server
- Background service

**Notifications:**

- แจ้งเตือนเมื่อ domain ถูกบล็อก
- แจ้งเตือนเมื่อ sync สำเร็จ/ล้มเหลว

### 2. Advanced Features

**Multi-ISP Support:**

- เช็คจากหลาย ISP (ถ้าเปลี่ยน network)
- เก็บผลลัพธ์แยกตาม ISP

**Offline Mode:**

- เก็บผลลัพธ์ใน local database
- Sync เมื่อ online

**History:**

- ดูประวัติการเช็ค
- Export เป็น CSV/JSON

---

## 💻 Implementation

### 1. Project Structure

```
app/
├── src/main/java/com/sentinel/dns/
│   ├── ui/
│   │   ├── MainActivity.kt
│   │   ├── SettingsActivity.kt
│   │   ├── CheckResultsActivity.kt
│   │   └── SyncStatusActivity.kt
│   ├── service/
│   │   ├── DNSCheckService.kt
│   │   ├── SyncService.kt
│   │   └── BackgroundService.kt
│   ├── data/
│   │   ├── database/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── DomainDao.kt
│   │   │   └── CheckResultDao.kt
│   │   ├── api/
│   │   │   └── ApiClient.kt
│   │   └── repository/
│   │       └── DomainRepository.kt
│   ├── utils/
│   │   ├── ISPDetector.kt
│   │   ├── NetworkUtils.kt
│   │   └── NotificationManager.kt
│   └── model/
│       ├── Domain.kt
│       ├── CheckResult.kt
│       └── DeviceInfo.kt
└── res/
    ├── layout/
    │   ├── activity_main.xml
    │   ├── activity_settings.xml
    │   └── item_domain.xml
    └── values/
        ├── strings.xml
        └── colors.xml
```

---

### 2. Key Components

#### A. ISP Detector

```kotlin
// ISPDetector.kt
class ISPDetector(private val context: Context) {
    
    fun detectISP(): String {
        val telephonyManager = context.getSystemService(
            Context.TELEPHONY_SERVICE
        ) as TelephonyManager
        
        val networkOperator = telephonyManager.networkOperatorName
        
        return when {
            networkOperator.contains("AIS", ignoreCase = true) -> "AIS"
            networkOperator.contains("TRUE", ignoreCase = true) -> "TRUE"
            networkOperator.contains("DTAC", ignoreCase = true) -> "DTAC"
            networkOperator.contains("NT", ignoreCase = true) -> "NT"
            else -> "Unknown"
        }
    }
    
    fun getNetworkType(): String {
        val connectivityManager = context.getSystemService(
            Context.CONNECTIVITY_SERVICE
        ) as ConnectivityManager
        
        val network = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        
        return when {
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WiFi"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "Mobile Data"
            else -> "Unknown"
        }
    }
}
```

#### B. DNS Check Service

```kotlin
// DNSCheckService.kt
class DNSCheckService(private val context: Context) {
    
    suspend fun checkDNS(hostname: String): CheckResult {
        return try {
            val startTime = System.currentTimeMillis()
            
            // Try to resolve hostname
            val addresses = InetAddress.getAllByName(hostname)
            val latency = System.currentTimeMillis() - startTime
            
            CheckResult(
                hostname = hostname,
                status = "ACTIVE",
                ip = addresses[0].hostAddress ?: "",
                latency = latency.toInt(),
                timestamp = System.currentTimeMillis()
            )
        } catch (e: UnknownHostException) {
            CheckResult(
                hostname = hostname,
                status = "BLOCKED",
                ip = "",
                latency = 0,
                timestamp = System.currentTimeMillis()
            )
        }
    }
}
```

#### C. Sync Service

```kotlin
// SyncService.kt
class SyncService(private val context: Context) {
    
    private val apiClient = ApiClient(context)
    private val ispDetector = ISPDetector(context)
    
    suspend fun syncResults(results: List<CheckResult>): SyncResult {
        return try {
            val deviceInfo = DeviceInfo(
                isp = ispDetector.detectISP(),
                networkType = ispDetector.getNetworkType(),
                androidVersion = Build.VERSION.RELEASE,
                appVersion = BuildConfig.VERSION_NAME
            )
            
            val request = SyncRequest(
                deviceId = getDeviceId(),
                deviceInfo = deviceInfo,
                results = results.map { result ->
                    SyncResultItem(
                        hostname = result.hostname,
                        ispName = deviceInfo.isp,
                        status = result.status,
                        ip = result.ip,
                        timestamp = result.timestamp,
                        latency = result.latency
                    )
                }
            )
            
            val response = apiClient.syncResults(request)
            
            SyncResult(
                success = true,
                message = response.message,
                timestamp = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            SyncResult(
                success = false,
                message = e.message ?: "Unknown error",
                timestamp = System.currentTimeMillis()
            )
        }
    }
    
    private fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
    }
}
```

#### D. API Client

```kotlin
// ApiClient.kt
class ApiClient(private val context: Context) {
    
    private val baseUrl = getServerUrl()
    private val client = OkHttpClient()
    
    suspend fun syncResults(request: SyncRequest): SyncResponse {
        val json = Gson().toJson(request)
        val requestBody = json.toRequestBody("application/json".toMediaType())
        
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync")
            .post(requestBody)
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, SyncResponse::class.java)
    }
    
    suspend fun getDomains(): DomainsResponse {
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync/domains")
            .get()
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, DomainsResponse::class.java)
    }
    
    private fun getServerUrl(): String {
        val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
        return prefs.getString("server_url", DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }
}
```

---

### 3. Main Activity

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var domainAdapter: DomainAdapter
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupRecyclerView()
        setupObservers()
        setupClickListeners()
        
        // Load domains
        viewModel.loadDomains()
    }
    
    private fun setupRecyclerView() {
        domainAdapter = DomainAdapter { domain ->
            // Show check results
            startActivity(CheckResultsActivity.newIntent(this, domain))
        }
        binding.recyclerViewDomains.adapter = domainAdapter
    }
    
    private fun setupObservers() {
        viewModel.domains.observe(this) { domains ->
            domainAdapter.submitList(domains)
        }
        
        viewModel.currentISP.observe(this) { isp ->
            binding.textCurrentISP.text = "Current ISP: $isp"
        }
        
        viewModel.syncStatus.observe(this) { status ->
            binding.textSyncStatus.text = "Last Sync: $status"
        }
    }
    
    private fun setupClickListeners() {
        binding.buttonCheckNow.setOnClickListener {
            viewModel.checkAllDomains()
        }
        
        binding.buttonSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }
}
```

---

### 4. Background Service

```kotlin
// BackgroundService.kt
class BackgroundService : Service() {
    
    private val syncService: SyncService by lazy {
        SyncService(applicationContext)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startPeriodicSync()
        return START_STICKY
    }
    
    private fun startPeriodicSync() {
        val handler = Handler(Looper.getMainLooper())
        
        handler.postDelayed(object : Runnable {
            override fun run() {
                syncAllDomains()
                handler.postDelayed(this, getSyncInterval())
            }
        }, getSyncInterval())
    }
    
    private suspend fun syncAllDomains() {
        // Get domains to check
        val domains = apiClient.getDomains()
        
        // Check each domain
        val results = domains.domains.map { domain ->
            dnsCheckService.checkDNS(domain)
        }
        
        // Sync results
        syncService.syncResults(results)
    }
    
    private fun getSyncInterval(): Long {
        val prefs = getSharedPreferences("settings", MODE_PRIVATE)
        return prefs.getLong("sync_interval", 3600000) // 1 hour default
    }
}
```

---

## 🎨 Color Scheme

```xml
<!-- colors.xml -->
<resources>
    <color name="primary">#00D4AA</color>
    <color name="primary_dark">#00B894</color>
    <color name="accent">#0984E3</color>
    <color name="background">#1E1E2E</color>
    <color name="surface">#2D2D44</color>
    <color name="text_primary">#FFFFFF</color>
    <color name="text_secondary">#B0B0B0</color>
    <color name="status_active">#00D4AA</color>
    <color name="status_blocked">#E74C3C</color>
    <color name="status_error">#F39C12</color>
</resources>
```

---

## 📋 Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🚀 Next Steps

### 1. Setup Project

```bash
# สร้าง Android project
# ใช้ Android Studio
# Template: Empty Activity
# Language: Kotlin
# Minimum SDK: 21 (Android 5.0)
```

### 2. Add Dependencies

```gradle
// build.gradle (app)
dependencies {
    // Networking
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Room Database
    implementation 'androidx.room:room-runtime:2.6.1'
    kapt 'androidx.room:room-compiler:2.6.1'
    
    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### 3. Implement Features

- [ ] ISP Detection
- [ ] DNS Check Service
- [ ] Sync Service
- [ ] Background Service
- [ ] UI Components
- [ ] Local Database

---

## 💡 Tips

### 1. Battery Optimization

- ใช้ WorkManager แทน Background Service
- ตั้ง interval ที่เหมาะสม (ไม่บ่อยเกินไป)
- ใช้ Doze mode และ App Standby

### 2. Network Efficiency

- Batch sync results
- Compress data ถ้าจำเป็น
- Retry mechanism

### 3. User Experience

- แสดง loading state
- Error handling ที่ดี
- Offline support

---

## 📝 Summary

**UI Design:**

- Dashboard (Main Screen)
- Settings Screen
- Check Results Screen
- Sync Status Screen

**Architecture:**

- UI Layer
- Service Layer
- Data Layer
- Utils

**Key Features:**

- DNS Check
- Auto Sync
- Notifications
- Offline Support

**Implementation:**

- Kotlin
- Room Database
- OkHttp
- Coroutines
- WorkManager

---

## 🎉 Ready to Build

ตอนนี้มี:

- ✅ UI/UX Design
- ✅ Architecture
- ✅ Code Examples
- ✅ Implementation Guide

**Next:** สร้าง Android project และเริ่ม implement!

## 🎯 เป้าหมาย

ออกแบบ Android app สำหรับเช็ค DNS จากเครือข่าย ISP จริงๆ และ sync กับระบบ

---

## 🎨 UI/UX Design

### 1. Main Screen (Dashboard)

**Layout:**

```
┌─────────────────────────────────┐
│  🛡️ Sentinel DNS Monitor        │
│  Status: ✅ Active               │
├─────────────────────────────────┤
│  📊 Current ISP: AIS            │
│  📡 Network: WiFi               │
│  🔄 Last Sync: 2 mins ago       │
├─────────────────────────────────┤
│  📋 Domains to Check:           │
│                                 │
│  ☑️ ufathai.win                │
│     Status: BLOCKED            │
│     Last Check: 5 mins ago     │
│                                 │
│  ☑️ ufathai.com                │
│     Status: ACTIVE             │
│     Last Check: 3 mins ago     │
│                                 │
│  ☑️ www.zec777.com             │
│     Status: ACTIVE             │
│     Last Check: 1 min ago      │
├─────────────────────────────────┤
│  [🔄 Check Now]  [⚙️ Settings] │
└─────────────────────────────────┘
```

**Features:**

- แสดง ISP ปัจจุบัน
- แสดงสถานะการ sync
- แสดง domains ที่ต้องเช็ค
- ปุ่ม Check Now
- ปุ่ม Settings

---

### 2. Settings Screen

**Layout:**

```
┌─────────────────────────────────┐
│  ⚙️ Settings                    │
├─────────────────────────────────┤
│  🌐 Server URL                 │
│  [https://your-url.railway.app]│
│                                 │
│  ⏰ Auto Check Interval        │
│  [1 hour] ▼                    │
│                                 │
│  📱 Background Service         │
│  [✅ Enabled]                  │
│                                 │
│  🔔 Notifications              │
│  [✅ Enabled]                  │
│                                 │
│  📊 Show Device Info           │
│  [✅ Enabled]                  │
├─────────────────────────────────┤
│  [💾 Save]  [🔄 Test Connection] │
└─────────────────────────────────┘
```

**Features:**

- ตั้งค่า Server URL
- ตั้งค่า Auto Check Interval
- เปิด/ปิด Background Service
- เปิด/ปิด Notifications
- Test Connection

---

### 3. Check Results Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📊 Check Results               │
│  Domain: ufathai.win            │
├─────────────────────────────────┤
│  🌐 ISP: AIS                    │
│  Status: ❌ BLOCKED             │
│  IP: -                          │
│  Latency: 0ms                   │
│  Time: 2 mins ago               │
├─────────────────────────────────┤
│  📡 Network Info                │
│  Type: WiFi                     │
│  SSID: HomeNetwork              │
│  Signal: ████████░░ 80%         │
├─────────────────────────────────┤
│  [🔄 Check Again]  [📤 Sync]    │
└─────────────────────────────────┘
```

**Features:**

- แสดงผลการเช็ค
- แสดง network info
- ปุ่ม Check Again
- ปุ่ม Sync

---

### 4. Sync Status Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📤 Sync Status                  │
├─────────────────────────────────┤
│  ✅ Last Sync: Success          │
│  📅 Time: 2 mins ago            │
│  📊 Results: 3 domains          │
│                                 │
│  📋 Sync History:               │
│                                 │
│  ✅ 2 mins ago - 3 domains     │
│  ✅ 1 hour ago - 3 domains     │
│  ✅ 2 hours ago - 3 domains     │
│  ❌ 3 hours ago - Failed        │
│                                 │
├─────────────────────────────────┤
│  [🔄 Sync Now]  [📊 View Logs] │
└─────────────────────────────────┘
```

**Features:**

- แสดง sync status
- แสดง sync history
- ปุ่ม Sync Now
- View Logs

---

## 🏗️ Architecture

### App Structure

```
Android App
├── UI Layer
│   ├── MainActivity (Dashboard)
│   ├── SettingsActivity
│   ├── CheckResultsActivity
│   └── SyncStatusActivity
├── Service Layer
│   ├── DNSCheckService
│   ├── SyncService
│   └── BackgroundService
├── Data Layer
│   ├── LocalDatabase (Room)
│   ├── SharedPreferences
│   └── Network API Client
└── Utils
    ├── ISPDetector
    ├── NetworkUtils
    └── NotificationManager
```

---

## 📱 Features

### 1. Core Features

**DNS Check:**

- เช็ค DNS จาก ISP DNS servers
- ตรวจจับ ISP อัตโนมัติ
- แสดงผลลัพธ์ทันที

**Auto Sync:**

- เช็คอัตโนมัติตาม interval
- Sync ผลลัพธ์ไปที่ server
- Background service

**Notifications:**

- แจ้งเตือนเมื่อ domain ถูกบล็อก
- แจ้งเตือนเมื่อ sync สำเร็จ/ล้มเหลว

### 2. Advanced Features

**Multi-ISP Support:**

- เช็คจากหลาย ISP (ถ้าเปลี่ยน network)
- เก็บผลลัพธ์แยกตาม ISP

**Offline Mode:**

- เก็บผลลัพธ์ใน local database
- Sync เมื่อ online

**History:**

- ดูประวัติการเช็ค
- Export เป็น CSV/JSON

---

## 💻 Implementation

### 1. Project Structure

```
app/
├── src/main/java/com/sentinel/dns/
│   ├── ui/
│   │   ├── MainActivity.kt
│   │   ├── SettingsActivity.kt
│   │   ├── CheckResultsActivity.kt
│   │   └── SyncStatusActivity.kt
│   ├── service/
│   │   ├── DNSCheckService.kt
│   │   ├── SyncService.kt
│   │   └── BackgroundService.kt
│   ├── data/
│   │   ├── database/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── DomainDao.kt
│   │   │   └── CheckResultDao.kt
│   │   ├── api/
│   │   │   └── ApiClient.kt
│   │   └── repository/
│   │       └── DomainRepository.kt
│   ├── utils/
│   │   ├── ISPDetector.kt
│   │   ├── NetworkUtils.kt
│   │   └── NotificationManager.kt
│   └── model/
│       ├── Domain.kt
│       ├── CheckResult.kt
│       └── DeviceInfo.kt
└── res/
    ├── layout/
    │   ├── activity_main.xml
    │   ├── activity_settings.xml
    │   └── item_domain.xml
    └── values/
        ├── strings.xml
        └── colors.xml
```

---

### 2. Key Components

#### A. ISP Detector

```kotlin
// ISPDetector.kt
class ISPDetector(private val context: Context) {
    
    fun detectISP(): String {
        val telephonyManager = context.getSystemService(
            Context.TELEPHONY_SERVICE
        ) as TelephonyManager
        
        val networkOperator = telephonyManager.networkOperatorName
        
        return when {
            networkOperator.contains("AIS", ignoreCase = true) -> "AIS"
            networkOperator.contains("TRUE", ignoreCase = true) -> "TRUE"
            networkOperator.contains("DTAC", ignoreCase = true) -> "DTAC"
            networkOperator.contains("NT", ignoreCase = true) -> "NT"
            else -> "Unknown"
        }
    }
    
    fun getNetworkType(): String {
        val connectivityManager = context.getSystemService(
            Context.CONNECTIVITY_SERVICE
        ) as ConnectivityManager
        
        val network = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        
        return when {
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WiFi"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "Mobile Data"
            else -> "Unknown"
        }
    }
}
```

#### B. DNS Check Service

```kotlin
// DNSCheckService.kt
class DNSCheckService(private val context: Context) {
    
    suspend fun checkDNS(hostname: String): CheckResult {
        return try {
            val startTime = System.currentTimeMillis()
            
            // Try to resolve hostname
            val addresses = InetAddress.getAllByName(hostname)
            val latency = System.currentTimeMillis() - startTime
            
            CheckResult(
                hostname = hostname,
                status = "ACTIVE",
                ip = addresses[0].hostAddress ?: "",
                latency = latency.toInt(),
                timestamp = System.currentTimeMillis()
            )
        } catch (e: UnknownHostException) {
            CheckResult(
                hostname = hostname,
                status = "BLOCKED",
                ip = "",
                latency = 0,
                timestamp = System.currentTimeMillis()
            )
        }
    }
}
```

#### C. Sync Service

```kotlin
// SyncService.kt
class SyncService(private val context: Context) {
    
    private val apiClient = ApiClient(context)
    private val ispDetector = ISPDetector(context)
    
    suspend fun syncResults(results: List<CheckResult>): SyncResult {
        return try {
            val deviceInfo = DeviceInfo(
                isp = ispDetector.detectISP(),
                networkType = ispDetector.getNetworkType(),
                androidVersion = Build.VERSION.RELEASE,
                appVersion = BuildConfig.VERSION_NAME
            )
            
            val request = SyncRequest(
                deviceId = getDeviceId(),
                deviceInfo = deviceInfo,
                results = results.map { result ->
                    SyncResultItem(
                        hostname = result.hostname,
                        ispName = deviceInfo.isp,
                        status = result.status,
                        ip = result.ip,
                        timestamp = result.timestamp,
                        latency = result.latency
                    )
                }
            )
            
            val response = apiClient.syncResults(request)
            
            SyncResult(
                success = true,
                message = response.message,
                timestamp = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            SyncResult(
                success = false,
                message = e.message ?: "Unknown error",
                timestamp = System.currentTimeMillis()
            )
        }
    }
    
    private fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
    }
}
```

#### D. API Client

```kotlin
// ApiClient.kt
class ApiClient(private val context: Context) {
    
    private val baseUrl = getServerUrl()
    private val client = OkHttpClient()
    
    suspend fun syncResults(request: SyncRequest): SyncResponse {
        val json = Gson().toJson(request)
        val requestBody = json.toRequestBody("application/json".toMediaType())
        
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync")
            .post(requestBody)
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, SyncResponse::class.java)
    }
    
    suspend fun getDomains(): DomainsResponse {
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync/domains")
            .get()
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, DomainsResponse::class.java)
    }
    
    private fun getServerUrl(): String {
        val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
        return prefs.getString("server_url", DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }
}
```

---

### 3. Main Activity

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var domainAdapter: DomainAdapter
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupRecyclerView()
        setupObservers()
        setupClickListeners()
        
        // Load domains
        viewModel.loadDomains()
    }
    
    private fun setupRecyclerView() {
        domainAdapter = DomainAdapter { domain ->
            // Show check results
            startActivity(CheckResultsActivity.newIntent(this, domain))
        }
        binding.recyclerViewDomains.adapter = domainAdapter
    }
    
    private fun setupObservers() {
        viewModel.domains.observe(this) { domains ->
            domainAdapter.submitList(domains)
        }
        
        viewModel.currentISP.observe(this) { isp ->
            binding.textCurrentISP.text = "Current ISP: $isp"
        }
        
        viewModel.syncStatus.observe(this) { status ->
            binding.textSyncStatus.text = "Last Sync: $status"
        }
    }
    
    private fun setupClickListeners() {
        binding.buttonCheckNow.setOnClickListener {
            viewModel.checkAllDomains()
        }
        
        binding.buttonSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }
}
```

---

### 4. Background Service

```kotlin
// BackgroundService.kt
class BackgroundService : Service() {
    
    private val syncService: SyncService by lazy {
        SyncService(applicationContext)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startPeriodicSync()
        return START_STICKY
    }
    
    private fun startPeriodicSync() {
        val handler = Handler(Looper.getMainLooper())
        
        handler.postDelayed(object : Runnable {
            override fun run() {
                syncAllDomains()
                handler.postDelayed(this, getSyncInterval())
            }
        }, getSyncInterval())
    }
    
    private suspend fun syncAllDomains() {
        // Get domains to check
        val domains = apiClient.getDomains()
        
        // Check each domain
        val results = domains.domains.map { domain ->
            dnsCheckService.checkDNS(domain)
        }
        
        // Sync results
        syncService.syncResults(results)
    }
    
    private fun getSyncInterval(): Long {
        val prefs = getSharedPreferences("settings", MODE_PRIVATE)
        return prefs.getLong("sync_interval", 3600000) // 1 hour default
    }
}
```

---

## 🎨 Color Scheme

```xml
<!-- colors.xml -->
<resources>
    <color name="primary">#00D4AA</color>
    <color name="primary_dark">#00B894</color>
    <color name="accent">#0984E3</color>
    <color name="background">#1E1E2E</color>
    <color name="surface">#2D2D44</color>
    <color name="text_primary">#FFFFFF</color>
    <color name="text_secondary">#B0B0B0</color>
    <color name="status_active">#00D4AA</color>
    <color name="status_blocked">#E74C3C</color>
    <color name="status_error">#F39C12</color>
</resources>
```

---

## 📋 Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🚀 Next Steps

### 1. Setup Project

```bash
# สร้าง Android project
# ใช้ Android Studio
# Template: Empty Activity
# Language: Kotlin
# Minimum SDK: 21 (Android 5.0)
```

### 2. Add Dependencies

```gradle
// build.gradle (app)
dependencies {
    // Networking
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Room Database
    implementation 'androidx.room:room-runtime:2.6.1'
    kapt 'androidx.room:room-compiler:2.6.1'
    
    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### 3. Implement Features

- [ ] ISP Detection
- [ ] DNS Check Service
- [ ] Sync Service
- [ ] Background Service
- [ ] UI Components
- [ ] Local Database

---

## 💡 Tips

### 1. Battery Optimization

- ใช้ WorkManager แทน Background Service
- ตั้ง interval ที่เหมาะสม (ไม่บ่อยเกินไป)
- ใช้ Doze mode และ App Standby

### 2. Network Efficiency

- Batch sync results
- Compress data ถ้าจำเป็น
- Retry mechanism

### 3. User Experience

- แสดง loading state
- Error handling ที่ดี
- Offline support

---

## 📝 Summary

**UI Design:**

- Dashboard (Main Screen)
- Settings Screen
- Check Results Screen
- Sync Status Screen

**Architecture:**

- UI Layer
- Service Layer
- Data Layer
- Utils

**Key Features:**

- DNS Check
- Auto Sync
- Notifications
- Offline Support

**Implementation:**

- Kotlin
- Room Database
- OkHttp
- Coroutines
- WorkManager

---

## 🎉 Ready to Build

ตอนนี้มี:

- ✅ UI/UX Design
- ✅ Architecture
- ✅ Code Examples
- ✅ Implementation Guide

**Next:** สร้าง Android project และเริ่ม implement!

## 🎯 เป้าหมาย

ออกแบบ Android app สำหรับเช็ค DNS จากเครือข่าย ISP จริงๆ และ sync กับระบบ

---

## 🎨 UI/UX Design

### 1. Main Screen (Dashboard)

**Layout:**

```
┌─────────────────────────────────┐
│  🛡️ Sentinel DNS Monitor        │
│  Status: ✅ Active               │
├─────────────────────────────────┤
│  📊 Current ISP: AIS            │
│  📡 Network: WiFi               │
│  🔄 Last Sync: 2 mins ago       │
├─────────────────────────────────┤
│  📋 Domains to Check:           │
│                                 │
│  ☑️ ufathai.win                │
│     Status: BLOCKED            │
│     Last Check: 5 mins ago     │
│                                 │
│  ☑️ ufathai.com                │
│     Status: ACTIVE             │
│     Last Check: 3 mins ago     │
│                                 │
│  ☑️ www.zec777.com             │
│     Status: ACTIVE             │
│     Last Check: 1 min ago      │
├─────────────────────────────────┤
│  [🔄 Check Now]  [⚙️ Settings] │
└─────────────────────────────────┘
```

**Features:**

- แสดง ISP ปัจจุบัน
- แสดงสถานะการ sync
- แสดง domains ที่ต้องเช็ค
- ปุ่ม Check Now
- ปุ่ม Settings

---

### 2. Settings Screen

**Layout:**

```
┌─────────────────────────────────┐
│  ⚙️ Settings                    │
├─────────────────────────────────┤
│  🌐 Server URL                 │
│  [https://your-url.railway.app]│
│                                 │
│  ⏰ Auto Check Interval        │
│  [1 hour] ▼                    │
│                                 │
│  📱 Background Service         │
│  [✅ Enabled]                  │
│                                 │
│  🔔 Notifications              │
│  [✅ Enabled]                  │
│                                 │
│  📊 Show Device Info           │
│  [✅ Enabled]                  │
├─────────────────────────────────┤
│  [💾 Save]  [🔄 Test Connection] │
└─────────────────────────────────┘
```

**Features:**

- ตั้งค่า Server URL
- ตั้งค่า Auto Check Interval
- เปิด/ปิด Background Service
- เปิด/ปิด Notifications
- Test Connection

---

### 3. Check Results Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📊 Check Results               │
│  Domain: ufathai.win            │
├─────────────────────────────────┤
│  🌐 ISP: AIS                    │
│  Status: ❌ BLOCKED             │
│  IP: -                          │
│  Latency: 0ms                   │
│  Time: 2 mins ago               │
├─────────────────────────────────┤
│  📡 Network Info                │
│  Type: WiFi                     │
│  SSID: HomeNetwork              │
│  Signal: ████████░░ 80%         │
├─────────────────────────────────┤
│  [🔄 Check Again]  [📤 Sync]    │
└─────────────────────────────────┘
```

**Features:**

- แสดงผลการเช็ค
- แสดง network info
- ปุ่ม Check Again
- ปุ่ม Sync

---

### 4. Sync Status Screen

**Layout:**

```
┌─────────────────────────────────┐
│  📤 Sync Status                  │
├─────────────────────────────────┤
│  ✅ Last Sync: Success          │
│  📅 Time: 2 mins ago            │
│  📊 Results: 3 domains          │
│                                 │
│  📋 Sync History:               │
│                                 │
│  ✅ 2 mins ago - 3 domains     │
│  ✅ 1 hour ago - 3 domains     │
│  ✅ 2 hours ago - 3 domains     │
│  ❌ 3 hours ago - Failed        │
│                                 │
├─────────────────────────────────┤
│  [🔄 Sync Now]  [📊 View Logs] │
└─────────────────────────────────┘
```

**Features:**

- แสดง sync status
- แสดง sync history
- ปุ่ม Sync Now
- View Logs

---

## 🏗️ Architecture

### App Structure

```
Android App
├── UI Layer
│   ├── MainActivity (Dashboard)
│   ├── SettingsActivity
│   ├── CheckResultsActivity
│   └── SyncStatusActivity
├── Service Layer
│   ├── DNSCheckService
│   ├── SyncService
│   └── BackgroundService
├── Data Layer
│   ├── LocalDatabase (Room)
│   ├── SharedPreferences
│   └── Network API Client
└── Utils
    ├── ISPDetector
    ├── NetworkUtils
    └── NotificationManager
```

---

## 📱 Features

### 1. Core Features

**DNS Check:**

- เช็ค DNS จาก ISP DNS servers
- ตรวจจับ ISP อัตโนมัติ
- แสดงผลลัพธ์ทันที

**Auto Sync:**

- เช็คอัตโนมัติตาม interval
- Sync ผลลัพธ์ไปที่ server
- Background service

**Notifications:**

- แจ้งเตือนเมื่อ domain ถูกบล็อก
- แจ้งเตือนเมื่อ sync สำเร็จ/ล้มเหลว

### 2. Advanced Features

**Multi-ISP Support:**

- เช็คจากหลาย ISP (ถ้าเปลี่ยน network)
- เก็บผลลัพธ์แยกตาม ISP

**Offline Mode:**

- เก็บผลลัพธ์ใน local database
- Sync เมื่อ online

**History:**

- ดูประวัติการเช็ค
- Export เป็น CSV/JSON

---

## 💻 Implementation

### 1. Project Structure

```
app/
├── src/main/java/com/sentinel/dns/
│   ├── ui/
│   │   ├── MainActivity.kt
│   │   ├── SettingsActivity.kt
│   │   ├── CheckResultsActivity.kt
│   │   └── SyncStatusActivity.kt
│   ├── service/
│   │   ├── DNSCheckService.kt
│   │   ├── SyncService.kt
│   │   └── BackgroundService.kt
│   ├── data/
│   │   ├── database/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── DomainDao.kt
│   │   │   └── CheckResultDao.kt
│   │   ├── api/
│   │   │   └── ApiClient.kt
│   │   └── repository/
│   │       └── DomainRepository.kt
│   ├── utils/
│   │   ├── ISPDetector.kt
│   │   ├── NetworkUtils.kt
│   │   └── NotificationManager.kt
│   └── model/
│       ├── Domain.kt
│       ├── CheckResult.kt
│       └── DeviceInfo.kt
└── res/
    ├── layout/
    │   ├── activity_main.xml
    │   ├── activity_settings.xml
    │   └── item_domain.xml
    └── values/
        ├── strings.xml
        └── colors.xml
```

---

### 2. Key Components

#### A. ISP Detector

```kotlin
// ISPDetector.kt
class ISPDetector(private val context: Context) {
    
    fun detectISP(): String {
        val telephonyManager = context.getSystemService(
            Context.TELEPHONY_SERVICE
        ) as TelephonyManager
        
        val networkOperator = telephonyManager.networkOperatorName
        
        return when {
            networkOperator.contains("AIS", ignoreCase = true) -> "AIS"
            networkOperator.contains("TRUE", ignoreCase = true) -> "TRUE"
            networkOperator.contains("DTAC", ignoreCase = true) -> "DTAC"
            networkOperator.contains("NT", ignoreCase = true) -> "NT"
            else -> "Unknown"
        }
    }
    
    fun getNetworkType(): String {
        val connectivityManager = context.getSystemService(
            Context.CONNECTIVITY_SERVICE
        ) as ConnectivityManager
        
        val network = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        
        return when {
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WiFi"
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "Mobile Data"
            else -> "Unknown"
        }
    }
}
```

#### B. DNS Check Service

```kotlin
// DNSCheckService.kt
class DNSCheckService(private val context: Context) {
    
    suspend fun checkDNS(hostname: String): CheckResult {
        return try {
            val startTime = System.currentTimeMillis()
            
            // Try to resolve hostname
            val addresses = InetAddress.getAllByName(hostname)
            val latency = System.currentTimeMillis() - startTime
            
            CheckResult(
                hostname = hostname,
                status = "ACTIVE",
                ip = addresses[0].hostAddress ?: "",
                latency = latency.toInt(),
                timestamp = System.currentTimeMillis()
            )
        } catch (e: UnknownHostException) {
            CheckResult(
                hostname = hostname,
                status = "BLOCKED",
                ip = "",
                latency = 0,
                timestamp = System.currentTimeMillis()
            )
        }
    }
}
```

#### C. Sync Service

```kotlin
// SyncService.kt
class SyncService(private val context: Context) {
    
    private val apiClient = ApiClient(context)
    private val ispDetector = ISPDetector(context)
    
    suspend fun syncResults(results: List<CheckResult>): SyncResult {
        return try {
            val deviceInfo = DeviceInfo(
                isp = ispDetector.detectISP(),
                networkType = ispDetector.getNetworkType(),
                androidVersion = Build.VERSION.RELEASE,
                appVersion = BuildConfig.VERSION_NAME
            )
            
            val request = SyncRequest(
                deviceId = getDeviceId(),
                deviceInfo = deviceInfo,
                results = results.map { result ->
                    SyncResultItem(
                        hostname = result.hostname,
                        ispName = deviceInfo.isp,
                        status = result.status,
                        ip = result.ip,
                        timestamp = result.timestamp,
                        latency = result.latency
                    )
                }
            )
            
            val response = apiClient.syncResults(request)
            
            SyncResult(
                success = true,
                message = response.message,
                timestamp = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            SyncResult(
                success = false,
                message = e.message ?: "Unknown error",
                timestamp = System.currentTimeMillis()
            )
        }
    }
    
    private fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
    }
}
```

#### D. API Client

```kotlin
// ApiClient.kt
class ApiClient(private val context: Context) {
    
    private val baseUrl = getServerUrl()
    private val client = OkHttpClient()
    
    suspend fun syncResults(request: SyncRequest): SyncResponse {
        val json = Gson().toJson(request)
        val requestBody = json.toRequestBody("application/json".toMediaType())
        
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync")
            .post(requestBody)
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, SyncResponse::class.java)
    }
    
    suspend fun getDomains(): DomainsResponse {
        val httpRequest = Request.Builder()
            .url("$baseUrl/api/mobile-sync/domains")
            .get()
            .build()
        
        val response = client.newCall(httpRequest).execute()
        val responseBody = response.body?.string() ?: ""
        
        return Gson().fromJson(responseBody, DomainsResponse::class.java)
    }
    
    private fun getServerUrl(): String {
        val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
        return prefs.getString("server_url", DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }
}
```

---

### 3. Main Activity

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var domainAdapter: DomainAdapter
    private val viewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupRecyclerView()
        setupObservers()
        setupClickListeners()
        
        // Load domains
        viewModel.loadDomains()
    }
    
    private fun setupRecyclerView() {
        domainAdapter = DomainAdapter { domain ->
            // Show check results
            startActivity(CheckResultsActivity.newIntent(this, domain))
        }
        binding.recyclerViewDomains.adapter = domainAdapter
    }
    
    private fun setupObservers() {
        viewModel.domains.observe(this) { domains ->
            domainAdapter.submitList(domains)
        }
        
        viewModel.currentISP.observe(this) { isp ->
            binding.textCurrentISP.text = "Current ISP: $isp"
        }
        
        viewModel.syncStatus.observe(this) { status ->
            binding.textSyncStatus.text = "Last Sync: $status"
        }
    }
    
    private fun setupClickListeners() {
        binding.buttonCheckNow.setOnClickListener {
            viewModel.checkAllDomains()
        }
        
        binding.buttonSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
    }
}
```

---

### 4. Background Service

```kotlin
// BackgroundService.kt
class BackgroundService : Service() {
    
    private val syncService: SyncService by lazy {
        SyncService(applicationContext)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startPeriodicSync()
        return START_STICKY
    }
    
    private fun startPeriodicSync() {
        val handler = Handler(Looper.getMainLooper())
        
        handler.postDelayed(object : Runnable {
            override fun run() {
                syncAllDomains()
                handler.postDelayed(this, getSyncInterval())
            }
        }, getSyncInterval())
    }
    
    private suspend fun syncAllDomains() {
        // Get domains to check
        val domains = apiClient.getDomains()
        
        // Check each domain
        val results = domains.domains.map { domain ->
            dnsCheckService.checkDNS(domain)
        }
        
        // Sync results
        syncService.syncResults(results)
    }
    
    private fun getSyncInterval(): Long {
        val prefs = getSharedPreferences("settings", MODE_PRIVATE)
        return prefs.getLong("sync_interval", 3600000) // 1 hour default
    }
}
```

---

## 🎨 Color Scheme

```xml
<!-- colors.xml -->
<resources>
    <color name="primary">#00D4AA</color>
    <color name="primary_dark">#00B894</color>
    <color name="accent">#0984E3</color>
    <color name="background">#1E1E2E</color>
    <color name="surface">#2D2D44</color>
    <color name="text_primary">#FFFFFF</color>
    <color name="text_secondary">#B0B0B0</color>
    <color name="status_active">#00D4AA</color>
    <color name="status_blocked">#E74C3C</color>
    <color name="status_error">#F39C12</color>
</resources>
```

---

## 📋 Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🚀 Next Steps

### 1. Setup Project

```bash
# สร้าง Android project
# ใช้ Android Studio
# Template: Empty Activity
# Language: Kotlin
# Minimum SDK: 21 (Android 5.0)
```

### 2. Add Dependencies

```gradle
// build.gradle (app)
dependencies {
    // Networking
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Room Database
    implementation 'androidx.room:room-runtime:2.6.1'
    kapt 'androidx.room:room-compiler:2.6.1'
    
    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

### 3. Implement Features

- [ ] ISP Detection
- [ ] DNS Check Service
- [ ] Sync Service
- [ ] Background Service
- [ ] UI Components
- [ ] Local Database

---

## 💡 Tips

### 1. Battery Optimization

- ใช้ WorkManager แทน Background Service
- ตั้ง interval ที่เหมาะสม (ไม่บ่อยเกินไป)
- ใช้ Doze mode และ App Standby

### 2. Network Efficiency

- Batch sync results
- Compress data ถ้าจำเป็น
- Retry mechanism

### 3. User Experience

- แสดง loading state
- Error handling ที่ดี
- Offline support

---

## 📝 Summary

**UI Design:**

- Dashboard (Main Screen)
- Settings Screen
- Check Results Screen
- Sync Status Screen

**Architecture:**

- UI Layer
- Service Layer
- Data Layer
- Utils

**Key Features:**

- DNS Check
- Auto Sync
- Notifications
- Offline Support

**Implementation:**

- Kotlin
- Room Database
- OkHttp
- Coroutines
- WorkManager

---

## 🎉 Ready to Build

ตอนนี้มี:

- ✅ UI/UX Design
- ✅ Architecture
- ✅ Code Examples
- ✅ Implementation Guide

**Next:** สร้าง Android project และเริ่ม implement!
