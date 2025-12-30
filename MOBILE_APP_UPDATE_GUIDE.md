# 📱 Mobile App Update Guide - HTTP Content Check

## 🎯 สิ่งที่ต้องอัพเดทใน Mobile App

เพื่อให้ระบบตรวจจับการบล็อคได้แม่นยำขึ้น (เช่น หน้า warning ของกระทรวง) Mobile App ต้องเพิ่มการตรวจสอบ HTTP content หลังจาก DNS resolution สำเร็จ

## 📋 สรุปการเปลี่ยนแปลง

### ปัญหาปัจจุบัน:
- Mobile app ทำแค่ DNS resolution check → ได้ IP address → คิดว่า ACTIVE
- แต่จริงๆ domain อาจถูกบล็อค (แสดงหน้า warning ของกระทรวง)

### วิธีแก้ไข:
1. **DNS Check** (เดิม) → ตรวจสอบว่าได้ IP address หรือไม่
2. **HTTP Content Check** (ใหม่) → ตรวจสอบว่าแสดงหน้า blocking page หรือไม่

## 🔧 การอัพเดทที่ต้องทำ

### Option 1: ใช้ Workers API Endpoint (แนะนำ)

Mobile app สามารถเรียก Workers API endpoint `/api/check-content` เพื่อตรวจสอบ HTTP content:

```kotlin
// หลังจาก DNS resolution สำเร็จ
suspend fun checkHTTPContent(hostname: String, ip: String): Boolean {
    try {
        val url = "https://monitordnswoker.snowwhite04-01x.workers.dev/api/check-content"
        val requestBody = JSONObject().apply {
            put("hostname", hostname)
            put("ip", ip)
        }
        
        val response = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(requestBody.toString())
        }
        
        if (response.status.isSuccess()) {
            val data = JSONObject(response.bodyAsText())
            return data.optBoolean("blocked", false)
        }
    } catch (e: Exception) {
        Log.e("HTTPCheck", "Failed to check HTTP content", e)
    }
    return false
}
```

### Option 2: ทำ HTTP Check ใน Mobile App โดยตรง

Mobile app สามารถทำ HTTP GET request ไปที่ domain และตรวจสอบ content:

```kotlin
suspend fun checkHTTPContent(hostname: String): Boolean {
    try {
        val url = "https://$hostname"
        val response = httpClient.get(url) {
            timeout {
                requestTimeoutMillis = 10000 // 10 seconds
            }
        }
        
        if (response.status.isSuccess()) {
            val htmlContent = response.bodyAsText()
            
            // Check for blocking indicators
            val blockedIndicators = listOf(
                "ถูกระงับ",
                "suspended",
                "MINISTRY OF DIGITAL ECONOMY AND SOCIETY",
                "กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
                "Computer-related Crime Act",
                "Gambling Act",
                "illegal acts"
            )
            
            val isBlocked = blockedIndicators.any { indicator ->
                htmlContent.contains(indicator, ignoreCase = true)
            }
            
            return isBlocked
        }
    } catch (e: Exception) {
        Log.e("HTTPCheck", "Failed to check HTTP content", e)
    }
    return false
}
```

## 🔄 Flow การทำงานใหม่

### Before (เดิม):
```
1. DNS Resolution → ได้ IP address
2. Status = ACTIVE
3. Sync ไป Workers API
```

### After (ใหม่):
```
1. DNS Resolution → ได้ IP address
2. HTTP Content Check → ตรวจสอบว่าแสดงหน้า blocking page หรือไม่
3. ถ้าพบ blocking page → Status = BLOCKED
4. ถ้าไม่พบ → Status = ACTIVE
5. Sync ไป Workers API
```

## 📝 Code Example (Kotlin)

```kotlin
// ใน DNSCheckService หรือ DNS checking function
suspend fun checkDomain(hostname: String, ispName: String): DNSResult {
    // 1. DNS Resolution
    val dnsResult = performDNSResolution(hostname, ispName)
    
    if (dnsResult.status == "ACTIVE" && dnsResult.ip.isNotEmpty()) {
        // 2. HTTP Content Check (ใหม่)
        val isBlocked = checkHTTPContent(hostname, dnsResult.ip)
        
        if (isBlocked) {
            // Domain resolves but shows blocking page
            return DNSResult(
                hostname = hostname,
                ispName = ispName,
                status = "BLOCKED",
                ip = dnsResult.ip,
                latency = dnsResult.latency,
                details = "Domain resolves but shows government blocking warning page"
            )
        }
    }
    
    return dnsResult
}

// HTTP Content Check function
suspend fun checkHTTPContent(hostname: String, ip: String): Boolean {
    try {
        // Option 1: ใช้ Workers API endpoint
        val url = "https://monitordnswoker.snowwhite04-01x.workers.dev/api/check-content"
        val requestBody = JSONObject().apply {
            put("hostname", hostname)
            put("ip", ip)
        }
        
        val response = httpClient.post(url) {
            contentType(ContentType.Application.Json)
            setBody(requestBody.toString())
            timeout {
                requestTimeoutMillis = 10000
            }
        }
        
        if (response.status.isSuccess()) {
            val data = JSONObject(response.bodyAsText())
            return data.optBoolean("blocked", false)
        }
    } catch (e: Exception) {
        Log.w("HTTPCheck", "HTTP content check failed, using DNS result only", e)
    }
    
    return false
}
```

## ⚠️ ข้อควรระวัง

1. **Performance**: HTTP check ช้ากว่า DNS check → ควรทำ async/background
2. **Timeout**: ตั้ง timeout ที่เหมาะสม (10-15 วินาที)
3. **Error Handling**: ถ้า HTTP check fail → ใช้ DNS result เป็นหลัก
4. **HTTPS**: บาง domain อาจใช้ HTTPS และมี certificate error → ต้อง handle

## ✅ Checklist

- [ ] เพิ่ม HTTP content check function
- [ ] เรียกใช้ HTTP check หลังจาก DNS resolution สำเร็จ
- [ ] เปลี่ยน status เป็น BLOCKED ถ้าพบ blocking page
- [ ] Handle errors และ timeouts
- [ ] Test กับ domain ที่ถูกบล็อค (เช่น `illegal.mdes.go.th`)
- [ ] Test กับ domain ที่ไม่ถูกบล็อค (เช่น `google.com`)

## 🎯 ผลลัพธ์

หลังจากอัพเดท:
- ✅ ตรวจจับการบล็อคได้แม่นยำขึ้น
- ✅ แยกแยะระหว่าง DNS resolution สำเร็จ vs ถูกบล็อคจริงๆ
- ✅ Domain ที่แสดงหน้า warning ของกระทรวงจะถูกระบุเป็น BLOCKED

## 📚 เอกสารเพิ่มเติม

- `HTTP_CONTENT_CHECK.md` - รายละเอียด HTTP content check endpoint
- Workers API: `https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check-content`

