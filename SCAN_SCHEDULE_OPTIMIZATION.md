# Scan Schedule Optimization - 4 Scans per Day

## การตั้งค่า

### Default Settings
- **Check Interval**: 6 ชั่วโมง (360 นาที)
- **Scans per Day**: 4 ครั้ง
- **Schedule**: 
  - 00:00 (เที่ยงคืน)
  - 06:00 (เช้า)
  - 12:00 (เที่ยง)
  - 18:00 (เย็น)

### KV Writes Calculation

#### ก่อนแก้ไข (ปัญหาเดิม):
```
1 scan = 1 trigger check = 1 KV write
+ Domain sync (ถ้ามีการเปลี่ยนแปลง) = 1 KV write
+ Mobile app sync (15 results) = 15 KV writes

Total per scan: ~17 KV writes
3 scans/day = 51 KV writes/day ✅ (ยังไม่เกิน 1,000)
```

#### หลังแก้ไข (Optimized):
```
1 scan = 1 trigger check = 1 KV write (ถ้าไม่ซ้ำ)
+ Domain sync = 0-1 KV writes (เฉพาะเมื่อเปลี่ยน)
+ Mobile app sync = 2-5 KV writes (เฉพาะเมื่อเปลี่ยน)

Total per scan: ~3-7 KV writes
4 scans/day = 12-28 KV writes/day ✅✅ (ปลอดภัยมาก!)
```

## เปรียบเทียบ Options

| Interval | Scans/Day | KV Writes/Day | Status |
|----------|-----------|---------------|--------|
| **6 hours** | 4 | 12-28 | ✅✅ Recommended (Default) |
| **8 hours** | 3 | 9-21 | ✅✅ Very Safe |
| **12 hours** | 2 | 6-14 | ✅✅✅ Ultra Safe |
| **24 hours** | 1 | 3-7 | ✅✅✅ Ultra Safe |

## วิธีตั้งค่า

### Option 1: ผ่าน Settings Panel
1. เปิดหน้าเว็บ → Settings
2. ดู **Check Interval (Min)**
3. ตั้งค่าเป็น:
   - **360 นาที** (6 ชั่วโมง) = 4 ครั้ง/วัน ✅ (Default)
   - **480 นาที** (8 ชั่วโมง) = 3 ครั้ง/วัน
   - **720 นาที** (12 ชั่วโมง) = 2 ครั้ง/วัน
4. กด **Save**

### Option 2: ใช้ Quick Buttons
- กด **"6 Hours (4x/day)"** = ตั้งเป็น 360 นาที (Default)
- กด **"6 Hours"** = ตั้งเป็น 360 นาที

## Auto-Scan Schedule

ระบบจะสแกนอัตโนมัติตาม interval ที่ตั้งไว้:
- **ครั้งที่ 1**: เมื่อเปิดหน้าเว็บ (ถ้าเกิน interval)
- **ครั้งถัดไป**: ทุก 6 ชั่วโมง (ตาม interval)

## Manual Scan

ยังสามารถกด **"RUN FULL SCAN"** ได้ตลอดเวลา:
- ไม่กระทบ auto-scan schedule
- ใช้ KV writes เพิ่มเติม (แต่ยังอยู่ใน limit)

## KV Limit Safety

### Free Plan (1,000 writes/day):
- **4 scans/day**: 12-28 writes ✅✅ (ใช้แค่ 1-3%) - Default
- **3 scans/day**: 9-21 writes ✅✅ (ใช้แค่ 1-2%)
- **6 scans/day**: 18-42 writes ✅ (ใช้แค่ 2-4%)

### Margin of Safety:
- **เหลือ ~980 writes** สำหรับ manual scans และ domain syncs
- **ปลอดภัยมาก!** แม้จะกด manual scan บ่อยๆ

## หมายเหตุ

- **Interval จะ reset** เมื่อ refresh หน้าเว็บ
- **Auto-scan จะหยุด** ถ้าเจอ KV limit error
- **Manual scan ยังใช้ได้** แม้ auto-scan หยุด

