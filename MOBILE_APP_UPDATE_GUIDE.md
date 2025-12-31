# 📱 Mobile App - DNS Check Logic

## 🎯 Logic การตรวจสอบ DNS

**⚠️ สำคัญ: Mobile app ต้องใช้ logic นี้เท่านั้น**

### Logic การตรวจสอบ (ต้องทำตามนี้)

1. **DNS Resolution Check เท่านั้น**
   - ถ้า DNS resolution สำเร็จ → ได้ IP address → Status = **ACTIVE** (เสมอ)
   - ถ้า DNS resolution ไม่สำเร็จ (timeout/error) → ไม่ได้ IP → Status = **BLOCKED**

2. **ห้ามทำ HTTP Content Check**
   - ❌ ห้ามเช็ค HTTP content เพื่อดูว่าเป็น blocking page หรือไม่
   - ❌ ห้ามเปลี่ยน status เป็น BLOCKED แม้จะได้ IP address แล้ว
   - ✅ ใช้แค่ DNS resolution เท่านั้น

### ตัวอย่างโค้ดที่ถูกต้อง

```kotlin
// DNS Check function - ต้องทำตามนี้เท่านั้น
suspend fun checkDomain(hostname: String, ispName: String): DNSResult {
    try {
        // ทำ DNS resolution เท่านั้น
        val ip = performDNSResolution(hostname, ispName)
        
        if (ip.isNotEmpty() && ip.isNotBlank()) {
            // ✅ ได้ IP = ACTIVE (เสมอ ไม่ว่าอะไรก็ตาม)
            return DNSResult(
                hostname = hostname,
                ispName = ispName,
                status = "ACTIVE",  // ← ต้องเป็น ACTIVE ถ้าได้ IP
                ip = ip,
                latency = latency
            )
        } else {
            // ❌ ไม่ได้ IP = BLOCKED
            return DNSResult(
                hostname = hostname,
                ispName = ispName,
                status = "BLOCKED",
                ip = "",
                latency = 0
            )
        }
    } catch (e: Exception) {
        // Error/timeout = BLOCKED
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

// ❌ ห้ามทำแบบนี้:
// suspend fun checkDomain(hostname: String, ispName: String): DNSResult {
//     val ip = performDNSResolution(hostname, ispName)
//     if (ip.isNotEmpty()) {
//         // ❌ ห้ามเช็ค HTTP content
//         val httpContent = checkHTTPContent(hostname, ip)
//         if (httpContent.contains("ถูกระงับ") || httpContent.contains("blocked")) {
//             return DNSResult(..., status = "BLOCKED", ...)  // ❌ ผิด!
//         }
//     }
// }
```

## 📝 สรุป Logic

- ✅ **DNS ได้ IP** → `status = "ACTIVE"` (เสมอ)
- ❌ **DNS ไม่ได้ IP** → `status = "BLOCKED"`
- 🚫 **ห้ามทำ HTTP content check** (เพราะการบล็อคจากกระทรวงแยกยาก)

## 🔄 Flow การทำงาน

```
1. DNS Resolution → ได้ IP address หรือไม่?
   ├─ ได้ IP → Status = ACTIVE (เสมอ ไม่ต้องเช็ค HTTP)
   └─ ไม่ได้ IP → Status = BLOCKED
2. Sync ไป Workers API
```

## ⚠️ หมายเหตุสำคัญ

1. **ถ้าได้ IP address แล้ว → ต้องส่ง status = "ACTIVE" เสมอ**
   - แม้ว่า HTTP content จะเป็น blocking page ก็ตาม
   - Workers API จะ override status ตาม IP address อยู่แล้ว

2. **ไม่ต้องทำ HTTP content check**
   - เพราะการบล็อคจากกระทรวงแยกยาก
   - ใช้แค่ DNS resolution เท่านั้น

3. **Workers API จะ override status ตาม IP address**
   - ถ้า mobile app ส่ง status = "BLOCKED" แต่มี IP address
   - Workers API จะเปลี่ยนเป็น "ACTIVE" อัตโนมัติ
   - แต่ควรส่ง status ที่ถูกต้องตั้งแต่แรก
