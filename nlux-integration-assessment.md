# NLUX Integration Assessment: Jason's Assistant
## WhereisJason.net Chatbot Architecture

**Date**: March 30, 2026  
**Status**: Ready for Implementation ✅

---

## Executive Summary

**NLUX is a perfect fit for your architecture.** Your codebase is clean, well-structured, and already has the exact infrastructure NLUX expects. This is a **2-3 day weekend project**, not an experiment.

### Why NLUX Works Here
- ✅ You already have a TypeScript/Express backend
- ✅ Calendar data is cached in SQLite (structured, not free-text RAG)
- ✅ Location parsing is deterministic (event parsing logic exists)
- ✅ React client is modern and component-organized
- ✅ Two tools (scheduling + context lookup) are manageable without complex agents

---

## Current Architecture Analysis

### Backend (Express.js + SQLite)
```
Express Server (port 5000)
├─ /api/location → Current/next location from calendar
├─ /api/calendar → Raw calendar events (Google Calendar → SQLite)
├─ /api/config → Configuration endpoint
└─ /api/health → Health check
```

**Key Services:**
- `calendarService.ts` — Syncs Google Calendar → SQLite every 10 min
- `locationService.ts` — Parses location from event title/description
- Database: SQLite with `calendar_events`, `location_history`, `sync_metadata` tables

**Current API Response (Location):**
```json
{
  "current": "NYC Office",
  "currentEvent": "Product Meeting",
  "currentStartTime": "2026-03-30T14:00:00Z",
  "currentEndTime": "2026-03-30T15:30:00Z",
  "next": "Ashburn, VA",
  "nextEvent": "RTX 5080 Lab Session",
  "nextStartTime": "2026-03-31T10:00:00Z",
  "timeUntilChange": "18h 30m",
  "lastUpdated": "2026-03-30T13:55:00Z"
}
```

### Frontend (React + TypeScript)
- Modern hooks-based components (`Dashboard.tsx`)
- Polling-based updates (30s location, 60s sync status)
- Clean API client with caching

---

## What NLUX Adds

### 1. Chat UI Component
```typescript
import { AiChat, useAsStreamAdapter } from '@nlux/react';
import '@nlux/themes/nova.css';

<AiChat 
  adapter={useJasonsAssistantAdapter(conversationHistory)}
  personaOptions={{
    assistant: {
      name: 'Jason\'s Assistant',
      avatar: '🤖',
      tagline: 'Your scheduling and location expert'
    },
    user: { name: 'You', avatar: '👤' }
  }}
  conversationOptions={{ layout: 'bubbles' }}
/>
```

### 2. Streaming Support
- LLM responses stream in real-time from Ollama on SlyLinux (RTX 5080)
- Or fallback to NanoGPT API (with latency caveat)
- Perceived lag is eliminated

### 3. Tool Integration Layer
NLUX receives tool-call responses from your LLM:
```json
{
  "type": "text",
  "content": "I can help you schedule time with Jason. Looking at his calendar..."
}
{
  "type": "tool_call",
  "name": "check_availability",
  "arguments": { "date": "2026-04-05", "duration_minutes": 30 }
}
```

---

## Implementation Roadmap

### Phase 1: Create Chat Backend Endpoint (4-6 hours)

**New File**: `server/src/routes/chat.ts`

```typescript
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getLocationStatus, getLocationHistory } from '../services/locationService';
import { getCachedCalendarEvents } from '../services/calendarService';

const router = Router();

// System message with context
const SYSTEM_PROMPT = `You are Jason's Assistant, a helpful scheduling and location expert.

You have access to:
1. Jason's calendar (current location, upcoming events)
2. A tool to check his availability
3. A tool to schedule time with him
4. Jason's job context (why he's in certain locations)

Job Context:
- Jason is a Technical Architect & AI Enablement lead at a Fortune 50 FSI company
- He works on AI proof-of-concept demonstrations and competitive positioning
- Current locations are tied to client meetings, internal projects, and infrastructure work
- His RTX 5080 machine (SlyLinux) is for AI inference and experimentation

When users ask:
1. "Can I book time with Jason?" → Use the schedule_availability tool first
2. "Why is Jason in [location]?" → Fetch the event description and explain context
3. "When can I meet Jason?" → Check availability for next 7 days
4. "What's Jason up to?" → Fetch current location and upcoming events

Always:
- Be friendly but professional
- Explain why he's in a location based on the event title/description
- Offer to schedule only available times
- Clarify meeting topic and duration before scheduling`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCall {
  type: 'tool_call';
  name: 'check_availability' | 'schedule_time' | 'explain_location';
  arguments: Record<string, any>;
}

// POST /api/chat
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, userMessage } = req.body;

    // Get current context
    const locationStatus = await getLocationStatus();
    const upcomingEvents = locationStatus.upcomingEvents || [];
    
    // Build context injection
    const contextMessage = `Current Status:
- Jason is currently at: ${locationStatus.current?.location || 'Not scheduled'}
- Next location: ${locationStatus.next?.location || 'No future events'}
- Upcoming events (next 7 days):
${upcomingEvents.slice(0, 7).map(e => `  • ${e.title} (${e.location || 'TBD'}) - ${e.startTime}`).join('\n')}`;

    // Build conversation with context
    const conversationHistory: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
      ...messages,
      { role: 'user', content: userMessage }
    ];

    // Call LLM (Ollama on SlyLinux)
    const ollamaResponse = await axios.post(
      'http://localhost:11434/api/chat', // Ollama default port
      {
        model: process.env.LLM_MODEL || 'neural-chat', // Adjust to your model
        messages: conversationHistory,
        stream: true, // Enable streaming
        tools: [
          {
            name: 'check_availability',
            description: 'Check Jason\'s availability for scheduling',
            parameters: {
              type: 'object',
              properties: {
                start_date: { type: 'string', description: 'Start date (ISO format)' },
                end_date: { type: 'string', description: 'End date (ISO format)' },
                duration_minutes: { type: 'number', description: 'Meeting duration in minutes' }
              }
            }
          },
          {
            name: 'schedule_time',
            description: 'Schedule a meeting with Jason',
            parameters: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Meeting date (ISO format)' },
                start_time: { type: 'string', description: 'Start time (ISO format)' },
                duration_minutes: { type: 'number' },
                topic: { type: 'string', description: 'Meeting topic' },
                attendee_email: { type: 'string' }
              }
            }
          },
          {
            name: 'explain_location',
            description: 'Get context for why Jason is at a location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
                date: { type: 'string', description: 'Date of the location (ISO format)' }
              }
            }
          }
        ]
      },
      {
        timeout: 30000,
        responseType: 'stream'
      }
    );

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream response back
    ollamaResponse.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            // Send streamed message back to client
            res.write(`data: ${JSON.stringify(json)}\n\n`);
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    });

    ollamaResponse.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    ollamaResponse.data.on('error', (error: any) => {
      console.error('[ERROR] LLM streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('[ERROR] Chat endpoint failed:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

**Add to `server/src/index.ts`:**
```typescript
import chatRouter from './routes/chat';
// ... in app setup
app.use('/api/chat', chatRouter);
```

---

### Phase 2: Create React Chat Component (3-4 hours)

**New File**: `client/src/components/ChatAssistant.tsx`

```typescript
import React, { useState } from 'react';
import { AiChat, useAsStreamAdapter } from '@nlux/react';
import '@nlux/themes/nova.css';

export default function ChatAssistant() {
  const chatAdapter = useAsStreamAdapter(
    async (message: string) => {
      // Placeholder for implementation
      // See next section for full code
    },
    []
  );

  return (
    <div style={{ height: '600px', maxWidth: '800px' }}>
      <AiChat
        adapter={chatAdapter}
        personaOptions={{
          assistant: {
            name: 'Jason\'s Assistant',
            avatar: '🤖',
            tagline: 'Your scheduling and location expert'
          },
          user: { name: 'You', avatar: '👤' }
        }}
        conversationOptions={{ layout: 'bubbles' }}
        displayOptions={{ colorScheme: 'light' }}
      />
    </div>
  );
}
```

**Add to `client/package.json`:**
```json
{
  "dependencies": {
    "@nlux/react": "latest",
    "@nlux/themes": "latest"
  }
}
```

---

### Phase 3: Tool Handler Logic (2-3 hours)

**New File**: `server/src/tools/assistantTools.ts`

```typescript
import { getAllRows } from '../db/db';
import { getLocationStatus } from '../services/locationService';

export async function checkAvailability(params: {
  start_date: string;
  end_date: string;
  duration_minutes: number;
}): Promise<string> {
  // Query calendar for free slots
  const events = await getAllRows(
    `SELECT start_time, end_time FROM calendar_events 
     WHERE start_time >= ? AND end_time <= ?
     ORDER BY start_time ASC`,
    [params.start_date, params.end_date]
  );

  // Find gaps (simplified)
  const available = findFreeSlots(events, params.duration_minutes);
  
  if (available.length === 0) {
    return 'Jason is fully booked during this period. Would you like to check a different date?';
  }

  return `Available times:\n${available.map(slot => 
    `• ${slot.start} - ${slot.end}`
  ).join('\n')}`;
}

export async function scheduleTime(params: {
  date: string;
  start_time: string;
  duration_minutes: number;
  topic: string;
  attendee_email?: string;
}): Promise<string> {
  // This would integrate with your calendar booking system
  // For now, return a confirmation message
  
  return `Meeting scheduled! Jason will receive a calendar invitation for:
- Topic: ${params.topic}
- Date: ${new Date(params.date).toDateString()}
- Duration: ${params.duration_minutes} minutes
- Attendee: ${params.attendee_email || 'Contact info pending'}

Jason will confirm within 24 hours.`;
}

export async function explainLocation(params: {
  location: string;
  date: string;
}): Promise<string> {
  const status = await getLocationStatus();
  
  // Find event for that date/location
  const event = status.upcomingEvents?.find(e => 
    e.location === params.location && 
    e.startTime.startsWith(params.date)
  );

  if (!event) {
    return `No scheduled event found for ${params.location} on ${params.date}.`;
  }

  // Use event description as context
  return `Jason is in ${params.location} for:
**${event.title}**
${event.description || '(No additional details)'}
Time: ${new Date(event.startTime).toLocaleString()} - ${new Date(event.endTime).toLocaleString()}`;
}

function findFreeSlots(events: any[], durationMinutes: number): any[] {
  // Simplified free-slot finder
  // TODO: Implement proper algorithm
  return [];
}
```

---

### Phase 4: Integrate Chat into Dashboard (1-2 hours)

**Modify** `client/src/pages/Dashboard.tsx`:

```typescript
import ChatAssistant from '../components/ChatAssistant';

export default function Dashboard() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="dashboard">
      {showChat && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '400px', zIndex: 1000 }}>
          <button 
            onClick={() => setShowChat(false)}
            style={{ float: 'right', marginBottom: '10px' }}
          >
            ✕
          </button>
          <ChatAssistant />
        </div>
      )}
      
      {!showChat && (
        <button 
          onClick={() => setShowChat(true)}
          className="btn btn-primary"
          style={{ position: 'fixed', bottom: '20px', right: '20px' }}
        >
          💬 Ask Jason's Assistant
        </button>
      )}

      {/* Existing dashboard content */}
    </div>
  );
}
```

---

## LLM Endpoint Configuration

### Option 1: Ollama on SlyLinux (Preferred ✅)
```bash
# On SlyLinux (RTX 5080)
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# In .env on Raspi5
LLM_ENDPOINT=http://slylinux.local:11434
LLM_MODEL=neural-chat  # or mistral, llama2, etc.
```

**Pros:**
- Local control, no API latency concerns
- RTX 5080 is overkill for inference (fast responses)
- No rate limits or cost
- Full tool-calling support

**Cons:**
- Requires network between Raspi5 and SlyLinux
- Ollama model management

### Option 2: NanoGPT API (Fallback ⚠️)
```bash
LLM_ENDPOINT=https://api.nanogpt.com
LLM_API_KEY=your-key-here
LLM_MODEL=nano-gpt-4
```

**Concerns:**
- Latency over HTTPS
- Streaming still works, but slower
- Cost per request

**Recommendation:** Use Ollama for primary, NanoGPT as fallback only.

---

## Architecture Diagram

```
┌──────────────────────────────────────────┐
│         WhereisJason.net                 │
│         (Raspi5 / Express)               │
├──────────────────────────────────────────┤
│                                          │
│  React Dashboard                         │
│  ├─ Location Display                     │
│  ├─ Upcoming Events                      │
│  └─ 💬 Chat Button → ChatAssistant       │
│                                          │
│  API Routes                              │
│  ├─ /api/location → LocationService      │
│  ├─ /api/calendar → CalendarService      │
│  └─ /api/chat ✨ NEW ✨                  │
│      └─ POST {messages, userMessage}     │
│         └─ Stream SSE response           │
│                                          │
│  Database (SQLite)                       │
│  ├─ calendar_events                      │
│  ├─ location_history                     │
│  └─ sync_metadata                        │
└──────────────────────────────────────────┘
          ↓ HTTP/Stream
┌──────────────────────────────────────────┐
│       SlyLinux (RTX 5080)                │
│       Ollama Inference Server            │
├──────────────────────────────────────────┤
│                                          │
│  LLM Model (e.g., Neural-Chat, Mistral) │
│  + Tool Calling Support                  │
│  + Streaming Response                    │
└──────────────────────────────────────────┘
```

---

## Testing Checklist

### Unit Tests
- [ ] `checkAvailability` returns free slots
- [ ] `scheduleTime` creates valid calendar entry
- [ ] `explainLocation` fetches correct event context

### Integration Tests
- [ ] Ollama endpoint is reachable from Raspi5
- [ ] Chat endpoint returns SSE stream
- [ ] NLUX component renders and receives messages

### User Acceptance Tests
- [ ] User can ask "What's Jason up to?"
- [ ] User can request "Schedule 30 min next week"
- [ ] Tool calls are properly formatted and executed
- [ ] Responses ground in actual calendar data

---

## Potential Pitfalls & Mitigations

### 1. **Tool Calling Reliability**
**Issue**: LLM may hallucinate tool calls or get format wrong.

**Mitigation:**
- Use few-shot examples in system prompt
- Validate tool calls before execution
- Fallback to text response if tool fails

```typescript
if (toolCall.name === 'schedule_time') {
  if (!toolCall.arguments.date || !toolCall.arguments.topic) {
    return 'Missing required fields for scheduling';
  }
  // Safe to proceed
}
```

### 2. **Calendar Sync Race Conditions**
**Issue**: Chat queries stale calendar data while sync is running.

**Mitigation:**
- Add `sync_status` check in `/api/chat`
- Return "Syncing, please try again in 10 seconds" if currently syncing

```typescript
const syncMeta = await getSyncMetadata();
if (syncMeta.sync_status === 'syncing') {
  return 'Calendar is currently syncing. Please ask again in 10 seconds.';
}
```

### 3. **Ollama Model Size / Quantization**
**Issue**: Large model (e.g., 70B) is too slow on RTX 5080.

**Mitigation:**
- Start with quantized model: `neural-chat:7b-v3.1-q5_K_M`
- Benchmark inference latency
- Switch to faster model if needed (mistral, qwen-coder)

### 4. **Streaming Timeout**
**Issue**: Long-running tool executions cause SSE timeout.

**Mitigation:**
- Set `timeout: 60000` on Ollama requests
- Send heartbeat messages every 10s

```typescript
const heartbeat = setInterval(() => {
  res.write(': heartbeat\n\n');
}, 10000);

ollamaResponse.data.on('end', () => {
  clearInterval(heartbeat);
  res.write('data: [DONE]\n\n');
  res.end();
});
```

---

## Success Criteria

✅ **This is a success when:**
1. User asks "Can I book 30 min with Jason next Tuesday?"
2. System fetches calendar, finds free slots
3. LLM suggests "Jason has 2-3pm and 4-5pm available"
4. User confirms, system creates calendar event
5. Response confirms: "Meeting scheduled for Tuesday 2-3pm"

---

## Post-Launch Enhancements

### Phase 5: Advanced Features (Optional)
- [ ] Notification to Jason of scheduling requests
- [ ] Email confirmation to attendee
- [ ] Timezone handling (Jason travels)
- [ ] Meeting link generation (Zoom/Google Meet)
- [ ] NLU for complex questions ("Isn't Jason usually in NYC in April?")
- [ ] Conversation history persistence
- [ ] Multi-turn context awareness

### Phase 6: Analytics
- [ ] Track chat queries (anonymized)
- [ ] Measure scheduling success rate
- [ ] Identify common questions → FAQ
- [ ] LLM accuracy metrics

---

## Dependencies to Add

```bash
# server/package.json
npm install axios@1.6+ # Already present, ensure latest

# client/package.json
npm install @nlux/react @nlux/themes
npm install -D @types/nlux__react

# .env variables
LLM_ENDPOINT=http://slylinux.local:11434
LLM_MODEL=neural-chat
CALENDAR_SYNC_INTERVAL=10  # Minutes (existing)
GOOGLE_CALENDAR_ID=xxx  # Existing
GOOGLE_API_KEY=xxx  # Existing
```

---

## Deployment Notes

### Raspi5 (Express server)
```bash
cd wij
npm install
npm run build
npm run start

# Verify
curl http://localhost:5000/api/health
```

### SlyLinux (Ollama)
```bash
# If not already running
OLLAMA_HOST=0.0.0.0:11434 ollama serve &

# Test endpoint
curl http://localhost:11434/api/tags
```

### Network
- Raspi5 must reach SlyLinux on port 11434
- Ensure firewall allows traffic on both ends

---

## Wildness Assessment: Final Verdict

### Scale: 1-10 (1 = trivial, 10 = bleeding-edge research)
**You're at a 5/10, and most of that is infrastructure, not the idea.**

- **Idea wildness**: 3/10 — Scheduling chatbot is very common
- **Implementation complexity**: 4/10 — Tool calling is the only tricky bit
- **Infrastructure complexity**: 6/10 — Networking Raspi5 ↔ SlyLinux + LLM streaming
- **Risk level**: 2/10 — All parts are standard, proven technology

### Why It Works
1. **Grounded by data**: Calendar is the source of truth, not hallucination
2. **Limited scope**: 2 main tools, well-defined flows
3. **Your infrastructure is ready**: SQLite, Express, React all in place
4. **NLUX is not overkill**: Simple enough for this use case, powerful enough to scale

### Timeline
- **Conservative**: 3 days (with thorough testing)
- **Aggressive**: 1 weekend (Saturday setup, Sunday testing)
- **Realistic**: 2 days (if no network issues between Raspi5/SlyLinux)

---

## Next Steps

1. **Review this assessment** — Does the architecture match your vision?
2. **Confirm LLM endpoint** — Is Ollama on SlyLinux the plan, or NanoGPT?
3. **Start Phase 1** — Chat endpoint in Express
4. **Iterate** — Get tool calling working before polishing UI
5. **Deploy** — Push to Raspi5, test end-to-end

---

## Questions?

Open questions for you:
1. **Scheduling backend**: Do you have a Calendly integration, or write directly to Google Calendar?
2. **Job description guardrail**: Where is the "why Jason is in X location" context stored? (Event description, separate doc, environment variable?)
3. **User authentication**: Should the chat be public, or authenticated (JWT, basic auth)?
4. **Privacy**: Log chat conversations?
5. **Model preference**: Any preference for local LLM (Mistral, Neural-Chat, Llama, Qwen)?

---

**Status**: ✅ **Ready to code**  
**Confidence**: 95% (minor network/streaming edge cases possible)  
**Go-live target**: Early April 2026
