/**
 * Chat API route for Jason's Assistant
 * Handles multi-turn conversations with tool calling support
 * Streams responses via Server-Sent Events (SSE)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getLocationStatus } from '../services/locationService';
import { getCachedCalendarEvents } from '../services/calendarService';

const router = Router();

// ============================================================================
// LOAD CONFIGURATION - Assistant personality, context, and LLM settings
// ============================================================================
interface AssistantConfig {
  assistant: {
    name: string;
    systemPrompt: string;
    context: {
      name: string;
      title: string;
      company: string;
      jobDescription: string;
      travelInfo: string;
      personalInfo: string;
      calendarType: string;
    };
  };
  llm: {
    endpoint: string;
    model: string;
    apiKey: string | null;
    timeout: number;
    useApiKey: boolean;
  };
  tools: {
    checkAvailability: { enabled: boolean; description: string };
    scheduleMeeting: { enabled: boolean; description: string };
    explainLocation: { enabled: boolean; description: string };
  };
}

let config: AssistantConfig;

try {
  const configPath = path.join(__dirname, '../../config/assistant.config.json');
  const configFile = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configFile);
  console.log('[INFO] Assistant config loaded from assistant.config.json');
} catch (error) {
  console.error('[WARN] Failed to load assistant.config.json, using defaults:', error);
  // Fallback config
  config = {
    assistant: {
      name: "Jason's Assistant",
      systemPrompt: 'You are Jason\'s Assistant, a helpful scheduling coordinator.',
      context: {
        name: 'Jason',
        title: 'Technical Architect & AI Enablement lead',
        company: 'Fortune 50 Financial Services company',
        jobDescription: 'AI proof-of-concept demonstrations and infrastructure',
        travelInfo: 'Travels frequently for client meetings',
        personalInfo: 'Pastor and theological AI researcher',
        calendarType: 'public'
      }
    },
    llm: {
      endpoint: 'http://localhost:11434',
      model: 'neural-chat',
      apiKey: null,
      timeout: 60000,
      useApiKey: false
    },
    tools: {
      checkAvailability: { enabled: true, description: 'Check availability' },
      scheduleMeeting: { enabled: true, description: 'Schedule a meeting' },
      explainLocation: { enabled: true, description: 'Explain location' }
    }
  };
}

// Build dynamic system prompt with context from config
const buildSystemPrompt = (): string => {
  const ctx = config.assistant.context;
  return `${config.assistant.systemPrompt}

Key Facts About ${ctx.name}:
- He is a ${ctx.title} at a ${ctx.company}
- ${ctx.jobDescription}
- ${ctx.travelInfo}
- ${ctx.personalInfo}
- Location information comes from his ${ctx.calendarType} calendar

You Have Access To:
1. ${ctx.name}'s current location and upcoming events (from calendar)
2. A tool to check availability for scheduling
3. A tool to create meeting invitations
4. Event descriptions that explain WHY he's in certain locations`;
};

const SYSTEM_PROMPT = buildSystemPrompt();

// ============================================================================
// MESSAGE INTERFACE
// ============================================================================
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// TOOL DEFINITIONS - Build from config
// ============================================================================
const buildAvailableTools = () => {
  const tools = [];

  if (config.tools.checkAvailability.enabled) {
    tools.push({
      name: 'check_availability',
      description: config.tools.checkAvailability.description,
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
    });
  }

  if (config.tools.scheduleMeeting.enabled) {
    tools.push({
      name: 'schedule_meeting',
      description: config.tools.scheduleMeeting.description,
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
    });
  }

  if (config.tools.explainLocation.enabled) {
    tools.push({
      name: 'explain_location',
      description: config.tools.explainLocation.description,
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
    });
  }

  return tools;
};

const AVAILABLE_TOOLS = buildAvailableTools();

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

    // Use LLM config (from assistant.config.json)
    // Can be overridden by environment variables
    const LLM_ENDPOINT = process.env.LLM_ENDPOINT || config.llm.endpoint;
    const LLM_MODEL = process.env.LLM_MODEL || config.llm.model;
    const LLM_API_KEY = process.env.LLM_API_KEY || config.llm.apiKey;
    const LLM_TIMEOUT = config.llm.timeout;
    const USE_API_KEY = config.llm.useApiKey && !!LLM_API_KEY;

    try {
      // Build request headers with optional API key
      const requestHeaders: Record<string, string> = {};
      if (USE_API_KEY) {
        requestHeaders['Authorization'] = `Bearer ${LLM_API_KEY}`;
      }

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
          timeout: LLM_TIMEOUT,
          responseType: 'stream',
          headers: requestHeaders
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
            error: `Cannot connect to LLM at ${LLM_ENDPOINT}. Is it running?`
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
