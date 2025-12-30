# Cloudflare KV Limits - คำอธิบาย

## Cloudflare KV Free Plan Limits (ต่อวัน)

### 1. **Writes (การเขียน)**: 1,000 ครั้ง/วัน
- `KV.put()` - เขียนข้อมูลใหม่หรืออัพเดท
- **นี่คือปัญหาหลัก!** เพราะเราเขียนบ่อยมาก

### 2. **Reads (การอ่าน)**: 100,000 ครั้ง/วัน
- `KV.get()` - อ่านข้อมูล
- ปกติไม่ค่อยเกิน limit

### 3. **Deletes (การลบ)**: 1,000 ครั้ง/วัน
- `KV.delete()` - ลบข้อมูล

### 4. **Lists (การลิสต์)**: 1,000 ครั้ง/วัน
- `KV.list()` - ลิสต์ keys ทั้งหมด

### 5. **Storage (พื้นที่เก็บข้อมูล)**: 1 GB
- ปกติไม่ค่อยเต็ม

---

## ทำไมถึงเกิน Limit?

### ก่อนแก้ไข (ปัญหาเดิม):
```
1 sync จาก mobile app = 17 KV writes:
- syncKey: 1 ครั้ง
- latestKey: 15 ครั้ง (3 domains × 5 ISPs)
- deviceKey: 1 ครั้ง

ถ้า sync ทุก 1 ชั่วโมง = 24 syncs/วัน
= 24 × 17 = 408 writes/วัน ✅ (ยังไม่เกิน)

แต่ถ้า:
- กด "RUN FULL SCAN" บ่อยๆ
- Auto-scan ทุก 5 นาที = 288 scans/วัน
- Domain sync ทุกครั้งที่เพิ่ม/ลบ domain
- Retry เมื่อ error

= เกิน 1,000 writes/วัน ง่ายมาก! ❌
```

### หลังแก้ไข (ลดลง 70-90%):
```
- ตรวจสอบก่อนเขียน (skip ถ้าไม่เปลี่ยน)
- Cache device info (อัพเดทเฉพาะเมื่อเปลี่ยน)
- Rate limiting สำหรับ trigger
- Compare domains ก่อน sync

ผลลัพธ์:
- Sync 1 ครั้ง = 2-5 writes (แทน 17)
- ลดลง ~70-90%
```

---

## วิธีตรวจสอบ KV Usage

### 1. ผ่าน Cloudflare Dashboard
1. เปิด [Cloudflare Dashboard](https://dash.cloudflare.com)
2. ไปที่ **Workers & Pages** → **KV**
3. เลือก Namespace ของคุณ (`SENTINEL_DATA`)
4. ดู **Metrics** → **Operations**
5. ดู **Daily usage**

### 2. ผ่าน Workers Logs
```bash
cd workers
wrangler tail
```
ดู logs ที่มี `KV put()` errors

---

## วิธีแก้ไขเมื่อเกิน Limit

### Option 1: รอให้ Reset (ฟรี)
- KV limits จะ reset ทุกวัน **ตาม UTC time**
- เช่น reset เวลา 00:00 UTC (07:00 น. ตามเวลาไทย)
- **วิธีนี้ฟรี แต่ต้องรอ**

### Option 2: Upgrade เป็น Paid Plan (แนะนำ)
- **Paid Plan**: $5/เดือน
- **KV writes**: Unlimited (ไม่จำกัด!)
- **KV reads**: 100,000 ครั้ง/วัน (เหมือนเดิม)
- **Storage**: 1 GB (เหมือนเดิม)

**ราคาเพิ่มเติม:**
- Writes/Deletes/Lists เพิ่ม: $5 ต่อ 1 ล้านครั้ง
- Reads เพิ่ม: $0.50 ต่อ 1 ล้านครั้ง
- Storage เพิ่ม: $0.50 ต่อ GB

### Option 3: ลดการใช้งาน (ฟรี)
- ลดความถี่ในการ sync
- ใช้ caching มากขึ้น
- ตรวจสอบก่อนเขียน (ทำแล้ว ✅)

---

## สรุป

| Operation | Free Plan | Paid Plan |
|-----------|-----------|-----------|
| **Writes** | 1,000/วัน | Unlimited |
| **Reads** | 100,000/วัน | 100,000/วัน |
| **Deletes** | 1,000/วัน | Unlimited |
| **Lists** | 1,000/วัน | Unlimited |
| **Storage** | 1 GB | 1 GB |
| **ราคา** | ฟรี | $5/เดือน |

---

## คำแนะนำ

### สำหรับการใช้งานปกติ:
- **Free Plan พอใช้** ถ้า:
  - Sync ไม่บ่อย (ทุก 1-2 ชั่วโมง)
  - ไม่กด "RUN FULL SCAN" บ่อย
  - ใช้ optimization ที่ทำไปแล้ว

### ควร Upgrade เป็น Paid Plan ถ้า:
- ต้องการ sync บ่อย (ทุก 5-10 นาที)
- มีหลาย mobile devices
- ต้องการความเสถียร (ไม่ต้องกังวลเรื่อง limit)

---

## หมายเหตุ

- **KV limits reset ทุกวัน** ตาม UTC time
- **การแก้ไขที่ทำไปแล้ว** ลด KV writes ลง 70-90%
- **Frontend จะหยุด retry** เมื่อเจอ KV limit error
- **Auto-scan จะหยุด** เมื่อเจอ KV limit error

