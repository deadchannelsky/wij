/**
 * Google Calendar integration service
 * Fetches events from public Google Calendar and caches them locally
 */

import axios from 'axios';
import { CalendarEvent, GoogleCalendarEvent } from '../types';
import { getAllRows, runQuery, getRow } from '../db/db';

const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const API_KEY = process.env.GOOGLE_API_KEY;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

/**
 * Fetch events from Google Calendar API
 * Only fetches public events, requires calendar to be publicly shared
 */
export async function fetchGoogleCalendarEvents(): Promise<CalendarEvent[]> {
  if (!API_KEY || !CALENDAR_ID) {
    console.error('[ERROR] Google Calendar credentials not configured');
    console.error('  Set GOOGLE_CALENDAR_ID and GOOGLE_API_KEY in .env');
    return [];
  }

  try {
    const now = new Date();
    // Fetch events from now until 90 days in the future
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const response = await axios.get(
      `${GOOGLE_CALENDAR_API_URL}/${CALENDAR_ID}/events`,
      {
        params: {
          key: API_KEY,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: now.toISOString(),
          timeMax: endDate.toISOString(),
          fields: 'items(id,summary,description,location,start,end)'
        },
        timeout: 10000
      }
    );

    const googleEvents = response.data.items || [];
    console.log(`[INFO] Fetched ${googleEvents.length} events from Google Calendar`);

    // Convert Google Calendar format to our internal format
    return googleEvents.map((event: GoogleCalendarEvent) => ({
      id: `${CALENDAR_ID}_${event.id}`,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      startTime: event.start.dateTime || event.start.date || '',
      endTime: event.end.dateTime || event.end.date || '',
    })).filter((event: CalendarEvent) => event.startTime && event.endTime);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        console.error('[ERROR] Google Calendar access denied. Calendar may not be public.');
        console.error('  Make sure your calendar is shared publicly in Google Calendar settings.');
      } else if (error.response?.status === 404) {
        console.error('[ERROR] Google Calendar not found. Check your calendar ID.');
      } else {
        console.error('[ERROR] Google Calendar API error:', error.response?.status, error.message);
      }
    } else {
      console.error('[ERROR] Failed to fetch Google Calendar events:', error);
    }
    return [];
  }
}

/**
 * Save calendar events to local database
 */
export async function saveCalendarEvents(events: CalendarEvent[]): Promise<void> {
  try {
    // Delete events that are older than today (cleanup)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await runQuery('DELETE FROM calendar_events WHERE end_time < ?', [today.toISOString()]);

    // Insert or update events
    for (const event of events) {
      await runQuery(
        `INSERT OR REPLACE INTO calendar_events
         (id, title, description, location, start_time, end_time, google_event_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.title,
          event.description || '',
          event.location || '',
          event.startTime,
          event.endTime,
          event.id,
          new Date().toISOString()
        ]
      );
    }

    console.log(`[INFO] Saved ${events.length} events to database`);
  } catch (error) {
    console.error('[ERROR] Failed to save calendar events:', error);
    throw error;
  }
}

/**
 * Get all cached calendar events
 */
export async function getCachedCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const events = await getAllRows<CalendarEvent>(
      `SELECT id, title, description, location, start_time as startTime, end_time as endTime
       FROM calendar_events
       ORDER BY start_time ASC`,
      []
    );
    return events;
  } catch (error) {
    console.error('[ERROR] Failed to get cached calendar events:', error);
    return [];
  }
}

/**
 * Sync calendar: fetch from Google Calendar and save locally
 */
export async function syncCalendarEvents(): Promise<boolean> {
  try {
    console.log('[INFO] Starting calendar sync...');

    // Update sync status to "syncing"
    await runQuery(
      `UPDATE sync_metadata
       SET sync_status = 'syncing', error_message = NULL, updated_at = ?
       WHERE id = 1`,
      [new Date().toISOString()]
    );

    // Fetch events from Google Calendar
    const events = await fetchGoogleCalendarEvents();

    if (events.length === 0) {
      console.warn('[WARN] No events fetched from Google Calendar');
      // Don't fail if we get 0 events - could be intentional
    }

    // Save to local database
    await saveCalendarEvents(events);

    // Update sync status to "idle"
    const now = new Date();
    const nextSync = new Date(now.getTime() + (parseInt(process.env.CALENDAR_SYNC_INTERVAL || '10')) * 60 * 1000);

    await runQuery(
      `UPDATE sync_metadata
       SET sync_status = 'idle', last_sync_time = ?, next_sync_time = ?, error_message = NULL, updated_at = ?
       WHERE id = 1`,
      [now.toISOString(), nextSync.toISOString(), now.toISOString()]
    );

    console.log('[INFO] Calendar sync completed successfully');
    return true;
  } catch (error) {
    console.error('[ERROR] Calendar sync failed:', error);

    // Update sync status to "error"
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await runQuery(
      `UPDATE sync_metadata
       SET sync_status = 'error', error_message = ?, updated_at = ?
       WHERE id = 1`,
      [errorMessage, new Date().toISOString()]
    ).catch(err => console.error('[ERROR] Failed to update sync status:', err));

    return false;
  }
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata() {
  try {
    const metadata = await getRow<any>(
      'SELECT last_sync_time, next_sync_time, sync_status, error_message, updated_at FROM sync_metadata WHERE id = 1',
      []
    );
    return metadata;
  } catch (error) {
    console.error('[ERROR] Failed to get sync metadata:', error);
    return null;
  }
}
