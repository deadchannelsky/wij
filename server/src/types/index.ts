/**
 * Type definitions for WhereisJason backend
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  summary?: string;
}

export interface LocationInfo {
  location: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  eventTitle: string;
}

export interface LocationStatus {
  current: LocationInfo | null;
  next: LocationInfo | null;
  lastUpdated: string; // ISO 8601
  upcomingEvents: CalendarEvent[];
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface SyncStatus {
  lastSyncTime: string;
  nextSyncTime: string;
  status: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}
