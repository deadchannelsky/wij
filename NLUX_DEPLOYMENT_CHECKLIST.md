# NLUX AI Chat Assistant — Deployment Checklist

## Implementation Complete ✅

All code for the NLUX AI chat assistant has been implemented. This checklist guides you through deployment and testing.

---

## Pre-Deployment: Files Modified

### Backend (Express)
- ✅ `server/src/routes/chat.ts` — **NEW** SSE streaming endpoint with tool calling
- ✅ `server/src/index.ts` — Added chat route registration (`/api/chat`)

### Frontend (React)
- ✅ `client/src/components/ChatAssistant.tsx` — **NEW** NLUX AiChat component
- ✅ `client/src/pages/Dashboard.tsx` — Added chat widget state + floating 💬 button
- ✅ `client/src/styles/chat.css` — **NEW** Chat widget styles
- ✅ `client/src/styles/index.css` — Appended chat widget CSS rules

### Configuration (Fully Customizable Without Code)
- ✅ `server/config/assistant.config.json` — **NEW** Main configuration file
  - Assistant system prompt (behavior & instructions)
  - Jason's information (context, job, company, etc.)
  - LLM endpoint, model, and API authentication
- ✅ `.env.example` — Added `LLM_ENDPOINT`, `LLM_MODEL`, `LLM_API_KEY` variables
- ✅ `.env.production.example` — **NEW** Example for production secrets

### Documentation
- ✅ `ASSISTANT_CONFIG_GUIDE.md` — Comprehensive configuration guide
- ✅ `QUICK_CONFIG_REFERENCE.md` — One-page quick reference
- ✅ `IMPLEMENTATION_COMPLETE.md` — Implementation overview
- ✅ `CONFIGURATION_CHANGES_SUMMARY.md` — Detailed change summary
- ✅ `CONFIGURATION_OVERVIEW.txt` — Visual overview
- ✅ `POST_DEPLOYMENT_SUMMARY.md` — Post-deployment configuration guide

---

## Deployment Steps

### Step 1: Push to Git
```bash
cd c:\Users\JasonTyler\Documents\PersonalCode\wij
git add -A
git commit -m "feat: Add NLUX AI chat assistant with tool calling support"
git push origin main
```

### Step 2: On Raspberry Pi (Prod)
```bash
cd /opt/whereisjason
git pull origin main
npm install  # Installs @nlux/react and @nlux/themes
npm run build
sudo systemctl restart whereisjason
```

### Step 3: Verify on SlyLinux (Ollama)

**Before testing the chat, ensure Ollama is running:**

```bash
# On SlyLinux
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# In another terminal on SlyLinux, verify the model is available:
ollama list
# Should show something like: neural-chat:latest
```

---

## Configuration: .env on Raspi5

Update `/opt/whereisjason/.env` with LLM settings:

```bash
# Existing variables (keep these)
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_API_KEY=AIzaSyD_XXX_your_api_key_here_XXX
NODE_ENV=production
SERVER_PORT=5000
DATABASE_PATH=./server/data/app.db
CALENDAR_SYNC_INTERVAL=10

# NEW: LLM Configuration
LLM_ENDPOINT=http://192.168.1.XX:11434  # Replace XX with SlyLinux IP
LLM_MODEL=neural-chat
```

**Find SlyLinux IP:**
```bash
# On SlyLinux
hostname -I
# Or from Raspi5, ping:
ping slylinux.local
```

---

## Testing Checklist

### 1. **Endpoint Connectivity**
```bash
# On Raspi5, test LLM endpoint
curl http://192.168.1.XX:11434/api/tags

# Should return JSON with available models
```

### 2. **Chat Endpoint (No LLM)**
```bash
# On Raspi5, test chat route (even without Ollama running)
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"Hi"}'

# Should return SSE stream, or error event if Ollama unreachable
```

### 3. **Frontend UI**
Visit `https://whereisjason.net/` in a browser:
- [ ] Look for floating 💬 button in bottom-right
- [ ] Click button → chat widget slides up
- [ ] Click ✕ → widget closes
- [ ] Button reappears

### 4. **Chat Functionality (With Ollama Running)**
Send these test messages:
- [ ] "What's Jason up to right now?"
  - Should reply with current location from calendar
- [ ] "When can I schedule 30 minutes next week?"
  - Should trigger `check_availability` tool and show available times
- [ ] "Why is Jason in [location name]?"
  - Should trigger `explain_location` tool and return event context

### 5. **Error Handling**
- [ ] Kill Ollama on SlyLinux, send message
  - Should get friendly error: "Cannot connect to LLM at..."
- [ ] Check server logs: `sudo journalctl -u whereisjason.service -f`
  - Should see: `[INFO] Chat request:`, `[INFO] Tool X executed successfully`

---

## Architecture

```
Browser (Client)
    ↓ GET https://whereisjason.net/
Nginx (reverse proxy, port 443)
    ↓ HTTP (internal)
Express (port 5000)
    ├─ /api/location → Location Service
    ├─ /api/calendar → Calendar Service
    ├─ /api/chat ← NEW → SSE stream with Ollama calls
    └─ /api/health
        ↓ HTTP
    SlyLinux Ollama (port 11434)
        ↓
    LLM Model (neural-chat or other)

React Dashboard
    ├─ Location display
    ├─ Calendar events
    └─ 💬 Chat widget (floating)
        ↓ fetch('/api/chat')
        ↓ SSE stream parsing
    NLUX AiChat component
```

---

## Feature Behavior

### Assistant Capabilities

1. **Schedule Queries**
   - User: "When can I meet Jason?"
   - Assistant calls `check_availability` tool
   - Returns free slots from calendar

2. **Location Context**
   - User: "Why is Jason in NYC?"
   - Assistant calls `explain_location` tool
   - Returns event title, time, and description

3. **Status Checks**
   - User: "What's Jason up to?"
   - Assistant injects live calendar context
   - Replies with current + next location

### Tool Definitions

Three tools are available to the LLM (defined in `server/src/routes/chat.ts`):

| Tool | Purpose | Returns |
|------|---------|---------|
| `check_availability` | Find free slots in date range | Available times or busy schedule |
| `schedule_meeting` | Create a meeting confirmation | Confirmation string (Phase 1: no calendar write) |
| `explain_location` | Get context for why Jason is at a location | Event details + description |

---

## Known Limitations (Phase 1)

1. **No Calendar Write**: `schedule_meeting` logs confirmation but doesn't write to Google Calendar
   - Future enhancement: integrate with Google Calendar API
   - Currently: Jason receives confirmation in logs, adds meeting manually

2. **No Conversation History**: Each message is stateless
   - Future enhancement: store conversation history in SQLite
   - Currently: context injected fresh per request

3. **No Authentication**: Chat is public (no user login required)
   - Future enhancement: optional JWT/basic auth
   - Currently: anyone can access the chat

4. **LLM Tool Calling**: Depends on Ollama model's tool-calling capabilities
   - Some models may not support structured tool calls
   - Fallback: model still generates text responses without tools

---

## Troubleshooting

### "Cannot connect to LLM" error
- **Cause**: Ollama not running or IP/port wrong
- **Fix**:
  1. Verify `LLM_ENDPOINT` in `.env` matches SlyLinux IP
  2. Check Ollama is running: `ps aux | grep ollama` on SlyLinux
  3. Test: `curl http://<slylinux-ip>:11434/api/tags`

### Chat messages not appearing
- **Cause**: SSE parsing issue or fetch error
- **Fix**:
  1. Check browser console for errors (F12 → Console)
  2. Check server logs: `sudo journalctl -u whereisjason.service -f`
  3. Try manual endpoint test: `curl -X POST http://localhost:5000/api/chat ...`

### Tool calls not executing
- **Cause**: Tool name mismatch or schema validation
- **Fix**:
  1. Check server logs for `[ERROR] Tool X failed:` messages
  2. Verify Ollama model supports tool calling (check model docs)
  3. Try with a simpler question (no tool required) first

### Chat widget doesn't open
- **Cause**: React component error or styling issue
- **Fix**:
  1. Open browser console (F12 → Console)
  2. Check for JavaScript errors
  3. Verify `client/src/components/ChatAssistant.tsx` is imported correctly
  4. Verify CSS is loaded: check `client/src/styles/chat.css` and `index.css`

---

## Performance Notes

- **LLM Response Time**: Depends on model size and RTX 5080 performance
  - Neural-Chat 7B: ~1-3 seconds per response
  - Larger models (13B+): 5-10+ seconds
  - Consider quantized models for faster inference

- **SSE Streaming**: Reduces perceived lag
  - Text streams as it's generated
  - User sees responses incrementally

- **Calendar Context**: Injected fresh per request
  - ~5-10ms to fetch from SQLite cache
  - No performance impact

---

## Next Steps (Phase 2+)

- [ ] Write Google Calendar API integration for `schedule_meeting`
- [ ] Add conversation history persistence to SQLite
- [ ] Implement optional user authentication
- [ ] Add email notifications for scheduling requests
- [ ] Add timezone awareness for international travel
- [ ] Track chat analytics (questions, success rates)

---

## Support

**Questions or issues?**

1. Check logs: `sudo journalctl -u whereisjason.service -f`
2. Check Ollama status: `curl http://<slylinux-ip>:11434/api/tags`
3. Verify `.env` variables are set correctly
4. Test each endpoint individually before debugging UI

---

**Last Updated**: 2026-03-30
**Implementation Status**: Complete & Ready for Testing
