import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getDatabase, closeDatabase } from './db/db';
import { initializeSchema, initializeSyncMetadata } from './db/schema';
import { startCalendarSyncScheduler, stopCalendarSyncScheduler } from './scheduler/calendarSync';
import locationRouter from './routes/location';
import calendarRouter from './routes/calendar';
import configRouter from './routes/config';
import chatRouter from './routes/chat';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables on startup
function validateEnvironment(): void {
  const requiredVars = ['GOOGLE_CALENDAR_ID', 'GOOGLE_API_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.warn(`[WARN] Missing environment variables: ${missing.join(', ')}`);
    console.warn('[WARN] Google Calendar integration may not work correctly');
  }
}

// Middleware for logging
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

// Error handling middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(`[ERROR] ${err.message}`);
  if (NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}

// Setup middleware
app.use(requestLogger);
app.use(express.json());

// Set security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve React build as static files
const buildPath = path.join(__dirname, '../../client/build');
app.use(express.static(buildPath));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

// API Routes
app.use('/api/location', locationRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/config', configRouter);
app.use('/api/chat', chatRouter);

// Serve React app for all other routes (SPA routing)
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(buildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[ERROR] Failed to serve index.html: ${err.message}`);
      res.status(404).send('Not found');
    }
  });
});

// Error handling
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
  try {
    console.log('[INFO] Starting WhereisJason server...');

    validateEnvironment();

    // Initialize database
    console.log('[INFO] Initializing database...');
    getDatabase();
    await initializeSchema();
    await initializeSyncMetadata();
    console.log('[INFO] Database initialized');

    // Start calendar sync scheduler
    startCalendarSyncScheduler();

    // Start Express server
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`[INFO] ✓ Server started on port ${PORT}`);
      console.log(`[INFO] ✓ Environment: ${NODE_ENV}`);
      console.log(`[INFO] ✓ Calendar ID: ${process.env.GOOGLE_CALENDAR_ID || 'NOT SET'}`);
      if (NODE_ENV === 'production') {
        console.log('[INFO] ✓ Server is running behind Nginx reverse proxy');
      }
      console.log('[INFO] ✓ Calendar sync scheduler active');
      console.log('[INFO] ✓ Ready to receive requests');
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`[INFO] Received ${signal}, shutting down gracefully...`);
  stopCalendarSyncScheduler();
  await closeDatabase();
  console.log('[INFO] Database closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
start();
