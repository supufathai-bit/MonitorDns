# แก้ไข Error 500: Failed to trigger mobile app

## ปัญหา
Frontend แสดง error: `Failed to trigger mobile app: 500`

## สาเหตุที่เป็นไปได้

### 1. KV Limit Exceeded (น่าจะเป็นสาเหตุหลัก)
- Cloudflare Workers มี daily limit สำหรับ KV writes
- ถ้าเกิน limit จะ return 500 error
- **แก้ไข**: รอให้ reset ในวันถัดไป หรือ upgrade plan

### 2. Workers URL ไม่ถูกต้อง
- Frontend ใช้ Workers URL เก่า (`monitordnswoker`)
- Workers ที่ deploy ใหม่คือ (`sentinel-dns-api`)

## วิธีตรวจสอบ

### 1. ตรวจสอบ Workers URL ใน Frontend
1. เปิดหน้าเว็บ → Settings
2. ดู **Backend URL** หรือ **Workers URL**
3. ควรเป็น: `https://sentinel-dns-api.snowwhite04-01x.workers.dev`

### 2. ตรวจสอบใน Console (F12)
1. เปิด Developer Tools → Console
2. กด "RUN FULL SCAN"
3. ดู logs:
   ```
   Triggering check at: https://...
   Trigger error: {...}
   Workers URL: https://...
   Response status: 500
   ```

### 3. ทดสอบ Workers API โดยตรง
เปิด URL นี้ใน browser:
```
https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/trigger-check
```

หรือใช้ curl:
```bash
curl -X POST https://sentinel-dns-api.snowwhite04-01x.workers.dev/api/trigger-check
```

**ถ้าได้ error:**
```json
{
  "error": "KV put() limit exceeded for the day."
}
```
→ **KV limit exceeded** ต้องรอให้ reset

**ถ้าได้ success:**
```json
{
  "success": true,
  "message": "Check triggered. Mobile app will check DNS soon.",
  "timestamp": 1234567890
}
```
→ Workers ทำงานปกติ แต่ frontend อาจใช้ URL ผิด

## วิธีแก้ไข

### Option 1: อัพเดท Workers URL ใน Frontend (แนะนำ)

#### วิธีที่ 1: ผ่าน Settings Panel
1. เปิดหน้าเว็บ → Settings
2. กรอก **Backend URL**:
   ```
   https://sentinel-dns-api.snowwhite04-01x.workers.dev
   ```
3. กด Save
4. Refresh หน้าเว็บ

#### วิธีที่ 2: ผ่าน Cloudflare Pages Environment Variables
1. เปิด Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables
2. เพิ่ม/แก้ไข:
   - **Variable name**: `NEXT_PUBLIC_WORKERS_URL`
   - **Value**: `https://sentinel-dns-api.snowwhite04-01x.workers.dev`
3. Redeploy Pages (หรือรอ auto-deploy)

### Option 2: Deploy Workers ใหม่ด้วยชื่อเดิม
```bash
cd workers
# แก้ไข wrangler.toml
# name = "monitordnswoker"
npm run deploy
```

## Error Messages ที่จะเห็น

### KV Limit Exceeded
```
KV write limit exceeded for today. Please try again tomorrow.
Error: KV put() limit exceeded for the day.
```
→ **ต้องรอให้ reset ในวันถัดไป**

### Workers URL ไม่ถูกต้อง
```
Failed to trigger mobile app: 404
Error: Not Found
```
→ **อัพเดท Workers URL**

### Network Error
```
Failed to trigger mobile app: Network Error
```
→ **ตรวจสอบ internet connection**

## การแก้ไขที่ทำไปแล้ว

1. ✅ **ลด KV writes ลง 70-90%** (ตรวจสอบก่อนเขียน)
2. ✅ **Error handling ที่ดีขึ้น** (แสดง error message ที่ชัดเจน)
3. ✅ **Rate limiting** (ไม่เขียนซ้ำถ้า trigger ถูก set เมื่อไม่กี่นาทีที่แล้ว)
4. ✅ **Detailed logging** (แสดง Workers URL และ error details ใน console)

## ทดสอบหลังแก้ไข

1. Refresh หน้าเว็บ
2. เปิด Console (F12)
3. กด "RUN FULL SCAN"
4. ดู logs:
   - `Triggering check at: https://...`
   - `Trigger data: {...}`
   - หรือ error message ที่ชัดเจน

## หมายเหตุ

- **KV limit จะ reset ทุกวัน** (ตาม UTC time)
- **Free Plan**: ~1,000 writes/day
- **Paid Plan**: Unlimited writes

