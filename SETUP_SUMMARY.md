# Setup Summary

Your WhereisJason project has been fully initialized with production-ready deployment configuration.

## What Was Created

### Documentation
- **CLAUDE.md** - Complete architecture guide for Claude Code agents
- **DEPLOYMENT.md** - Step-by-step deployment guide for Raspberry Pi
- **QUICK_REFERENCE.md** - Common commands for development and operations
- **README.md** - Quick start overview

### Configuration Files
- **package.json** (root) - Monorepo scripts combining client and server
- **server/package.json** - Express backend dependencies and scripts
- **client/package.json** - React frontend dependencies and scripts
- **server/tsconfig.json** - TypeScript configuration for backend
- **client/tsconfig.json** - TypeScript configuration for frontend
- **server/.eslintrc.json** - Code linting rules
- **.env.example** - Environment variables template
- **.gitignore** - Git ignore patterns

### Source Code (Starter Templates)
- **server/src/index.ts** - Production-ready Express server with error handling
- **server/src/db/migrate.ts** - Database migration script
- **server/src/db/seed.ts** - Database seeding script
- **client/src/App.tsx** - Main React component
- **client/src/pages/Dashboard.tsx** - Location dashboard component
- **client/public/index.html** - HTML template

### Deployment Automation
- **deploy.sh** - Complete deployment script that:
  - Installs and validates all system dependencies
  - Obtains/validates Let's Encrypt SSL certificates
  - Configures Nginx as a reverse proxy
  - Creates systemd service for auto-start on reboot
  - Enables automatic certificate renewal
  - Reports comprehensive status and validation results
  - Is idempotent (safe to run multiple times)

### Git Repository
- Initialized Git repository with proper .gitignore

## Technology Stack

```
Frontend:           React with TypeScript
Backend:            Express (Node.js) with TypeScript
Database:           SQLite (file-based)
Web Server:         Nginx (reverse proxy with SSL/HTTPS)
SSL/HTTPS:          Let's Encrypt (free, auto-renewed)
Server OS:          Ubuntu 25 on Raspberry Pi 4
Auto-start:         Systemd service
Deployment:         Git push → Git pull + build on Raspberry Pi
```

## Directory Structure

```
wij/
├── client/                              # React frontend
│   ├── src/
│   │   ├── App.tsx                     # Main component
│   │   ├── pages/Dashboard.tsx         # Dashboard component
│   │   └── index.tsx                   # React entry point
│   ├── public/index.html               # HTML template
│   └── package.json
├── server/                              # Express backend
│   ├── src/
│   │   ├── index.ts                    # Server entry point
│   │   ├── db/migrate.ts               # Database migrations
│   │   └── db/seed.ts                  # Database seeding
│   └── package.json
├── deploy.sh                            # Deployment script
├── package.json                         # Root scripts
├── CLAUDE.md                            # Architecture guide
├── DEPLOYMENT.md                        # Deployment guide
├── QUICK_REFERENCE.md                   # Common commands
└── README.md                            # Project overview
```

## Deployment Architecture

```
┌─────────────────┐
│   Windows PC    │
│  Development    │
└────────┬────────┘
         │ Git push
         ↓
┌─────────────────────────────────────┐
│    Git Repository (GitHub, etc)     │
└────────┬────────────────────────────┘
         │ Git pull
         ↓
┌──────────────────────────────────────────────┐
│         Raspberry Pi 4 (Ubuntu 25)           │
├──────────────────────────────────────────────┤
│ npm install → npm run build → npm start      │
└──────────────────────────────────────────────┘
         ↓
    ┌────┴─────┐
    ↓          ↓
┌────────┐  ┌──────────────────┐
│ Nginx  │  │ Express          │
│ :443   │→ │ localhost:5000   │
│ HTTPS  │  │ SQLite Database  │
└────────┘  └──────────────────┘
    ↑
    │ Internet
    │ HTTPS from client
```

## Next Steps

### 1. Prepare Your Windows Development Machine
```bash
cd C:\Users\jwtyler\Documents\Repos\wij

# Initialize Git (already done)
# Push to your Git repository
git remote add origin <your-repo-url>
git add .
git commit -m "Initial project setup with deployment configuration"
git push -u origin main
```

### 2. Prepare Google Calendar API
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable the Google Calendar API
4. Get your public calendar ID (in calendar settings)
5. Generate an API key for public calendar access
6. Save these in your `.env` file before deployment

### 3. Prepare Your Raspberry Pi
1. Install Ubuntu 25 on Raspberry Pi 4
2. Ensure network connectivity (can reach your domain)
3. Point your domain DNS to the Raspberry Pi's IP address

### 4. First Deployment on Raspberry Pi
Follow the step-by-step instructions in **DEPLOYMENT.md**:
```bash
# On Raspberry Pi
git clone <your-repo-url> /opt/whereisjason
cd /opt/whereisjason
sudo cp .env.example .env
sudo nano .env  # Add your Google Calendar credentials
npm install
npm run build
npm run db:migrate
sudo chmod +x deploy.sh
sudo ./deploy.sh whereisjason.net admin@whereisjason.net
```

### 5. Implement Core Features
1. **Google Calendar Integration** (`server/src/services/calendarService.ts`)
   - Fetch events from public calendar API
   - Parse event titles/descriptions for location data
   - Cache events in SQLite

2. **Location Logic** (`server/src/services/locationService.ts`)
   - Calculate current location from calendar events
   - Determine next location change and time
   - Apply any custom location rules

3. **Dashboard UI** (`client/src/pages/Dashboard.tsx`)
   - Display current location prominently
   - Show next location and change time
   - Display countdown timer
   - Add contact/scheduling links

4. **API Endpoints** (`server/src/routes/`)
   - GET `/api/location` - Returns current and next location
   - GET `/api/calendar` - Returns upcoming events
   - GET `/api/config` - Returns frontend configuration

### 6. Ongoing Development Workflow
```bash
# On Windows
npm run dev          # Test locally
git add .
git commit -m "description"
git push

# On Raspberry Pi
git pull origin main
npm install
npm run build
sudo systemctl restart whereisjason
```

## Key Files to Understand First

When implementing features, focus on these files:

1. **CLAUDE.md** - Architecture and development guide
2. **deploy.sh** - Deployment automation script
3. **server/src/index.ts** - Express server setup
4. **client/src/pages/Dashboard.tsx** - Main UI component
5. **.env.example** - Configuration template

## Important Notes

- **No automated tests** - All testing is manual on the Raspberry Pi
- **Manual deployment** - No CI/CD pipeline. You git push, then manually pull on Raspberry Pi
- **SSL is automatic** - Let's Encrypt handles certificate management
- **Auto-start enabled** - Services restart on Raspberry Pi reboot
- **Idempotent deployment** - Run `deploy.sh` multiple times without issues
- **Production-ready logging** - Both Express and Nginx log errors
- **SQLite on Raspberry Pi** - Lightweight, file-based database

## Support Resources

- **Architecture questions** - See CLAUDE.md
- **Deployment questions** - See DEPLOYMENT.md
- **Quick operations** - See QUICK_REFERENCE.md
- **Project overview** - See README.md

## Production Checklist Before Going Live

- [ ] Google Calendar API credentials configured in `.env`
- [ ] Domain DNS pointing to Raspberry Pi
- [ ] Port forwarding configured (80 → Pi, 443 → Pi)
- [ ] Initial deployment completed successfully
- [ ] HTTPS working (curl https://yourdomain.com)
- [ ] Services auto-start verified after reboot
- [ ] Certificate renewal timer active
- [ ] Database seeded with initial data
- [ ] Dashboard displays correctly
- [ ] Location data parsing working
- [ ] Contact/scheduling links functional

---

**You're all set!** The project is ready for development and deployment. Follow the guides in DEPLOYMENT.md to set up your Raspberry Pi server.
