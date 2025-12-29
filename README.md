# 🛡️ Sentinel DNS Monitor

A Next.js application to monitor domain availability across Thai ISPs (AIS, True, DTAC, NT) and Global DNS, with Telegram alerting capabilities.

## ✨ Features

- ✅ **Real ISP DNS Checking** - Queries actual ISP DNS servers (AIS, True, DTAC, NT) via UDP
- ✅ **Telegram Alerts** - Sends notifications when domains are blocked
- ✅ **Multi-ISP Monitoring** - Check domains across multiple Thai ISPs simultaneously
- ✅ **Modern UI** - Beautiful dark-themed dashboard with real-time updates
- ✅ **Auto-scanning** - Configurable interval-based automatic scanning

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Server will run at `http://localhost:5555`

## 📖 Usage

### 1. Configure Telegram Bot

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Get your Bot Token
3. Get your Chat ID (send a message to your bot, then visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`)
4. Go to Settings in the app and enter your Bot Token and Chat ID

### 2. Add Domains to Monitor

1. Go to Dashboard
2. Enter domain URL (e.g., `https://example.com`)
3. Click the + button to add

### 3. Run DNS Checks

- Click **"RUN FULL SCAN"** to check all domains
- Or click the refresh icon on individual domain cards
- System will automatically scan based on configured interval

## 🧪 Testing

```bash
# Test API endpoint
npm run test:api google.com

# Test Telegram bot
npm run test:telegram YOUR_BOT_TOKEN YOUR_CHAT_ID
```

## 📁 Project Structure

```
MonitorDns/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   │   └── check/         # DNS check endpoint
│   ├── page.tsx           # Main dashboard page
│   └── layout.tsx         # App layout
├── components/            # React components
│   ├── DomainCard.tsx     # Domain monitoring card
│   └── SettingsPanel.tsx  # Settings panel
├── services/             # Business logic
│   ├── dnsService.ts      # DNS checking service
│   └── telegramService.ts # Telegram alert service
├── constants.ts          # ISP DNS servers configuration
└── types.ts              # TypeScript types
```

## 🔧 Configuration

### ISP DNS Servers

Edit `app/api/check/route.ts` to change DNS servers:

```typescript
const ISP_DNS_SERVERS: Record<string, string> = {
  'Global (Google)': '8.8.8.8',
  'AIS': '202.44.204.34',
  'TRUE': '203.144.206.29',
  'DTAC': '202.44.8.8',
  'NT': '122.155.1.8',
};
```

## 🌐 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

**Note:** Vercel Serverless Functions support UDP, but verify platform compatibility.

### Railway/Render

1. Push code to repository
2. Deploy on platform
3. Set environment variables if needed

### Self-hosted

```bash
npm run build
npm start
```

## ⚠️ Important Notes

- **Cloudflare Workers**: Not supported (cannot send UDP packets)
- **Vercel Edge Functions**: Not supported (use Node.js runtime instead)
- **UDP Support**: Required for real ISP DNS checking

## 📚 Documentation

- [Testing Guide](./TESTING.md) - How to test API and Telegram
- [Setup Guide](./SETUP.md) - Configuration instructions
- [Next.js DNS Setup](./NEXTJS_DNS_SETUP.md) - Technical details

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **dns-packet** - DNS packet encoding/decoding
- **Node.js dgram** - UDP socket support

## 📝 License

Private project

---

Made with ❤️ for monitoring DNS availability across Thai ISPs
