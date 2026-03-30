# WhereisJason.net

A real-time location dashboard that displays Jason's current location and upcoming location changes based on his public Google Calendar. Built with React, Node.js, SQLite, and deployed to Raspberry Pi with Nginx and Let's Encrypt.

## 📋 What It Does

- **Current Location**: Displays where Jason is right now (e.g., "At Home, Ohio")
- **Next Location**: Shows upcoming location changes with countdown timer
- **Real-time Updates**: Refreshes automatically every 30 seconds
- **Calendar Sync**: Pulls events from Google Calendar every 10 minutes
- **Status Monitoring**: Shows calendar sync health and last update time
- **Responsive Design**: Works on mobile, tablet, and desktop

## ✨ Features

✅ Google Calendar integration (public calendar)
✅ Automatic location extraction from event titles
✅ Real-time location detection and countdown
✅ Responsive mobile-friendly design
✅ Background calendar sync scheduler
✅ SQLite database caching
✅ Production-ready with HTTPS/SSL
✅ Comprehensive error handling
✅ No automated tests (manual testing only)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A public Google Calendar
- Google Calendar API credentials

### Development Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your Google Calendar details
nano .env

# Initialize database
npm run db:migrate

# Start development servers
npm run dev
```

Visit http://localhost:3000 to see the dashboard.

### Building for Production

```bash
npm run build
```

## 📚 Documentation

- **[BUILD_COMPLETE.md](./BUILD_COMPLETE.md)** - What was built and how everything works
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Step-by-step deployment guide for Raspberry Pi
- **[CLAUDE.md](./CLAUDE.md)** - Architecture guide and development notes
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Common commands reference

## 🏗️ Architecture

```
Frontend (React)              Backend (Node.js/Express)        Storage
    ↓                                ↓                              ↓
Web UI Dashboard     ←→     REST API Server         ←→     SQLite Database
(Port 3000/443)           (Port 5000/localhost)          + Google Calendar API
```

## 📱 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/location` | GET | Current and next location |
| `/api/location/current` | GET | Current location only |
| `/api/location/next` | GET | Next location only |
| `/api/calendar/events` | GET | Calendar events list |
| `/api/calendar/sync-status` | GET | Sync status and health |
| `/api/calendar/sync` | POST | Manual sync trigger |
| `/api/health` | GET | Server health check |

## 🔧 Configuration

Edit `.env` file:

```
GOOGLE_CALENDAR_ID=your-id@group.calendar.google.com
GOOGLE_API_KEY=AIzaSyD_your_key_here
CALENDAR_SYNC_INTERVAL=10        # minutes
NODE_ENV=development              # or production
```

## 📅 Google Calendar Setup

1. **Make calendar public:**
   - Google Calendar → Settings → Select calendar → Share with others → "Make available to the public"

2. **Get calendar ID:**
   - Settings → Calendar properties → Copy "Calendar ID"

3. **Create API key:**
   - Google Cloud Console → APIs & Services → Credentials → Create API Key

4. **Event format (automatic parsing):**
   ```
   Event title: "Jason - At Home, Ohio"
   Or location field: "Ohio"
   ```

## 🚢 Deployment

For Raspberry Pi 4 with Ubuntu 25:

```bash
# On Raspberry Pi
git clone <repo> /opt/whereisjason
cd /opt/whereisjason
cp .env.example .env
nano .env  # Add your credentials

npm install
npm run build
npm run db:migrate

sudo chmod +x deploy.sh
sudo ./deploy.sh whereisjason.net admin@example.com
```

The deployment script will:
- Install Nginx and Certbot
- Obtain Let's Encrypt SSL certificate
- Configure Nginx reverse proxy
- Set up auto-start systemd service
- Enable automatic certificate renewal

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

## 📊 Project Structure

```
wij/
├── client/                  # React frontend (TypeScript)
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── pages/          # Dashboard component
│   │   └── styles/         # CSS styling
│   └── public/             # Static assets
├── server/                  # Node.js/Express backend (TypeScript)
│   ├── src/
│   │   ├── db/            # Database and migrations
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── scheduler/     # Calendar sync scheduler
│   └── data/              # SQLite database
├── deploy.sh              # Deployment script
├── DEPLOYMENT.md          # Deployment guide
├── BUILD_COMPLETE.md      # What was built
└── CLAUDE.md              # Architecture guide
```

## 🛠️ Development Commands

```bash
# Development
npm run dev           # Start dev servers (React + Express)
npm run lint          # Check code quality
npm run type-check    # TypeScript checking

# Database
npm run db:migrate    # Initialize database
npm run db:seed       # Add sample data
npm run db:reset      # Clear database

# Production
npm run build         # Build for production
npm start             # Run production server
```

## 📋 System Requirements

- **Development**: Node.js 18+, npm 9+
- **Production**: Raspberry Pi 4, Ubuntu 25, 2GB+ RAM
- **Internet**: Connection for Google Calendar API
- **Domain**: For HTTPS SSL certificates

## 🧪 Testing

All testing is manual:

1. **Local testing:**
   ```bash
   npm run dev
   # Visit http://localhost:3000 and verify functionality
   ```

2. **Production testing:**
   ```bash
   git push
   # On Raspberry Pi: git pull, npm run build, systemctl restart whereisjason
   # Visit https://yourdomain.net and verify
   ```

## 🔐 Security

- HTTPS/SSL with Let's Encrypt (automatic renewal)
- Public calendar only (no private events)
- Environment variables for secrets
- Security headers in Nginx and Express
- No authentication required (public dashboard)

## 📝 License

MIT

## 🤝 Contributing

For changes:
1. Test locally: `npm run dev`
2. Build: `npm run build`
3. Commit and push: `git commit && git push`
4. Deploy on Raspberry Pi: `git pull && npm install && npm run build && systemctl restart whereisjason`

## 📞 Support

- Check [BUILD_COMPLETE.md](./BUILD_COMPLETE.md) for troubleshooting
- Review logs: `sudo journalctl -u whereisjason.service -f`
- Check Google Calendar settings if events don't appear
- Verify API key is valid and calendar is publicly shared
