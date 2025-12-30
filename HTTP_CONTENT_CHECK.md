# HTTP Content Check - ตรวจจับการบล็อคจากหน้า Warning (Optional Feature)

## ⚠️ หมายเหตุ

**Feature นี้เป็น Optional** - ระบบหลักใช้ logic แบบเดิม:
- DNS resolution ได้ IP = ACTIVE
- DNS resolution ไม่ได้ IP = BLOCKED

HTTP Content Check ใช้สำหรับกรณีพิเศษเท่านั้น

## ปัญหา

ระบบเดิมตรวจแค่ DNS resolution (ได้ IP address) → คิดว่า ACTIVE
แต่จริงๆ แล้ว domain อาจถูกบล็อค (แสดงหน้า warning ของกระทรวง)

ตัวอย่าง: `illegal.mdes.go.th`
- DNS resolution สำเร็จ → ได้ IP address
- แต่หน้าเว็บแสดงหน้า warning ของกระทรวง → ถูกบล็อคจริงๆ

## วิธีแก้ไข (Optional)

เพิ่ม HTTP Content Check endpoint เพื่อตรวจสอบว่า domain แสดงหน้า blocking page หรือไม่
**แต่เนื่องจากการบล็อคจากกระทรวงแยกยาก ระบบหลักจะใช้ DNS resolution logic แทน**

### Endpoint: `/api/check-content`

**Request:**
```json
{
  "hostname": "illegal.mdes.go.th",
  "ip": "125.26.170.3"  // optional
}
```

**Response (Blocked):**
```json
{
  "hostname": "illegal.mdes.go.th",
  "status": "BLOCKED",
  "ip": "125.26.170.3",
  "blocked": true,
  "reason": "Shows MDES blocking page",
  "details": "Domain resolves but shows government blocking warning page",
  "httpStatus": 200
}
```

**Response (Active):**
```json
{
  "hostname": "example.com",
  "status": "ACTIVE",
  "ip": "1.2.3.4",
  "blocked": false,
  "httpStatus": 200
}
```

## Blocking Indicators

ระบบจะตรวจสอบคำต่อไปนี้ใน HTML content:

- `ถูกระงับ` (Thai)
- `suspended` (English)
- `MINISTRY OF DIGITAL ECONOMY AND SOCIETY`
- `กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม`
- `Computer-related Crime Act`
- `Gambling Act`
- `illegal acts`

## การใช้งาน

### 1. จาก Frontend/Web

```javascript
const response = await fetch('https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/check-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hostname: 'illegal.mdes.go.th',
    ip: '125.26.170.3'  // optional
  })
});

const data = await response.json();
if (data.blocked) {
  console.log('Domain is blocked!');
}
```

### 2. จาก Mobile App

Mobile app ควรทำ HTTP check หลังจาก DNS resolution สำเร็จ:

1. DNS resolution → ได้ IP address
2. HTTP GET request → ตรวจสอบ content
3. ถ้าพบ blocking indicators → เปลี่ยน status เป็น BLOCKED

## ข้อจำกัด

- HTTP check อาจช้ากว่า DNS check
- บาง domain อาจใช้ HTTPS และ certificate error
- บาง domain อาจ redirect ไปหน้า blocking page

## แนะนำ

สำหรับ mobile app:
1. ทำ DNS check ก่อน (เร็ว)
2. ถ้า DNS สำเร็จ → ทำ HTTP check (ช้าแต่แม่นยำ)
3. ถ้า HTTP check พบ blocking page → เปลี่ยน status เป็น BLOCKED

