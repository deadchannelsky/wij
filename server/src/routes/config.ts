/**
 * Configuration API routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/config
 * Get public configuration
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    calendarId: process.env.GOOGLE_CALENDAR_ID || null,
    syncInterval: parseInt(process.env.CALENDAR_SYNC_INTERVAL || '10'),
    version: '0.1.0',
  });
});

export default router;
