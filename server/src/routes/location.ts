/**
 * Location API routes
 */

import { Router, Request, Response } from 'express';
import {
  getLocationStatus,
  getCurrentLocation,
  getNextLocation,
  getTimeUntilNextChange,
  getLocationHistory
} from '../services/locationService';

const router = Router();

/**
 * GET /api/location
 * Get current and next location
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = await getLocationStatus();

    const timeUntilChange = getTimeUntilNextChange(status.next);

    res.json({
      current: status.current?.location || 'Unknown',
      currentEvent: status.current?.eventTitle || null,
      currentStartTime: status.current?.startTime || null,
      currentEndTime: status.current?.endTime || null,
      next: status.next?.location || null,
      nextEvent: status.next?.eventTitle || null,
      nextStartTime: status.next?.startTime || null,
      nextEndTime: status.next?.endTime || null,
      timeUntilChange,
      lastUpdated: status.lastUpdated,
    });
  } catch (error) {
    console.error('[ERROR] Failed to get location status:', error);
    res.status(500).json({ error: 'Failed to get location status' });
  }
});

/**
 * GET /api/location/current
 * Get only current location
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const current = await getCurrentLocation();

    if (!current) {
      return res.json({
        location: 'Not scheduled',
        eventTitle: null,
        startTime: null,
        endTime: null,
      });
    }

    res.json({
      location: current.location,
      eventTitle: current.eventTitle,
      startTime: current.startTime,
      endTime: current.endTime,
    });
  } catch (error) {
    console.error('[ERROR] Failed to get current location:', error);
    res.status(500).json({ error: 'Failed to get current location' });
  }
});

/**
 * GET /api/location/next
 * Get next location
 */
router.get('/next', async (req: Request, res: Response) => {
  try {
    const next = await getNextLocation();

    if (!next) {
      return res.json({
        location: null,
        eventTitle: null,
        startTime: null,
        endTime: null,
        timeUntilChange: 'Unknown',
      });
    }

    const timeUntilChange = getTimeUntilNextChange(next);

    res.json({
      location: next.location,
      eventTitle: next.eventTitle,
      startTime: next.startTime,
      endTime: next.endTime,
      timeUntilChange,
    });
  } catch (error) {
    console.error('[ERROR] Failed to get next location:', error);
    res.status(500).json({ error: 'Failed to get next location' });
  }
});

/**
 * GET /api/location/history
 * Get location history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await getLocationHistory(days);

    res.json({
      days,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('[ERROR] Failed to get location history:', error);
    res.status(500).json({ error: 'Failed to get location history' });
  }
});

export default router;
