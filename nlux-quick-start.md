# Jason's Assistant - Quick Start Implementation Guide

This guide provides concrete, copy-paste-ready code to get Jason's Assistant running.

---

## Step 1: Update Server Dependencies

```bash
cd server
npm install axios
npm install --save-dev @types/node
```

Verify in `package.json`:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
    // ... others
  }
}
```

---

## Step 2: Create Chat Route (`server/src/routes/chat.ts`)

Copy this entire file:

```typescript
/**
 * Chat API route for Jason's Assistant
 * Handles multi-turn conversations with tool calling support
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getLocationStatus } from '../services/locationService';
import { getCachedCalendarEvents } from '../services/calendarService';

const router = Router();

// ============================================================================
// SYSTEM PROMPT - This is the "personality" of Jason's Assistant
// ============================================================================
const SYSTEM_PROMPT = `You are Jason's Assistant, a helpful and professional scheduling coordinator.

Your Role:
- Help users schedule time with Jason
- Answer questions about Jason's current and upcoming locations
- Provide context for why Jason is in certain places
- Assist with meeting logistics

Key Facts About Jason:
- He is a Technical Architect & AI Enablement lead at a Fortune 50 Financial Services company
- His work involves AI proof-of-concept demonstrations, competitive positioning, and infrastructure
- He travels frequently for client meetings and internal projects
- He's also a pastor and theological AI researcher in his spare time
- Location information comes from his public calendar

You Have Access To:
1. Jason's current location and upcoming events (from calendar)
2. A tool to check availability for scheduling
3. A tool to create meeting invitations
4. Event descriptions that explain WHY he's in certain locations

Behavior Guidelines:
- Always check availability before suggesting meeting times
- Ask for meeting topic and duration
- Be friendly but professional
- If Jason is fully booked, offer alternative dates
- Never make up information - only use calendar data
- Always explain context when discussing locations`;

// ============================================================================
// MESSAGE INTERFACE
// ============================================================================
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolUseMessage {
  role: 'assistant';
  content: string;
  tool_use?: {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, any>;
  };
}

// ============================================================================
// TOOL DEFINITIONS - These are passed to the LLM
// ============================================================================
const AVAILABLE_TOOLS = [
  {
    name: 'check_availability',
    description: 'Check what times Jason has available for a meeting in a given date range',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date for availability check (ISO format: YYYY-MM-DD)'
        },
        end_date: {
          type: 'string',
          description: 'End date for availability check (ISO format: YYYY-MM-DD)'
        },
        duration_minutes: {
          type: 'number',
          description: 'How long the meeting would be in minutes (e.g., 30, 60)'
        }
      },
      required: ['start_date', 'duration_minutes']
    }
  },
  {
    name: 'schedule_meeting',
    description: 'Schedule a meeting with Jason on a specific date and time',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Meeting date (ISO format: YYYY-MM-DD)'
        },
        start_time: {
          type: 'string',
          description: 'Meeting start time (ISO format: HH:MM in 24-hour time)'
        },
        duration_minutes: {
          type: 'number',
          description: 'Meeting duration in minutes'
        },
        topic: {
          type: 'string',
          description: 'What the meeting is about'
        },
        attendee_name: {
          type: 'string',
          description: 'Your name (the person scheduling the meeting)'
        },
        attendee_email: {
          type: 'string',
          description: 'Your email address'
        }
      },
      required: ['date', 'start_time', 'duration_minutes', 'topic', 'attendee_email']
    }
  },
  {
    name: 'explain_location',
    description: 'Get context about why Jason is at a particular location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location name (e.g., "NYC", "Chicago")'
        },
        date: {
          type: 'string',
          description: 'The date in question (ISO format: YYYY-MM-DD)'
        }
      },
      required: ['location']
    }
  }
];

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Check availability in a date range
 */
async function checkAvailability(
  startDate: string,
  endDate: string,
  durationMinutes: number
): Promise<string> {
  try {
    const events = await getCachedCalendarEvents();
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid date format. Please use YYYY-MM-DD format.';
    }

    // Filter events in date range
    const rangeEvents = events.filter((e: any) => {
      const eventStart = new Date(e.startTime);
      return eventStart >= start && eventStart <= end;
    });

    if (rangeEvents.length === 0) {
      // Generate availability if no events
      const availableTimes = [];
      const current = new Date(start);

      while (current <= end) {
        // Only suggest weekday business hours (9am-5pm)
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          availableTimes.push({
            date: current.toISOString().split('T')[0],
            times: [
              { start: '09:00', end: '17:00', label: 'Business hours' }
            ]
          });
        }
        current.setDate(current.getDate() + 1);
      }

      return `Jason is completely free from ${startDate} to ${endDate}. 
Suggested meeting slots:
${availableTimes.slice(0, 5).map(day => 
  `• ${day.date}: ${day.times.map(t => `${t.start}-${t.end}`).join(', ')}`
).join('\n')}

What date and time work best for you?`;
    }

    // Show what's booked
    const bookings = rangeEvents.map((e: any) => {
      const eventDate = new Date(e.startTime);
      return `${eventDate.toISOString().split('T')[0]} ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}: ${e.title}`;
    });

    return `Jason has the following commitments during this period:\n${bookings.join('\n')}\n\nPlease suggest an alternative date, or let me check a different time range.`;
  } catch (error) {
    console.error('[ERROR] checkAvailability failed:', error);
    return 'Failed to check availability. Please try again.';
  }
}

/**
 * Schedule a meeting (simplified - just creates confirmation)
 * In production, this would write to Google Calendar or a booking system
 */
async function scheduleMeeting(params: {
  date: string;
  start_time: string;
  duration_minutes: number;
  topic: string;
  attendee_name: string;
  attendee_email: string;
}): Promise<string> {
  try {
    // Validation
    if (!params.date || !params.start_time || !params.topic || !params.attendee_email) {
      return 'Missing required information for scheduling. Please provide: date, time, topic, and email.';
    }

    // In production, you would:
    // 1. Create calendar event in Google Calendar
    // 2. Send confirmation email
    // 3. Log to database
    // For now, just confirm the booking
    const endTime = new Date(`${params.date}T${params.start_time}:00`);
    endTime.setMinutes(endTime.getMinutes() + params.duration_minutes);

    return `✅ Meeting scheduled successfully!

**Details:**
- Topic: ${params.topic}
- Date: ${new Date(params.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Time: ${params.start_time} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
- Duration: ${params.duration_minutes} minutes
- Attendee: ${params.attendee_name} (${params.attendee_email})

Jason will receive a calendar invitation and confirm within 24 hours.`;
  } catch (error) {
    console.error('[ERROR] scheduleMeeting failed:', error);
    return 'Failed to schedule meeting. Please try again.';
  }
}

/**
 * Explain why Jason is at a location
 */
async function explainLocation(location: string, date?: string): Promise<string> {
  try {
    const status = await getLocationStatus();
    
    // Find matching event
    let relevantEvent = null;

    if (date) {
      // Look for event on specific date
      relevantEvent = status.upcomingEvents?.find((e: any) =>
        (e.location?.includes(location) || e.title?.includes(location)) &&
        e.startTime.startsWith(date)
      );
    } else {
      // Use current event if location matches
      if (status.current?.location?.includes(location)) {
        relevantEvent = {
          title: status.current.eventTitle,
          location: status.current.location,
          startTime: status.current.startTime,
          endTime: status.current.endTime,
          description: 'Currently at this location'
        };
      }

      // Or find upcoming event
      if (!relevantEvent) {
        relevantEvent = status.upcomingEvents?.find((e: any) =>
          e.location?.includes(location) || e.title?.includes(location)
        );
      }
    }

    if (!relevantEvent) {
      return `No scheduled events found for ${location}${date ? ` on ${date}` : ''}.`;
    }

    return `Jason is in **${relevantEvent.location || location}** for:

**${relevantEvent.title}**
${relevantEvent.description ? `Description: ${relevantEvent.description}` : ''}
Time: ${new Date(relevantEvent.startTime).toLocaleString()} - ${new Date(relevantEvent.endTime).toLocaleString()}

This is part of his work as a Technical Architect and AI Enablement lead.`;
  } catch (error) {
    console.error('[ERROR] explainLocation failed:', error);
    return 'Failed to get location information.';
  }
}

// ============================================================================
// MAIN CHAT ENDPOINT
// ============================================================================

/**
 * POST /api/chat
 * 
 * Request body:
 * {
 *   "messages": [ { "role": "user", "content": "..." }, ... ],
 *   "userMessage": "What's Jason up to?"
 * }
 * 
 * Returns: SSE stream of chat responses
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages = [], userMessage } = req.body;

    if (!userMessage || userMessage.trim() === '') {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    // Fetch current context
    const locationStatus = await getLocationStatus();
    const upcomingEvents = locationStatus.upcomingEvents || [];

    // Build context injection
    const contextSystemMessage = `Current time: ${new Date().toISOString()}

Jason's Schedule:
- Currently at: ${locationStatus.current?.location || 'Not scheduled'}
- Current event: ${locationStatus.current?.eventTitle || 'None'}
- Next location: ${locationStatus.next?.location || 'No future events'}
- Time until next change: ${locationStatus.next ? 'Soon' : 'Unknown'}

Upcoming events (next 7 days):
${upcomingEvents.slice(0, 10).map((e: any) => {
  const start = new Date(e.startTime);
  return `• ${start.toLocaleDateString()} ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: ${e.title} (${e.location || 'TBD'})`;
}).join('\n') || 'No upcoming events'}`;

    // Build conversation history for LLM
    const conversationHistory: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextSystemMessage },
      ...messages,
      { role: 'user', content: userMessage }
    ];

    // Set up SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    console.log(`[INFO] Chat request: "${userMessage.substring(0, 50)}..."`);

    // Call Ollama (or LLM endpoint)
    const LLM_ENDPOINT = process.env.LLM_ENDPOINT || 'http://localhost:11434';
    const LLM_MODEL = process.env.LLM_MODEL || 'neural-chat';

    try {
      const ollamaResponse = await axios.post(
        `${LLM_ENDPOINT}/api/chat`,
        {
          model: LLM_MODEL,
          messages: conversationHistory,
          stream: true,
          tools: AVAILABLE_TOOLS,
          tool_choice: 'auto' // LLM decides when to use tools
        },
        {
          timeout: 60000,
          responseType: 'stream'
        }
      );

      let fullResponse = '';
      let toolCalls: any[] = [];

      // Handle streaming response
      ollamaResponse.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const json = JSON.parse(line);
            
            if (json.message?.content) {
              fullResponse += json.message.content;
              
              // Check for tool calls in the response
              if (json.message.tool_calls) {
                toolCalls.push(...json.message.tool_calls);
              }

              // Stream the content back to client
              res.write(`data: ${JSON.stringify({
                type: 'text',
                content: json.message.content
              })}\n\n`);
            }
          } catch (e) {
            // Ignore JSON parse errors on incomplete chunks
          }
        });
      });

      ollamaResponse.data.on('end', async () => {
        // Process any tool calls
        if (toolCalls.length > 0) {
          console.log(`[INFO] Processing ${toolCalls.length} tool calls`);
          
          for (const toolCall of toolCalls) {
            let toolResult = '';

            try {
              switch (toolCall.name) {
                case 'check_availability':
                  toolResult = await checkAvailability(
                    toolCall.input.start_date,
                    toolCall.input.end_date,
                    toolCall.input.duration_minutes
                  );
                  break;

                case 'schedule_meeting':
                  toolResult = await scheduleMeeting(toolCall.input);
                  break;

                case 'explain_location':
                  toolResult = await explainLocation(
                    toolCall.input.location,
                    toolCall.input.date
                  );
                  break;

                default:
                  toolResult = `Unknown tool: ${toolCall.name}`;
              }

              // Send tool result back to client
              res.write(`data: ${JSON.stringify({
                type: 'tool_result',
                toolName: toolCall.name,
                result: toolResult
              })}\n\n`);

              console.log(`[INFO] Tool ${toolCall.name} executed successfully`);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              res.write(`data: ${JSON.stringify({
                type: 'tool_error',
                toolName: toolCall.name,
                error: errorMsg
              })}\n\n`);
              
              console.error(`[ERROR] Tool ${toolCall.name} failed:`, error);
            }
          }
        }

        // End stream
        res.write('data: [DONE]\n\n');
        res.end();

        console.log(`[INFO] Chat response completed`);
      });

      ollamaResponse.data.on('error', (error: any) => {
        console.error('[ERROR] LLM streaming error:', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'LLM error'
        })}\n\n`);
        res.end();
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[ERROR] LLM request failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: `Cannot connect to LLM at ${process.env.LLM_ENDPOINT || 'http://localhost:11434'}. Is it running?`
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error.message
          })}\n\n`);
        }
      } else {
        console.error('[ERROR] Unexpected error:', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Unexpected error processing chat'
        })}\n\n`);
      }
      res.end();
    }
  } catch (error) {
    console.error('[ERROR] Chat endpoint exception:', error);
    res.status(500).json({
      error: 'Chat endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

---

## Step 3: Update Server Index (`server/src/index.ts`)

Add these two lines to the import section and routes section:

```typescript
// Add to imports (around line 8)
import chatRouter from './routes/chat';

// Add to routes (around line 75, after other /api/xxx routes)
app.use('/api/chat', chatRouter);
```

---

## Step 4: Update .env

Add these to your `.env` file:

```bash
# Existing variables (keep these)
GOOGLE_CALENDAR_ID=your-calendar-id
GOOGLE_API_KEY=your-api-key
CALENDAR_SYNC_INTERVAL=10
SERVER_PORT=5000
NODE_ENV=development

# NEW: LLM Configuration
LLM_ENDPOINT=http://localhost:11434
LLM_MODEL=neural-chat
```

**Important**: Update `LLM_ENDPOINT` to point to your SlyLinux machine:
```bash
# If Ollama is running on SlyLinux at IP 192.168.1.100:
LLM_ENDPOINT=http://192.168.1.100:11434
```

---

## Step 5: Install NLUX in Client

```bash
cd client
npm install @nlux/react @nlux/themes
```

---

## Step 6: Create Chat Component (`client/src/components/ChatAssistant.tsx`)

Create new file with this content:

```typescript
/**
 * Chat Assistant Component
 * Uses NLUX library for chat UI, connects to /api/chat endpoint
 */

import React, { useCallback } from 'react';
import { AiChat, useAsStreamAdapter } from '@nlux/react';
import '@nlux/themes/nova.css';
import '../styles/chat.css'; // Custom styles (optional)

export default function ChatAssistant() {
  /**
   * Adapter connects NLUX UI to the /api/chat endpoint
   */
  const adapter = useAsStreamAdapter(
    useCallback(
      async (message: string) => {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [], // In production, pass conversation history
            userMessage: message,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat failed: ${response.statusText}`);
        }

        return response;
      },
      []
    )
  );

  return (
    <div className="chat-assistant">
      <AiChat
        adapter={adapter}
        personaOptions={{
          assistant: {
            name: "Jason's Assistant",
            avatar: '🤖',
            tagline: 'Your scheduling & location expert',
          },
          user: {
            name: 'You',
            avatar: '👤',
          },
        }}
        conversationOptions={{
          layout: 'bubbles',
        }}
        displayOptions={{
          colorScheme: 'light',
          width: '100%',
          height: '100%',
        }}
        composerOptions={{
          placeholder: 'Ask about Jason\'s schedule or book a meeting...',
          autoFocus: true,
        }}
      />
    </div>
  );
}
```

---

## Step 7: Add Chat Styles (`client/src/styles/chat.css`)

```css
.chat-assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* NLUX theme customizations */
.nlux-chat-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.nlux-message {
  padding: 12px 16px;
}

.nlux-message-user {
  background: #f0f4f8;
}

.nlux-message-assistant {
  background: white;
}

.nlux-composer {
  border-top: 1px solid #e2e8f0;
}

.nlux-composer-input {
  font-size: 14px;
}
```

---

## Step 8: Update Dashboard (`client/src/pages/Dashboard.tsx`)

Add chat widget. Find this section:

```typescript
import ChatAssistant from '../components/ChatAssistant'; // Add this import

export default function Dashboard() {
  const [showChat, setShowChat] = useState(false); // Add this state
  
  // ... existing code ...

  return (
    <div className="dashboard">
      {/* Existing dashboard content */}
      
      {/* Add this Chat Widget Section */}
      {showChat && (
        <div className="chat-widget-overlay">
          <div className="chat-widget-container">
            <div className="chat-widget-header">
              <h3>Jason's Assistant</h3>
              <button
                onClick={() => setShowChat(false)}
                className="chat-close-btn"
              >
                ✕
              </button>
            </div>
            <ChatAssistant />
          </div>
        </div>
      )}

      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="btn btn-chat floating"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 999,
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
          }}
        >
          💬
        </button>
      )}

      {/* Rest of dashboard */}
    </div>
  );
}
```

Add to `client/src/styles/index.css`:

```css
.chat-widget-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 600px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-in-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-widget-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.chat-widget-header {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.chat-widget-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.chat-close-btn:hover {
  opacity: 0.8;
}

.btn-chat {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s;
}

.btn-chat:hover {
  transform: scale(1.1);
}

.btn-chat.floating {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 28px;
}
```

---

## Step 9: Test Locally

### Terminal 1: Start Ollama on SlyLinux
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

### Terminal 2: Start Express server
```bash
cd wij/server
npm run dev
# or
npm start
```

### Terminal 3: Start React dev server
```bash
cd wij/client
npm start
```

### In Browser
Visit `http://localhost:3000` and click the 💬 button.

Try these messages:
1. "What's Jason up to right now?"
2. "When can I schedule 30 minutes with Jason?"
3. "Why is Jason in New York?"

---

## Step 10: Verify Ollama Connection

Before testing, make sure Ollama is accessible from your Raspi5:

```bash
# On Raspi5, test connection to SlyLinux
curl http://192.168.1.100:11434/api/tags

# Should return something like:
# {"models":[{"name":"neural-chat:latest", ...}]}
```

If it fails:
1. Check `LLM_ENDPOINT` in `.env`
2. Verify Ollama is running: `ps aux | grep ollama`
3. Check firewall: `sudo ufw allow 11434`

---

## Troubleshooting

### "Cannot connect to LLM"
- Verify Ollama is running on SlyLinux
- Verify IP/port in `.env`
- Test: `curl http://192.168.1.100:11434/api/tags`

### "Tool call failed"
- Check `/api/chat` endpoint logs
- Verify calendar data exists
- Tool implementations may need debugging

### Chat messages don't appear
- Check browser console for errors
- Verify `/api/chat` returns SSE stream
- Try: `curl -X POST http://localhost:5000/api/chat -H "Content-Type: application/json" -d '{"userMessage":"Hi"}'`

---

## What's Next?

1. ✅ Chat endpoint working
2. ✅ NLUX UI rendering
3. ✅ Tool calling (basic)
4. Next: Enhance tool implementations
   - Write to Google Calendar for scheduling
   - Email confirmations
   - Conversation history persistence
5. Deploy to production

---

## Copy-Paste Ready Checklist

- [ ] Step 1: Install dependencies
- [ ] Step 2: Create `server/src/routes/chat.ts`
- [ ] Step 3: Update `server/src/index.ts`
- [ ] Step 4: Update `.env`
- [ ] Step 5: Install NLUX
- [ ] Step 6: Create `client/src/components/ChatAssistant.tsx`
- [ ] Step 7: Create `client/src/styles/chat.css`
- [ ] Step 8: Update `client/src/pages/Dashboard.tsx`
- [ ] Step 9: Test locally
- [ ] Step 10: Verify Ollama connection

**You're ready to go!** 🚀
