# WhereisJason.net - Build Complete ✅

The entire website has been built and is ready for deployment! Here's what was created.

## What Was Built

### Backend Services (Node.js/Express/TypeScript)

**1. Google Calendar API Integration** (`server/src/services/calendarService.ts`)
- Fetches events from public Google Calendar using API key
- Converts Google Calendar format to internal format
- Caches events locally in SQLite database
- Validates calendar is publicly shared
- Error handling for API failures and configuration issues
- Syncs every 10 minutes (configurable)

**2. Location Detection Service** (`server/src/services/locationService.ts`)
- Parses event titles/descriptions to extract location data
- Supports formats: "Jason - At X", "In X", "At Home, Ohio"
- Finds current location from active events
- Determines next location from upcoming events
- Calculates time until next location change
- Maintains location history for analytics
- Handles edge cases (no events, multiple events, etc.)

**3. Database Layer** (`server/src/db/`)
- SQLite database with optimized schema
- Tables: calendar_events, location_history, sync_metadata
- Automatic cleanup of old events
- Indexed queries for performance
- Proper foreign key constraints
- Transaction support for data integrity

**4. API Routes** (`server/src/routes/`)
- **Location Endpoint** (`GET /api/location`)
  - Returns: current location, next location, time until change
  - Includes event details and timestamps
  - Real-time calculation

- **Calendar Endpoint** (`GET /api/calendar/events`)
  - Returns: cached calendar events with pagination
  - Optional limit parameter (default 50)

- **Sync Status Endpoint** (`GET /api/calendar/sync-status`)
  - Returns: sync status, last sync time, error messages
  - Useful for debugging and monitoring

- **Config Endpoint** (`GET /api/config`)
  - Returns: public configuration (environment, calendar ID)
  - Safe for frontend consumption

- **Manual Sync Endpoint** (`POST /api/calendar/sync`)
  - Allows on-demand calendar synchronization
  - Useful for testing and immediate updates

**5. Scheduled Calendar Sync** (`server/src/scheduler/calendarSync.ts`)
- Automatic calendar sync every N minutes (configurable)
- Runs immediately on server startup
- Updates sync metadata with status
- Error handling and retry logic
- Graceful shutdown

**6. Express Server** (`server/src/index.ts`)
- Production-ready configuration
- Database initialization on startup
- Calendar sync scheduler startup
- Proper error handling and logging
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Graceful shutdown on SIGTERM/SIGINT
- Environment variable validation

### Frontend (React/TypeScript)

**1. API Client** (`client/src/api/client.ts`)
- Abstraction layer for all backend API calls
- Request caching (30-second default)
- Error handling and type safety
- Methods for all endpoints:
  - getLocationStatus()
  - getLocationHistory()
  - getCalendarEvents()
  - getSyncStatus()
  - syncCalendar()
  - getHealth()

**2. Dashboard Component** (`client/src/pages/Dashboard.tsx`)
- **Current Location Section**
  - Displays current location with visual highlighting
  - Shows event title and end time
  - Updates every 30 seconds

- **Next Location Section**
  - Shows upcoming location
  - Displays when it starts (absolute and relative time)
  - Shows countdown timer
  - Gracefully handles "no future events"

- **Quick Actions**
  - Link to full Google Calendar
  - Manual sync button

- **Sync Status Panel**
  - Shows calendar sync health
  - Last sync time
  - Error messages if any

- **Features**
  - Real-time polling (30-second interval)
  - Error handling with user-friendly messages
  - Loading states with spinner
  - Date/time formatting for readability
  - Relative time calculations (e.g., "in 2 days 4h")

**3. Styling** (`client/src/styles/index.css`)
- Modern, clean design with gradients
- Responsive layout (works on mobile, tablet, desktop)
- Color scheme with semantic meanings:
  - Red/Pink for current location
  - Blue/Cyan for next location
  - Green for success states
  - Red for error states
- Accessibility-focused typography
- Smooth animations and transitions
- Mobile-first responsive design
- Print styles for reports

**4. Main App** (`client/src/App.tsx`)
- Header with branding
- Main dashboard component
- Footer with branding
- CSS imports for styling

### Database Schema

```sql
-- Calendar events from Google Calendar
calendar_events (
  id: string (primary key)
  title: string
  description: string
  location: string
  start_time: ISO 8601 timestamp
  end_time: ISO 8601 timestamp
  google_event_id: string
  indexes on: start_time, end_time
)

-- Location history for analytics
location_history (
  id: auto-increment
  location: string
  start_time: timestamp
  end_time: timestamp
  created_at: timestamp
  foreign key → calendar_events
)

-- Sync metadata
sync_metadata (
  id: 1 (singleton)
  last_sync_time: timestamp
  next_sync_time: timestamp
  sync_status: 'idle' | 'syncing' | 'error'
  error_message: string
)
```

## File Structure

```
server/
├── src/
│   ├── index.ts                          # Express server entry point
│   ├── types/index.ts                    # TypeScript type definitions
│   ├── db/
│   │   ├── db.ts                        # Database connection & queries
│   │   ├── schema.ts                    # Schema initialization
│   │   ├── migrate.ts                   # Migration script
│   │   └── seed.ts                      # Sample data seeding
│   ├── services/
│   │   ├── calendarService.ts           # Google Calendar integration
│   │   └── locationService.ts           # Location extraction & detection
│   ├── scheduler/
│   │   └── calendarSync.ts              # Periodic sync scheduler
│   └── routes/
│       ├── location.ts                  # Location API endpoints
│       ├── calendar.ts                  # Calendar API endpoints
│       └── config.ts                    # Config API endpoint

client/
├── src/
│   ├── App.tsx                          # Main app component
│   ├── index.tsx                        # React entry point
│   ├── api/
│   │   └── client.ts                    # API client
│   ├── pages/
│   │   └── Dashboard.tsx                # Dashboard component
│   ├── styles/
│   │   └── index.css                    # Global styles
│   └── public/
│       └── index.html                   # HTML template
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This installs:
- Server: express, sqlite3, axios, dotenv, node-schedule, TypeScript
- Client: react, react-dom, axios

### 2. Configure Google Calendar

1. **Get your calendar ID:**
   - Go to https://calendar.google.com/calendar/u/0/r/settings
   - Select your calendar
   - Scroll to "Integrate calendar"
   - Copy the Calendar ID (looks like: `xxxxx@group.calendar.google.com`)

2. **Create API key:**
   - Go to https://console.cloud.google.com/
   - Create a new project
   - Enable "Google Calendar API"
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

3. **Share calendar publicly:**
   - In Google Calendar, go to Settings
   - Click on your calendar
   - Under "Share with others," click "Make available to the public"

4. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

5. **Edit .env:**
   ```
   GOOGLE_CALENDAR_ID=your-id@group.calendar.google.com
   GOOGLE_API_KEY=AIzaSyD_your_key_here
   NODE_ENV=development
   SERVER_PORT=5000
   CLIENT_PORT=3000
   DATABASE_PATH=./server/data/app.db
   CALENDAR_SYNC_INTERVAL=10
   ```

### 3. Initialize Database

```bash
npm run db:migrate    # Creates database schema
npm run db:seed       # (Optional) Adds sample events for testing
```

### 4. Run Locally

```bash
npm run dev
```

This starts:
- Frontend dev server: http://localhost:3000
- Backend API server: http://localhost:5000

The page will auto-reload as you make changes.

### 5. Build for Production

```bash
npm run build
```

This:
- Builds React app to `client/build/`
- Compiles TypeScript to `server/dist/`

### 6. Deploy to Raspberry Pi

See **DEPLOYMENT.md** for complete deployment instructions.

## Calendar Event Format

The app parses location from your Google Calendar events. Supported formats:

```
Event Title Examples:
- "Jason - At Home, Ohio"
- "Jason - In Chicago"
- "Jason - At Conference"
- "Meeting in San Francisco"

Event Location Field:
- "Ohio"
- "New York, NY"
- "Remote"
```

The parser looks for patterns like "At X", "In X", or uses the Location field if available.

## API Endpoints

### Location API
```
GET /api/location
GET /api/location/current
GET /api/location/next
GET /api/location/history?days=30
```

### Calendar API
```
GET /api/calendar/events?limit=50
GET /api/calendar/sync-status
POST /api/calendar/sync
```

### Config API
```
GET /api/config
GET /api/health
```

All endpoints return JSON responses. See code for full response schemas.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| GOOGLE_CALENDAR_ID | Yes | - | Your Google Calendar ID |
| GOOGLE_API_KEY | Yes | - | Google Calendar API key |
| NODE_ENV | No | development | Environment (development/production) |
| SERVER_PORT | No | 5000 | Backend port |
| CLIENT_PORT | No | 3000 | Frontend port (dev only) |
| DATABASE_PATH | No | ./server/data/app.db | SQLite database path |
| CALENDAR_SYNC_INTERVAL | No | 10 | Sync interval in minutes |

## Key Features Implemented

✅ **Google Calendar Integration**
- Fetches events from public calendar
- Automatic periodic sync (every 10 minutes)
- Error handling and logging

✅ **Location Detection**
- Parses event titles for location data
- Handles multiple location formats
- Real-time current/next location calculation

✅ **Real-time Dashboard**
- Current location display
- Next location with countdown
- Sync status monitoring
- Manual sync trigger
- Auto-refresh every 30 seconds

✅ **Production Ready**
- Database with migrations
- Error handling and logging
- Security headers
- Graceful shutdown
- TypeScript type safety

✅ **Responsive Design**
- Works on mobile, tablet, desktop
- Gradient UI with location colors
- Modern CSS with animations
- Touch-friendly buttons

✅ **Scheduled Sync**
- Automatic background calendar sync
- Configurable interval
- Status tracking
- Error recovery

## Testing

### Manual Testing Steps

1. **Test with sample data:**
   ```bash
   npm run db:seed
   npm run dev
   ```
   Visit http://localhost:3000

2. **Test with real Google Calendar:**
   - Add events to your Google Calendar
   - Edit .env with your calendar ID and API key
   - Refresh the page
   - Click "Sync Calendar Now"
   - Verify events appear

3. **Test location parsing:**
   - Create event: "Jason - At Home, Ohio"
   - Sync and verify it shows "At Home, Ohio"

4. **Test timing:**
   - Create event for tomorrow
   - Verify "Next Location" shows correct time
   - Verify countdown timer updates

5. **Test error handling:**
   - Delete .env temporarily
   - Verify error messages display correctly
   - Restore .env and verify recovery

## Deployment

Follow the complete deployment guide in **DEPLOYMENT.md**:

```bash
# On Raspberry Pi
sudo ./deploy.sh whereisjason.net admin@whereisjason.net

# Then:
npm run build
sudo systemctl restart whereisjason
```

The site will be available at: https://whereisjason.net/

## Monitoring

### Check Application Logs
```bash
sudo journalctl -u whereisjason.service -f
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/whereisjason_error.log
```

### Check Database
```bash
sqlite3 /opt/whereisjason/server/data/app.db
> SELECT * FROM calendar_events;
```

### Manual Sync
```bash
curl -X POST https://whereisjason.net/api/calendar/sync
```

## Troubleshooting

### "No calendar events showing"
1. Verify calendar ID in .env
2. Verify calendar is publicly shared in Google Calendar
3. Check API key is valid
4. Check sync status: `GET /api/calendar/sync-status`
5. Manually sync: `POST /api/calendar/sync`

### "Calendar sync fails with 403 error"
1. Verify calendar is publicly shared
2. Regenerate API key in Google Cloud Console
3. Ensure API key has Calendar API enabled

### "Location not parsing correctly"
1. Check event title format
2. Verify location is in title like "Jason - At X"
3. Or add location in "Location" field
4. Check logs for parsing errors

### "Dashboard won't load"
1. Check backend is running: `systemctl status whereisjason`
2. Check frontend built correctly: `npm run build`
3. Check Nginx config: `sudo nginx -t`
4. Check Nginx is running: `systemctl status nginx`

## Next Steps

1. ✅ Push to your Git repository
2. ✅ Deploy to Raspberry Pi (see DEPLOYMENT.md)
3. ✅ Configure your Google Calendar with location data
4. ✅ Test on your Raspberry Pi server
5. ✅ Access at https://yourdomain.net

## Performance Notes

- **Calendar API:** Calls happen every 10 minutes in background
- **Frontend refresh:** Every 30 seconds for location updates
- **Database queries:** Indexed by date for fast lookups
- **Caching:** Frontend caches API responses for 30 seconds
- **Raspberry Pi:** Should handle 1000+ events without issues

## Architecture Summary

```
┌─────────────────────────────────────┐
│         User's Browser              │
│   (React Dashboard at port 443)     │
└────────────────┬────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────┐
│    Nginx Reverse Proxy (port 443)   │
│  - Handles SSL/TLS                  │
│  - Serves static React files        │
│  - Proxies /api to Express          │
└────────────────┬────────────────────┘
                 │ localhost:5000
┌────────────────▼────────────────────┐
│   Express API Server                │
│  - Location endpoints               │
│  - Calendar endpoints               │
│  - Config endpoints                 │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      SQLite Database                │
│  - calendar_events                  │
│  - location_history                 │
│  - sync_metadata                    │
└─────────────────────────────────────┘
         ↑
         │ Fetches every 10 minutes
┌────────────────────────────────────┐
│   Google Calendar API               │
│   (Public calendar only)            │
└────────────────────────────────────┘
```

## Summary

The entire WhereisJason.net website is now complete and ready for production deployment. It includes:

- Full backend with Google Calendar integration
- Real-time location detection
- Beautiful responsive frontend dashboard
- Automatic periodic synchronization
- Production-ready security and error handling
- Complete deployment automation
- Comprehensive documentation

Follow the DEPLOYMENT.md guide to get it running on your Raspberry Pi!
