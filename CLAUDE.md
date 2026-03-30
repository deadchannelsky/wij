# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhereisJason.net is a location dashboard that aggregates Jason's public Google Calendar and metadata from other sources to display:
- Current general location (Ohio or out-of-state)
- Next location change and when it occurs
- Contact and scheduling options
- Direct link to public calendar

The site is developed on Windows, synced via Git, and deployed to a Raspberry Pi 4 running the production server. All testing is manual (no automated tests) - changes are pushed via Git and tested by Jason on the live server.

## Tech Stack

- **Frontend**: React (TypeScript recommended)
- **Backend**: Node.js/Express
- **Database**: SQLite (file-based, efficient on Raspberry Pi)
- **Calendar Integration**: Google Calendar API (public calendar)
- **Deployment**: Raspberry Pi 4

## Common Development Commands

### Setup
```bash
npm install              # Install all dependencies (runs both client and server setup)
npm run setup          # Initial project setup (creates DB, generates configs)
```

### Development
```bash
npm run dev            # Start both frontend (port 3000) and backend (port 5000) in watch mode
npm run dev:client     # Start React dev server only (port 3000)
npm run dev:server     # Start Express server with nodemon only (port 5000)
```

### Production Build
```bash
npm run build          # Build React client and prepare server for production
npm start              # Start production server (runs on port 5000, serves built React app)
```

### Database
```bash
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed initial data (e.g., test events)
npm run db:reset       # Reset database (development only)
```

### Code Quality
```bash
npm run lint           # Run ESLint on client and server
npm run lint:fix       # Fix linting issues automatically
npm run type-check     # Run TypeScript type checking
```

### Local Testing Before Deployment
```bash
npm run build          # Build the project locally
npm start              # Test production build locally on http://localhost:5000
```

## Project Structure

```
wij/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page-level components (Dashboard, Settings, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client calls to backend
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/             # Static assets
│   └── package.json
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes (calendar, location, etc.)
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic (Google Calendar sync, location logic)
│   │   ├── db/             # Database schema and queries
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Server entry point
│   ├── migrations/         # Database migrations
│   └── package.json
│
├── .env.example            # Environment variables template
├── package.json            # Root package.json with scripts
└── CLAUDE.md              # This file
```

## High-Level Architecture

### Frontend (React)
- **Dashboard Component**: Main view showing current location, next location change, and time until change
- **Calendar View**: Optional display of upcoming events from the public calendar
- **Contact/Schedule**: Quick contact options and scheduling links
- **API Client**: Abstracts all calls to the backend, caches data as needed

### Backend (Express)
- **Google Calendar Service**: Syncs Jason's public calendar on a schedule (every 5-15 minutes)
  - Uses Google Calendar API with OAuth2 or public calendar key
  - Parses events for location data (expects specific event title/description format)

- **Location Logic Service**: Determines current and next location based on calendar events
  - Reads calendar events and applies location rules
  - Returns structured location data (current location, next location, change time)

- **API Routes**:
  - `GET /api/location` - Returns current location, next location, and time until change
  - `GET /api/calendar` - Returns upcoming events
  - `GET /api/config` - Returns public calendar URL and other frontend config

- **Database (SQLite)**:
  - Caches calendar events for resilience and performance
  - Stores location history (optional, for analytics)
  - Stores sync metadata (last sync time, etc.)

### Data Flow
1. Backend periodically fetches Jason's public Google Calendar
2. Events are parsed for location data and stored in SQLite
3. Location service calculates current/next location from event data
4. Frontend polls `/api/location` endpoint (every 30 seconds or on demand)
5. Dashboard updates with current location and next change info

## Google Calendar Integration

The backend needs access to Jason's **public Google Calendar**. Setup:

1. Create a Google Calendar API project at https://console.cloud.google.com
2. Enable the Google Calendar API
3. For public calendar access, use the calendar ID (found in calendar settings)
4. Store the calendar ID and any credentials in `.env`

**Expected Calendar Event Format**:
- Event title includes location: e.g., "Jason - At Home" or "Jason - At Conference in Chicago"
- Or location metadata in event description/location field
- Recurring events or multi-day events work as expected

## Environment Variables

Create a `.env` file at the root with:
```
GOOGLE_CALENDAR_ID=<public-calendar-id>
GOOGLE_API_KEY=<api-key-for-public-calendar>
NODE_ENV=development
SERVER_PORT=5000
CLIENT_PORT=3000
DATABASE_PATH=./server/data/app.db
```

For Raspberry Pi production, use `.env.production` or set environment variables in the systemd service or startup script.

## Key Development Notes

- **No Automated Tests**: Testing is manual only. After code changes, sync via Git and test on the Raspberry Pi.
- **Raspberry Pi Compatibility**: Keep dependencies lightweight. SQLite is already minimal. Avoid heavy npm packages.
- **Public Calendar**: Ensure all data displayed is from Jason's public calendar (no private events).
- **Caching**: Cache calendar data to reduce API calls. Use SQLite as a local cache.
- **Location Detection**: The core logic that determines location from events is in `server/src/services/locationService.ts` - this is the heart of the app.

## Deployment Architecture

The application uses a **Nginx reverse proxy** to handle HTTPS/SSL with Let's Encrypt certificates. This provides:
- **Nginx** (port 443): Handles all internet traffic, SSL/HTTPS, serves static files, proxies API requests
- **Express** (localhost:5000): Runs only internally, not exposed to the internet
- **Let's Encrypt**: Free SSL certificates with automatic renewal
- **Systemd**: Manages service auto-start on Raspberry Pi reboot

```
Internet → Nginx (HTTPS, port 443) → Express (localhost:5000)
                ↓
         Static Files (React build)
```

## Deployment to Raspberry Pi

### Prerequisites (One-time on Raspberry Pi)

Ensure your Raspberry Pi 4 is running Ubuntu 25 with the following installed:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v18+
npm --version
```

### Initial Deployment

1. **Clone the repository on Raspberry Pi:**
   ```bash
   sudo git clone <your-git-repo-url> /opt/whereisjason
   cd /opt/whereisjason
   ```

2. **Create environment file:**
   ```bash
   sudo cp .env.example /opt/whereisjason/.env
   sudo nano /opt/whereisjason/.env
   # Edit with your Google Calendar ID and API key
   ```

3. **Build the project:**
   ```bash
   cd /opt/whereisjason
   npm install
   npm run build
   npm run db:migrate
   ```

4. **Run the deployment script:**
   ```bash
   sudo chmod +x deploy.sh
   sudo ./deploy.sh whereisjason.net admin@whereisjason.net
   ```

   The script will:
   - Check/install Nginx and Certbot
   - Obtain Let's Encrypt SSL certificate
   - Configure Nginx as a reverse proxy
   - Create a systemd service for auto-start
   - Enable automatic certificate renewal
   - Validate all configurations
   - Report status to console

5. **Start services:**
   ```bash
   sudo systemctl start whereisjason
   sudo systemctl start nginx
   ```

6. **Verify it's working:**
   ```bash
   curl https://whereisjason.net/
   # Should return the React dashboard HTML
   ```

### Subsequent Deployments (Code Updates)

After making code changes on Windows:

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. **On Raspberry Pi, pull and deploy:**
   ```bash
   cd /opt/whereisjason
   git pull origin main
   npm install              # Install any new dependencies
   npm run build            # Build React and compile TypeScript
   sudo systemctl restart whereisjason  # Restart the app
   ```

3. **Verify the update:**
   - Visit https://whereisjason.net/ in your browser
   - Check that the new version is running

### Running the Deployment Script Again

The deployment script is designed to be idempotent. You can run it multiple times:

```bash
sudo ./deploy.sh whereisjason.net admin@whereisjason.net
```

On subsequent runs, it will:
- **Validate** Node.js, Nginx, and Certbot are installed
- **Check** SSL certificate validity and expiration date
- **Verify** Nginx configuration syntax
- **Confirm** systemd service is configured for auto-start
- **Report** the status of all services
- **Report** certificate renewal status

**Example output on second run:**
```
[...] Checking Node.js Installation
✓ Node.js installed: v18.19.0

[...] Checking Nginx Installation
✓ Nginx installed

[...] Validating SSL Certificate
✓ Certificate valid for 89 days (expires: 2025-06-27)

[...] Checking Service Status
✓ WhereisJason service is running
✓ Nginx is running

[...] Deployment Summary
Services: WhereisJason ✓ Running, Nginx ✓ Running
```

### Service Management

```bash
# Start/stop/restart the application
sudo systemctl start whereisjason
sudo systemctl stop whereisjason
sudo systemctl restart whereisjason

# Check service status
sudo systemctl status whereisjason

# View application logs
sudo journalctl -u whereisjason.service -f  # Real-time logs
sudo journalctl -u whereisjason.service --lines 100  # Last 100 lines

# Start/stop/restart Nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/whereisjason_error.log

# Test Nginx configuration
sudo nginx -t
```

### Automatic Startup on Reboot

Both Nginx and the WhereisJason service are configured to start automatically on boot:

```bash
# Check auto-start status
sudo systemctl is-enabled whereisjason.service  # Should output "enabled"
sudo systemctl is-enabled nginx                # Should output "enabled"
```

After Raspberry Pi reboot, verify services started:
```bash
sudo systemctl status whereisjason
sudo systemctl status nginx
curl https://whereisjason.net/
```

### SSL Certificate Management

Let's Encrypt certificates expire every 90 days. The deployment script sets up automatic renewal:

```bash
# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/whereisjason.net/fullchain.pem -noout -enddate

# View renewal status
sudo systemctl status certbot.timer

# View renewal logs
sudo journalctl -u certbot.service -f
```

The certificate is automatically renewed when it's within 30 days of expiration. If you ever need to manually renew:
```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### Troubleshooting Deployment

**Site not loading (https://whereisjason.net/ returns error):**
1. Check Nginx is running: `sudo systemctl status nginx`
2. Check Express app is running: `sudo systemctl status whereisjason`
3. Review Nginx error log: `sudo tail -50 /var/log/nginx/whereisjason_error.log`
4. Review app log: `sudo journalctl -u whereisjason.service --lines 50`

**SSL certificate issues:**
1. Check certificate validity: `sudo ./deploy.sh whereisjason.net admin@whereisjason.net`
2. Force renewal if expired: `sudo certbot renew --force-renewal && sudo systemctl restart nginx`

**Service fails to start:**
1. Check service logs: `sudo journalctl -u whereisjason.service -n 50`
2. Verify database exists: `ls -la /opt/whereisjason/server/data/app.db`
3. Verify .env file has correct permissions: `sudo chmod 644 /opt/whereisjason/.env`

**Nginx configuration errors:**
1. Test syntax: `sudo nginx -t`
2. Check logs: `sudo tail -50 /var/log/nginx/whereisjason_error.log`

## Useful Files to Understand First

- `deploy.sh` - Deployment and configuration validation script
- `server/src/services/locationService.ts` - Core location calculation logic
- `server/src/services/calendarService.ts` - Google Calendar API integration
- `client/src/pages/Dashboard.tsx` - Main UI component
- `server/src/db/schema.ts` - Database structure
