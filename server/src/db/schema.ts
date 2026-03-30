/**
 * Database schema and initialization
 */

import { runQuery, getDatabase } from './db';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    google_event_id TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS location_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    event_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES calendar_events(id)
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY,
    last_sync_time TEXT,
    next_sync_time TEXT,
    sync_status TEXT DEFAULT 'idle',
    error_message TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
  CREATE INDEX IF NOT EXISTS idx_location_history_start_time ON location_history(start_time);
`;

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();

    db.exec(SCHEMA, (err) => {
      if (err) {
        console.error('[ERROR] Schema initialization failed:', err);
        reject(err);
      } else {
        console.log('[INFO] Database schema initialized');
        resolve();
      }
    });
  });
}

/**
 * Initialize sync metadata
 */
export async function initializeSyncMetadata(): Promise<void> {
  try {
    const now = new Date().toISOString();
    await runQuery(
      `INSERT OR IGNORE INTO sync_metadata (id, last_sync_time, next_sync_time, sync_status)
       VALUES (1, ?, ?, 'idle')`,
      [now, now]
    );
    console.log('[INFO] Sync metadata initialized');
  } catch (err) {
    console.error('[ERROR] Failed to initialize sync metadata:', err);
    throw err;
  }
}

/**
 * Reset all data (development only)
 */
export async function resetDatabase(): Promise<void> {
  try {
    await runQuery('DELETE FROM location_history');
    await runQuery('DELETE FROM calendar_events');
    await runQuery('DELETE FROM sync_metadata');
    await initializeSyncMetadata();
    console.log('[INFO] Database reset complete');
  } catch (err) {
    console.error('[ERROR] Failed to reset database:', err);
    throw err;
  }
}
