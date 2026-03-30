/**
 * Calendar sync scheduler
 * Periodically syncs Google Calendar events to local database
 */

import schedule from 'node-schedule';
import { syncCalendarEvents } from '../services/calendarService';

let scheduledJob: schedule.Job | null = null;

/**
 * Start the calendar sync scheduler
 */
export function startCalendarSyncScheduler(): void {
  const intervalMinutes = parseInt(process.env.CALENDAR_SYNC_INTERVAL || '10');

  console.log(`[INFO] Starting calendar sync scheduler (every ${intervalMinutes} minutes)`);

  // Perform initial sync immediately
  syncCalendarEvents().catch(err => {
    console.error('[ERROR] Initial calendar sync failed:', err);
  });

  // Schedule recurring sync
  // Using a simple interval: every N minutes
  scheduledJob = schedule.scheduleJob(`*/${intervalMinutes} * * * *`, async () => {
    console.log('[INFO] Running scheduled calendar sync...');
    try {
      await syncCalendarEvents();
    } catch (error) {
      console.error('[ERROR] Scheduled calendar sync failed:', error);
    }
  });

  console.log('[INFO] Calendar sync scheduler started');
}

/**
 * Stop the calendar sync scheduler
 */
export function stopCalendarSyncScheduler(): void {
  if (scheduledJob) {
    scheduledJob.cancel();
    scheduledJob = null;
    console.log('[INFO] Calendar sync scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return scheduledJob !== null;
}
