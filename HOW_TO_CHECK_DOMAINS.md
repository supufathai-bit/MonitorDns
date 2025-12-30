# 🔍 วิธีเช็คว่าระบบส่ง Domains ไปให้ Mobile App กี่ลิ้ง

## 🧪 วิธีที่ 1: เปิด Workers API ใน Browser (ง่ายที่สุด)

### ขั้นตอน:

1. **เปิด Browser** (Chrome, Firefox, etc.)

2. **เปิด URL:**
   ```
   https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync/domains
   ```

3. **ดูผลลัพธ์:**
   ```json
   {
     "success": true,
     "domains": [
       "ufathai.win",
       "ufathai.com",
       "www.zec777.com"
     ],
     "interval": 3600000,
     "message": "Domains to check"
   }
   ```

4. **นับ domains:**
   - ดู array `domains`
   - นับจำนวน domains
   - ตรวจสอบว่า domains ถูกต้องหรือไม่

---

## 🧪 วิธีที่ 2: ใช้ PowerShell/Command Line

### PowerShell:
```powershell
Invoke-RestMethod -Uri "https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync/domains" | ConvertTo-Json
```

### หรือใช้ curl:
```bash
curl https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync/domains
```

---

## 🧪 วิธีที่ 3: ดูใน Frontend Logs

### ขั้นตอน:

1. **เปิดหน้าเว็บ:** https://monitordns.pages.dev/

2. **ดู SYSTEM LOGS:**
   - ควรเห็น: "Syncing X domains to Workers API..."
   - ควรเห็น: "Successfully synced X domains to Workers API"
   - X = จำนวน domains

3. **ตัวอย่าง:**
   ```
   12:30:45 PM - Syncing 3 domains to Workers API...
   12:30:45 PM - Successfully synced 3 domains to Workers API
   ```

---

## 🧪 วิธีที่ 4: ดูใน Mobile App

### ขั้นตอน:

1. **เปิด Android App**

2. **ไปที่ Settings**

3. **กด "TEST CONNECTION"**

4. **ดู Toast Message:**
   - ควรเห็น: "Connection successful! Found X domains"
   - X = จำนวน domains

---

## 🧪 วิธีที่ 5: ใช้ Browser Developer Tools

### ขั้นตอน:

1. **เปิดหน้าเว็บ:** https://monitordns.pages.dev/

2. **กด F12** (เปิด Developer Tools)

3. **ไปที่ Console tab**

4. **ดู Logs:**
   - ควรเห็น: "Domains synced to Workers API: [...]"
   - ดู array ของ domains

---

## 📊 ตัวอย่างผลลัพธ์

### ถ้ามี 3 domains:
```json
{
  "success": true,
  "domains": [
    "ufathai.win",
    "ufathai.com",
    "www.zec777.com"
  ],
  "interval": 3600000,
  "message": "Domains to check"
}
```

### ถ้ามี 4 domains (รวม google.com):
```json
{
  "success": true,
  "domains": [
    "ufathai.win",
    "ufathai.com",
    "www.zec777.com",
    "google.com"
  ],
  "interval": 3600000,
  "message": "Domains to check"
}
```

---

## ⚠️ ถ้ายังเห็น domains เก่า

### วิธีแก้ไข:

1. **Hard Refresh Frontend:**
   - กด Ctrl+Shift+R
   - หรือเปิด Incognito Mode

2. **ตรวจสอบว่า Frontend sync หรือยัง:**
   - ดู Logs → ควรเห็น "Syncing X domains..."
   - ถ้าไม่มี → Workers URL อาจไม่ได้ตั้งค่า

3. **Sync ใหม่:**
   - ลบ domain แล้วเพิ่มใหม่
   - หรือ refresh หน้าเว็บ

4. **Clear KV Storage (ถ้าจำเป็น):**
   ```bash
   # ใช้ Wrangler CLI
   cd workers
   wrangler kv:key delete "domains:list" --namespace-id=a62456a79f7b4522bb4d9ccabb16b86e
   ```
   - แล้ว refresh หน้าเว็บ → จะ sync domains ใหม่

---

## 🎯 Checklist

- [ ] เปิด Workers API ใน browser
- [ ] ดู domains array
- [ ] นับจำนวน domains
- [ ] ตรวจสอบว่า domains ถูกต้องหรือไม่
- [ ] ถ้ายังไม่ถูกต้อง → sync ใหม่

---

## 💡 Tips

### วิธีที่เร็วที่สุด:
**เปิด URL ใน browser:**
```
https://monitordnswoker.snowwhite04-01x.workers.dev/api/mobile-sync/domains
```

### วิธีที่แม่นยำที่สุด:
**ดูใน Mobile App → Settings → TEST CONNECTION**

---

## 🎉 สรุป

**วิธีเช็ค:**
1. ✅ เปิด Workers API ใน browser (ง่ายที่สุด)
2. ✅ ดู Frontend Logs
3. ✅ ดู Mobile App Toast Message
4. ✅ ใช้ Developer Tools

**ผลลัพธ์:**
- ดู `domains` array
- นับจำนวน domains
- ตรวจสอบว่า domains ถูกต้องหรือไม่

**ระบบพร้อมแล้ว!** 🎉

