# 🔐 Authentication Setup Guide

## การตั้งค่าระบบ Login

### 1. สร้าง User ใน D1 Database

#### วิธีที่ 1: ใช้ Script (แนะนำ)

```bash
node scripts/create-user.js <username> <password>
```

ตัวอย่าง:
```bash
node scripts/create-user.js admin mypassword123
```

Script จะแสดง SQL command ที่คุณสามารถรันใน D1 Studio

#### วิธีที่ 2: ใช้ D1 Studio โดยตรง

1. ไปที่ Cloudflare Dashboard → Workers & Pages → D1 Database
2. เลือก database `sentinel-dns-db`
3. ไปที่ "Studio" tab
4. รัน SQL ต่อไปนี้:

```sql
-- สร้าง user ใหม่
INSERT INTO users (username, password_hash, created_at, updated_at) 
VALUES (
  'admin', 
  '{"hash":"<SHA256_HASH_OF_PASSWORD>"}', 
  <TIMESTAMP>, 
  <TIMESTAMP>
);
```

**วิธีสร้าง SHA256 hash:**
- ใช้ script: `node scripts/create-user.js admin mypassword123`
- หรือใช้ online tool: https://emn178.github.io/online-tools/sha256.html

### 2. ตรวจสอบ Schema

ตรวจสอบว่า table `users` ถูกสร้างแล้ว:

```sql
-- ตรวจสอบ table
SELECT * FROM users;
```

### 3. Login

1. เปิดหน้าเว็บ → จะ redirect ไปที่ `/login` อัตโนมัติ
2. กรอก username และ password
3. กด "Sign In"
4. ระบบจะ redirect ไปที่ dashboard

### 4. Logout

- กดปุ่ม "Logout" ที่มุมขวาบนของหน้าเว็บ
- หรือลบ `auth_token` จาก localStorage

## 🔒 Security Features

- **Token-based authentication**: ใช้ token สำหรับ authentication
- **Password hashing**: ใช้ SHA-256 hash (แนะนำให้ใช้ bcrypt ใน production)
- **Token expiration**: Token หมดอายุใน 7 วัน
- **Protected routes**: หน้า dashboard ต้อง login ก่อน

## ⚠️ Important Notes

1. **Default user**: ต้องสร้าง user อย่างน้อย 1 คนก่อนใช้งาน
2. **Password security**: ใน production ควรใช้ bcrypt หรือ Argon2 แทน SHA-256
3. **HTTPS**: ควรใช้ HTTPS เสมอเมื่อ deploy
4. **Token storage**: Token เก็บใน localStorage (ควรใช้ httpOnly cookies ใน production)

## 🛠️ Troubleshooting

### ไม่สามารถ login ได้
- ตรวจสอบว่า user ถูกสร้างใน D1 แล้ว
- ตรวจสอบว่า password hash ถูกต้อง
- ตรวจสอบ Workers API URL ใน Settings

### Token หมดอายุ
- Token หมดอายุใน 7 วัน
- Login ใหม่เพื่อรับ token ใหม่

### Redirect loop
- ลบ `auth_token` จาก localStorage
- Refresh หน้าเว็บ
- Login ใหม่

