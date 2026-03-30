/**
 * Calendar API routes
 */

import { Router, Request, Response } from 'express';
import {
  getCachedCalendarEvents,
  syncCalendarEvents,
  getSyncMetadata
} from '../services/calendarService';

const router = Router();

/**
 * GET /api/calendar/events
 * Get all cached calendar events
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await getCachedCalendarEvents();

    res.json({
      total: events.length,
      limit,
      events: events.slice(0, limit),
    });
  } catch (error) {
    console.error('[ERROR] Failed to get calendar events:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

/**
 * GET /api/calendar/sync-status
 * Get calendar sync status
 */
router.get('/sync-status', async (req: Request, res: Response) => {
  try {
    const metadata = await getSyncMetadata();

    if (!metadata) {
      return res.json({
        status: 'unknown',
        lastSyncTime: null,
        nextSyncTime: null,
        errorMessage: null,
      });
    }

    res.json({
      status: metadata.sync_status,
      lastSyncTime: metadata.last_sync_time,
      nextSyncTime: metadata.next_sync_time,
      errorMessage: metadata.error_message,
    });
  } catch (error) {
    console.error('[ERROR] Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * POST /api/calendar/sync
 * Manually trigger calendar sync (admin only in production)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncCalendarEvents();

    res.json({
      success: result,
      message: result ? 'Calendar sync completed successfully' : 'Calendar sync failed',
    });
  } catch (error) {
    console.error('[ERROR] Failed to sync calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendar',
    });
  }
});

export default router;
