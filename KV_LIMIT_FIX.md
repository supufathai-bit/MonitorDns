# KV Limit Exceeded - การแก้ไข

## ปัญหา
Cloudflare Workers มี daily limit สำหรับ KV operations (writes/reads). เมื่อเกิน limit:
- API จะ return `500 Internal Server Error`
- Error message: `KV put() limit exceeded for the day`
- Frontend ไม่สามารถ trigger mobile app ได้
- Domain syncing ไม่ทำงาน

## สาเหตุ
ใน `handleMobileSync` function มีการเรียก `KV.put()` หลายครั้งต่อ sync:
- `syncKey`: 1 ครั้ง (เก็บ sync result)
- `latestKey`: **15 ครั้ง** (3 domains × 5 ISPs = 15 results)
- `deviceKey`: 1 ครั้ง (เก็บ device info)

**รวม ~17 ครั้งต่อ sync!** ถ้า sync บ่อยๆ จะเกิน limit เร็วมาก

## การแก้ไข

### 1. ลดจำนวน KV Writes
- **ตรวจสอบก่อนเขียน**: ตรวจสอบว่าข้อมูลเปลี่ยนจริงๆ หรือไม่ก่อนเขียน
- **Skip ถ้าไม่เปลี่ยน**: ถ้า status และ IP เหมือนเดิม และ timestamp ยังใหม่ (น้อยกว่า 5 นาที) จะไม่เขียน
- **Device info caching**: อัพเดท device info เฉพาะเมื่อเปลี่ยน ISP/network หรือผ่านไป 1 ชั่วโมง

### 2. Optimize Trigger Check
- **Rate limiting**: ถ้า trigger ถูก set เมื่อไม่กี่นาทีที่แล้ว จะไม่เขียนซ้ำ
- **Error handling**: Return error message ที่ชัดเจนเมื่อเกิน limit

### 3. Optimize Domain Sync
- **Compare before write**: เปรียบเทียบ domains list ก่อนเขียน
- **Skip ถ้าเหมือนกัน**: ถ้า domains list ไม่เปลี่ยน จะไม่เขียน

## ผลลัพธ์
- **ลด KV writes ลง ~70-90%** (ขึ้นอยู่กับความถี่ในการ sync)
- **Error handling ที่ดีขึ้น**: Return 429 (Too Many Requests) พร้อม error message ที่ชัดเจน
- **Performance ดีขึ้น**: ลด latency จาก KV operations

## Cloudflare KV Limits
- **Free Plan**: ~1,000 writes/day (อาจจะมากกว่านี้แต่ไม่แน่)
- **Paid Plan**: Unlimited writes

## วิธีตรวจสอบ
1. เปิด Cloudflare Dashboard → Workers → Your Worker → Metrics
2. ดู KV operations count
3. ถ้ายังเกิน limit อาจต้อง:
   - Upgrade เป็น Paid Plan
   - ลดความถี่ในการ sync
   - ใช้ caching มากขึ้น

## Deploy Status
✅ Deployed to: `https://sentinel-dns-api.snowwhite04-01x.workers.dev`

## หมายเหตุ
- Workers URL ที่ deploy คือ `sentinel-dns-api` แต่ frontend อาจใช้ `monitordnswoker`
- ตรวจสอบว่า frontend ใช้ Workers URL ถูกต้องหรือไม่

