/**
 * Location detection service
 * Parses calendar events to extract location information
 */

import { CalendarEvent, LocationInfo, LocationStatus } from '../types';
import { getAllRows, runQuery } from '../db/db';

/**
 * Extract location from event title or location field
 * Expected formats:
 * - "Jason - At Home, Ohio"
 * - "Jason - Conference in Chicago"
 * - Event with location field set
 */
function parseLocationFromEvent(event: CalendarEvent): string | null {
  // First check the location field
  if (event.location && event.location.trim()) {
    return event.location.trim();
  }

  // Parse from title
  const title = event.title || '';

  // Match patterns like "Jason - At X" or "Jason - In X"
  const patterns = [
    /Jason\s*-\s*(?:At|In|@)\s*([^,\n]+)/i,
    /At\s+([^,\n]+)/i,
    /In\s+([^,\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no location found, use title as fallback
  if (title && !title.toLowerCase().includes('busy') && !title.toLowerCase().includes('unavailable')) {
    return title;
  }

  return null;
}

/**
 * Get current location based on calendar events
 */
export async function getCurrentLocation(): Promise<LocationInfo | null> {
  try {
    const now = new Date();

    // Find event that is currently happening
    const events = await getAllRows<CalendarEvent>(
      `SELECT id, title, description, location, start_time as startTime, end_time as endTime
       FROM calendar_events
       WHERE start_time <= ? AND end_time > ?
       ORDER BY start_time DESC
       LIMIT 1`,
      [now.toISOString(), now.toISOString()]
    );

    if (events.length === 0) {
      return null;
    }

    const event = events[0];
    const location = parseLocationFromEvent(event);

    if (!location) {
      return null;
    }

    return {
      location,
      startTime: event.startTime,
      endTime: event.endTime,
      eventTitle: event.title,
    };
  } catch (error) {
    console.error('[ERROR] Failed to get current location:', error);
    return null;
  }
}

/**
 * Get next location change
 */
export async function getNextLocation(): Promise<LocationInfo | null> {
  try {
    const now = new Date();

    // Find next event with a location
    const events = await getAllRows<CalendarEvent>(
      `SELECT id, title, description, location, start_time as startTime, end_time as endTime
       FROM calendar_events
       WHERE start_time > ?
       ORDER BY start_time ASC
       LIMIT 20`,
      [now.toISOString()]
    );

    for (const event of events) {
      const location = parseLocationFromEvent(event);
      if (location) {
        return {
          location,
          startTime: event.startTime,
          endTime: event.endTime,
          eventTitle: event.title,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[ERROR] Failed to get next location:', error);
    return null;
  }
}

/**
 * Get full location status (current + next)
 */
export async function getLocationStatus(): Promise<LocationStatus> {
  try {
    const current = await getCurrentLocation();
    const next = await getNextLocation();

    // Get upcoming events for display
    const now = new Date();
    const upcoming = await getAllRows<CalendarEvent>(
      `SELECT id, title, description, location, start_time as startTime, end_time as endTime
       FROM calendar_events
       WHERE start_time > ?
       ORDER BY start_time ASC
       LIMIT 10`,
      [now.toISOString()]
    );

    return {
      current,
      next,
      lastUpdated: new Date().toISOString(),
      upcomingEvents: upcoming,
    };
  } catch (error) {
    console.error('[ERROR] Failed to get location status:', error);
    return {
      current: null,
      next: null,
      lastUpdated: new Date().toISOString(),
      upcomingEvents: [],
    };
  }
}

/**
 * Save location history record
 */
export async function recordLocationChange(locationInfo: LocationInfo): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO location_history (location, start_time, end_time, created_at)
       VALUES (?, ?, ?, ?)`,
      [locationInfo.location, locationInfo.startTime, locationInfo.endTime, new Date().toISOString()]
    );
  } catch (error) {
    console.error('[ERROR] Failed to record location change:', error);
  }
}

/**
 * Get location history
 */
export async function getLocationHistory(days: number = 30) {
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const history = await getAllRows<any>(
      `SELECT location, start_time, end_time, created_at
       FROM location_history
       WHERE created_at > ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [dateLimit.toISOString()]
    );

    return history;
  } catch (error) {
    console.error('[ERROR] Failed to get location history:', error);
    return [];
  }
}

/**
 * Calculate time until next location change
 */
export function getTimeUntilNextChange(nextLocation: LocationInfo | null): string {
  if (!nextLocation) {
    return 'Unknown';
  }

  const nextTime = new Date(nextLocation.startTime).getTime();
  const now = Date.now();
  const diffMs = nextTime - now;

  if (diffMs < 0) {
    return 'Soon';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
