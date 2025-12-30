# ตัวเลือกที่เก็บข้อมูลที่ดีกว่า Cloudflare KV

## ปัญหาของ Cloudflare KV Free Plan

- **Writes**: 1,000 ครั้ง/วัน (น้อยมาก!)
- **Reads**: 100,000 ครั้ง/วัน (พอใช้)
- **Storage**: 1 GB (พอใช้)

## ตัวเลือกที่ดีกว่า

### 1. **Cloudflare D1** ⭐ (แนะนำที่สุด!)

**ข้อดี:**
- ✅ **Free tier**: 5 GB storage, 5M reads/month, **100K writes/month**
- ✅ 100K writes/month = **~3,333 writes/day** (มากกว่า KV 3 เท่า!)
- ✅ SQL database (ง่ายต่อการ query และ manage)
- ✅ ทำงานบน Cloudflare Edge (เร็วมาก)
- ✅ ไม่ต้อง setup database server เอง
- ✅ ฟรี!

**ข้อจำกัด:**
- ต้องเขียน SQL queries
- ต้อง migrate ข้อมูลจาก KV

**ราคา:**
- Free: 5 GB, 5M reads/month, 100K writes/month
- Paid: $0.001/GB storage, $0.001/1M reads, $1.00/1M writes

**เหมาะสำหรับ:**
- ✅ เก็บ domains list
- ✅ เก็บ settings
- ✅ เก็บ mobile app results (latest results)
- ✅ Query และ filter ข้อมูลได้ง่าย

---

### 2. **Upgrade Cloudflare KV** (ง่ายที่สุด)

**ข้อดี:**
- ✅ ไม่ต้องเปลี่ยนโค้ดเลย
- ✅ **Unlimited writes** ($5/เดือน)
- ✅ ง่าย รวดเร็ว

**ข้อจำกัด:**
- ต้องจ่าย $5/เดือน (~175 บาท/เดือน)

**ราคา:**
- Free: 1,000 writes/day
- Paid ($5/เดือน): **Unlimited writes**

**เหมาะสำหรับ:**
- ✅ ถ้าไม่ต้องการเปลี่ยนโค้ด
- ✅ Budget พอจ่าย $5/เดือน

---

### 3. **External Database** (Supabase, PlanetScale, Neon)

**ข้อดี:**
- ✅ Free tier มักจะดีกว่า Cloudflare KV
- ✅ PostgreSQL/MySQL (powerful)
- ✅ มี dashboard จัดการ

**ข้อจำกัด:**
- ต้องจัดการ database server เอง
- Latency สูงกว่า (ไม่ได้อยู่บน Edge)
- ต้อง setup connection pooling

**ตัวอย่าง:**
- **Supabase**: Free tier - 500 MB database, unlimited API requests
- **PlanetScale**: Free tier - 5 GB storage, unlimited reads, 1B row writes/month
- **Neon**: Free tier - 3 GB storage, unlimited API requests

**เหมาะสำหรับ:**
- ✅ ถ้าต้องการ database ที่ powerful
- ✅ ถ้าไม่กังวลเรื่อง latency

---

## คำแนะนำ

### สำหรับ Use Case นี้ (DNS Monitor):

**แนะนำ: Cloudflare D1** ⭐

**เหตุผล:**
1. ✅ **Free tier ดีกว่า KV มาก** (3,333 writes/day vs 1,000 writes/day)
2. ✅ ทำงานบน Cloudflare Edge (เร็ว)
3. ✅ SQL database (ง่ายต่อการ query)
4. ✅ ไม่ต้องจ่ายเงิน
5. ✅ อยู่ใน ecosystem เดียวกับ Workers

---

## เปรียบเทียบ

| Feature | KV Free | KV Paid | D1 Free | D1 Paid |
|---------|---------|---------|---------|---------|
| **Writes/day** | 1,000 | Unlimited | ~3,333 | Unlimited |
| **Reads/day** | 100,000 | 100,000 | ~166,666 | Unlimited |
| **Storage** | 1 GB | 1 GB | 5 GB | Unlimited |
| **ราคา/เดือน** | ฟรี | $5 | ฟรี | Pay-as-you-go |
| **Query** | Key-Value | Key-Value | SQL | SQL |
| **Latency** | ต่ำมาก | ต่ำมาก | ต่ำมาก | ต่ำมาก |

---

## Next Steps

### Option 1: Migrate to D1 (แนะนำ)

ดู `MIGRATE_TO_D1.md` สำหรับ step-by-step guide

### Option 2: Upgrade KV (ง่ายที่สุด)

1. ไปที่ Cloudflare Dashboard
2. Upgrade Workers → Paid Plan ($5/เดือน)
3. ได้ Unlimited KV writes ทันที

---

## สรุป

**แนะนำ: Cloudflare D1** เพราะ:
- ✅ Free tier ดีกว่า KV มาก (3x writes)
- ✅ SQL database (ง่ายต่อการ manage)
- ✅ ฟรี!
- ✅ ทำงานบน Edge (เร็ว)

**หรือ Upgrade KV** ถ้า:
- ✅ ไม่ต้องการเปลี่ยนโค้ด
- ✅ Budget พอจ่าย $5/เดือน

