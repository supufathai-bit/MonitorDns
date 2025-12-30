# 📱 Sentinel DNS Monitor - Android App

Android app สำหรับเช็ค DNS จากเครือข่าย ISP จริงๆ และ sync กับ Cloudflare Workers

---

## 🏗️ Project Structure

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/sentinel/dns/
│   │   │   ├── ui/
│   │   │   ├── service/
│   │   │   ├── data/
│   │   │   ├── utils/
│   │   │   └── model/
│   │   └── res/
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── README.md
```

---

## 🚀 Quick Start

### 1. เปิดใน Android Studio

1. เปิด Android Studio
2. File → Open
3. เลือก folder `android-app`
4. รอ Gradle sync

### 2. Run App

1. เชื่อมต่อ Android device หรือเปิด emulator
2. กด Run (▶️)
3. App จะ install และเปิดอัตโนมัติ

---

## 📋 Features

- ✅ DNS Check จาก ISP จริง
- ✅ ISP Detection อัตโนมัติ
- ✅ Auto Sync กับ Workers API
- ✅ Background Service
- ✅ Notifications

---

## 🔧 Configuration

### 1. ตั้งค่า Workers URL

ใน Settings:

- Server URL: `https://your-workers.workers.dev`

### 2. ตั้งค่า Auto Check Interval

- Default: 1 hour
- สามารถปรับได้ใน Settings

---

## 📝 Next Steps

1. ✅ Project structure created
2. ⏳ Implement UI components
3. ⏳ Implement services
4. ⏳ Test and deploy

---

## 📚 Documentation

- `ANDROID_APP_DESIGN.md` - Design guide
- `ANDROID_APP_INTEGRATION.md` - Integration guide
