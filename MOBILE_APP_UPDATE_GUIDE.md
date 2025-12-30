# 📱 Mobile App - DNS Check Logic

## 🎯 Logic การตรวจสอบ DNS

ระบบใช้ logic แบบเดิมที่เรียบง่าย:

### Logic การตรวจสอบ

1. **DNS Resolution Check**
   - ถ้า DNS resolution สำเร็จ → ได้ IP address → Status = **ACTIVE**
   - ถ้า DNS resolution ไม่สำเร็จ (timeout/error) → ไม่ได้ IP → Status = **BLOCKED**

### ตัวอย่าง

```kotlin
// DNS Check function
suspend fun checkDomain(hostname: String, ispName: String): DNSResult {
    try {
        // ทำ DNS resolution
        val ip = performDNSResolution(hostname, ispName)
        
        if (ip.isNotEmpty()) {
            // ได้ IP = ACTIVE
            return DNSResult(
                hostname = hostname,
                ispName = ispName,
                status = "ACTIVE",
                ip = ip,
                latency = latency
            )
        } else {
            // ไม่ได้ IP = BLOCKED
            return DNSResult(
                hostname = hostname,
                ispName = ispName,
                status = "BLOCKED",
                ip = "",
                latency = 0
            )
        }
    } catch (e: Exception) {
        // Error = BLOCKED
        return DNSResult(
            hostname = hostname,
            ispName = ispName,
            status = "BLOCKED",
            ip = "",
            latency = 0,
            details = "DNS resolution failed: ${e.message}"
        )
    }
}
```

## 📝 สรุป

- ✅ **DNS ได้ IP** → `ACTIVE`
- ❌ **DNS ไม่ได้ IP** → `BLOCKED`
- 🔄 **ไม่ต้องทำ HTTP content check** (เพราะการบล็อคจากกระทรวงแยกยาก)

## 🔄 Flow การทำงาน

```
1. DNS Resolution → ได้ IP address หรือไม่?
   ├─ ได้ IP → Status = ACTIVE
   └─ ไม่ได้ IP → Status = BLOCKED
2. Sync ไป Workers API
```

## ⚠️ หมายเหตุ

- ระบบจะใช้ผลลัพธ์จาก DNS resolution โดยตรง
- ไม่ต้องทำ HTTP content check เพิ่มเติม
- Mobile app ส่งผลลัพธ์มา Workers API จะรับและบันทึกตามที่ส่งมา
