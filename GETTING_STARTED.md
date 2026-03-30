# Getting Started with WhereisJason.net

The entire website is now **fully built and ready to deploy**. Here's everything you need to know to get started.

## 📦 What Was Built

34 files across a complete full-stack application:

### Backend (Node.js/Express/TypeScript)
- ✅ Google Calendar API integration service
- ✅ Location extraction and detection logic
- ✅ SQLite database with schema and migrations
- ✅ Scheduled calendar sync (every 10 minutes)
- ✅ REST API with 7 endpoints
- ✅ Error handling and logging
- ✅ Production-ready Express server

### Frontend (React/TypeScript)
- ✅ Modern dashboard component
- ✅ Real-time location display (current + next)
- ✅ API client with caching
- ✅ Responsive mobile-first design
- ✅ Auto-refresh every 30 seconds
- ✅ Manual sync capability
- ✅ Beautiful gradient UI

### DevOps
- ✅ Automated deployment script for Raspberry Pi
- ✅ Nginx reverse proxy configuration
- ✅ Let's Encrypt SSL automation
- ✅ Systemd service auto-start
- ✅ Complete deployment documentation

## 🚀 Get Started in 5 Minutes

### Step 1: Clone/Setup (Windows)

```bash
cd C:\Users\jwtyler\Documents\Repos\wij
git init
git remote add origin <your-git-repo-url>
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Google Calendar

```bash
cp .env.example .env
# Edit .env with your credentials:
# - GOOGLE_CALENDAR_ID
# - GOOGLE_API_KEY
```

**Get credentials:**
1. Go to https://console.cloud.google.com
2. Create a project, enable Google Calendar API
3. Create an API key (Credentials → API Key)
4. Go to Google Calendar settings, make calendar public
5. Get calendar ID from "Integrate calendar" section

### Step 4: Initialize Database

```bash
npm run db:migrate
npm run db:seed          # Optional: adds sample data
```

### Step 5: Run Locally

```bash
npm run dev
```

Visit **http://localhost:3000** to see the dashboard!

## 📊 Project Overview

```
WhereisJason.net - Full Stack Location Dashboard
│
├─ Frontend: React Dashboard (TypeScript)
│  ├─ Current Location Display
│  ├─ Next Location + Countdown
│  ├─ Sync Status Monitoring
│  └─ Responsive Design (Mobile/Desktop)
│
├─ Backend: Node.js/Express REST API (TypeScript)
│  ├─ Google Calendar Integration
│  ├─ Location Extraction Service
│  ├─ Scheduled Sync (every 10 min)
│  ├─ SQLite Database
│  └─ 7 RESTful Endpoints
│
├─ DevOps: Production Ready
│  ├─ Nginx Reverse Proxy (HTTPS)
│  ├─ Let's Encrypt SSL (Auto-renewal)
│  ├─ Systemd Auto-start
│  └─ Deployment Automation Script
│
└─ Documentation: Complete Guides
   ├─ BUILD_COMPLETE.md (What was built)
   ├─ DEPLOYMENT.md (Raspberry Pi setup)
   ├─ CLAUDE.md (Architecture)
   ├─ QUICK_REFERENCE.md (Commands)
   └─ README.md (Project overview)
```

## 📁 File Structure

```
wij/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── api/client.ts            ← API communication
│   │   ├── pages/Dashboard.tsx      ← Main UI component
│   │   ├── styles/index.css         ← Styling (gradients, responsive)
│   │   ├── App.tsx                  ← Main component
│   │   └── index.tsx                ← React entry point
│   └── public/index.html            ← HTML template
│
├── server/                          # Node.js Backend
│   ├── src/
│   │   ├── index.ts                 ← Express server
│   │   ├── types/index.ts           ← TypeScript types
│   │   ├── db/
│   │   │   ├── db.ts                ← Database connection
│   │   │   ├── schema.ts            ← Schema initialization
│   │   │   ├── migrate.ts           ← Database migrations
│   │   │   └── seed.ts              ← Sample data
│   │   ├── services/
│   │   │   ├── calendarService.ts   ← Google Calendar API
│   │   │   └── locationService.ts   ← Location detection
│   │   ├── routes/
│   │   │   ├── location.ts          ← Location endpoints
│   │   │   ├── calendar.ts          ← Calendar endpoints
│   │   │   └── config.ts            ← Config endpoint
│   │   └── scheduler/
│   │       └── calendarSync.ts      ← Background sync job
│   └── package.json                 ← Backend dependencies
│
├── deploy.sh                        ← Deployment script (for Raspberry Pi)
├── package.json                     ← Root scripts
├── .env.example                     ← Configuration template
├── README.md                        ← Project overview
├── BUILD_COMPLETE.md                ← Detailed build documentation
├── DEPLOYMENT.md                    ← Raspberry Pi deployment guide
├── CLAUDE.md                        ← Architecture guide
└── QUICK_REFERENCE.md               ← Common commands
```

## 🔥 Key Features

| Feature | How It Works |
|---------|-------------|
| **Google Calendar Integration** | Fetches public calendar events every 10 minutes via API |
| **Location Detection** | Parses event titles for location (e.g., "Jason - At Ohio") |
| **Real-time Dashboard** | Shows current location with gradient UI, updates every 30 sec |
| **Countdown Timer** | Calculates time until next location change |
| **Sync Monitoring** | Displays calendar sync status and errors |
| **Manual Sync** | Button to immediately fetch latest events |
| **Responsive Design** | Works perfectly on mobile, tablet, and desktop |
| **HTTPS/SSL** | Let's Encrypt certificates with auto-renewal |
| **Auto-start** | Service restarts on Raspberry Pi reboot |

## 🛠️ Development Workflow

### Development (Windows)

```bash
# Start dev servers
npm run dev

# Code quality
npm run lint
npm run type-check

# Build for testing
npm run build

# Test production build
npm start
```

### Deployment (Raspberry Pi)

```bash
# Push from Windows
git add .
git commit -m "message"
git push origin main

# On Raspberry Pi
git pull origin main
npm install
npm run build
sudo systemctl restart wheresjason
```

## 📚 Documentation You'll Need

1. **[README.md](./README.md)** - Start here! Project overview and quick start
2. **[BUILD_COMPLETE.md](./BUILD_COMPLETE.md)** - Deep dive into what was built
3. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to Raspberry Pi step-by-step
4. **[CLAUDE.md](./CLAUDE.md)** - Architecture and development guide
5. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Command cheatsheet

## 🎯 Next Steps

### Immediate (Next 5 minutes)
1. ✅ Configure Google Calendar (get API key + make public)
2. ✅ Edit `.env` with your credentials
3. ✅ Run `npm install && npm run db:migrate`
4. ✅ Run `npm run dev` and test on http://localhost:3000

### Before Deployment (Next hour)
1. ✅ Test with real Google Calendar events
2. ✅ Verify location parsing works
3. ✅ Build production version: `npm run build`
4. ✅ Push to Git repository

### Deployment (Next few hours)
1. ✅ Set up Raspberry Pi with Ubuntu 25
2. ✅ Follow DEPLOYMENT.md guide
3. ✅ Run `deploy.sh` script
4. ✅ Verify at https://yourdomain.net

## 🔐 Security Checklist

- ✅ Never commit `.env` file (it's in `.gitignore`)
- ✅ Keep Google API key secret
- ✅ Make only public calendar accessible (not private)
- ✅ HTTPS/SSL enabled with Let's Encrypt
- ✅ Security headers configured in Nginx and Express
- ✅ No user authentication needed (public dashboard)

## 📊 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | 18.2 + 5.3 |
| **Backend** | Node.js + Express | 18+ + 4.18 |
| **Database** | SQLite | 5.1 |
| **Styling** | CSS (no frameworks) | Modern CSS3 |
| **APIs** | Google Calendar API | v3 |
| **Server** | Nginx | Latest |
| **SSL** | Let's Encrypt | Certbot |
| **Process Manager** | Systemd | Linux native |

## ❓ Common Questions

**Q: Do I need to set up anything on the Raspberry Pi first?**
A: Just Ubuntu 25 with internet access. The `deploy.sh` script handles everything else.

**Q: How do I change what location data is extracted?**
A: Edit `server/src/services/locationService.ts` - look for the `parseLocationFromEvent()` function.

**Q: Can I use a private Google Calendar?**
A: No, only public calendars work with API keys. OAuth would be needed for private calendars.

**Q: How often does it update?**
A: Calendar syncs every 10 minutes (configurable), dashboard refreshes every 30 seconds.

**Q: What if events don't show up?**
A: Check: 1) Calendar is public, 2) API key is valid, 3) Calendar ID is correct, 4) Check sync status at /api/calendar/sync-status

**Q: Can I customize the styling?**
A: Yes! Edit `client/src/styles/index.css` - all colors and layout are customizable.

## 🆘 Troubleshooting Quick Links

- **Setup issues**: See [BUILD_COMPLETE.md - Troubleshooting](./BUILD_COMPLETE.md#troubleshooting)
- **Deployment issues**: See [DEPLOYMENT.md - Troubleshooting](./DEPLOYMENT.md#troubleshooting-deployment)
- **Google Calendar**: Check [DEPLOYMENT.md - SSL Certificate Issues](./DEPLOYMENT.md#ssl-certificate-issues)
- **Command reference**: See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

## 📞 Support Resources

1. **Check the docs first** - Most issues are covered in the guides
2. **Review logs**: `sudo journalctl -u wheresjason.service -f`
3. **Test manually**: `curl http://localhost:5000/api/health`
4. **Check Nginx**: `sudo nginx -t` and `sudo tail -f /var/log/nginx/wheresjason_error.log`
5. **Check database**: `sqlite3 /opt/wheresjason/server/data/app.db`

## ✨ What Makes This Special

- **No frameworks**: UI uses vanilla CSS (no Bootstrap, Tailwind)
- **No dependencies bloat**: Minimal packages, optimized for Raspberry Pi
- **Type-safe**: Full TypeScript throughout
- **Production-ready**: Deployment automation included
- **Well-documented**: Comprehensive guides for every step
- **Maintainable**: Clean code structure, easy to modify
- **Responsive**: Looks great on any device
- **Secure**: HTTPS, security headers, API validation

## 🎉 You're All Set!

The entire WhereisJason.net website is built and ready to go. Follow the steps above to get started, then deploy to your Raspberry Pi using the DEPLOYMENT.md guide.

**Questions? Check the documentation files - they have comprehensive answers and examples.**

Happy deploying! 🚀
