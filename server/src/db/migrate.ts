/**
 * Database migration script
 * Run with: npm run db:migrate
 */

import { getDatabase, closeDatabase } from './db';
import { initializeSchema, initializeSyncMetadata } from './schema';

async function migrate(): Promise<void> {
  try {
    console.log('[INFO] Starting database migration...');

    // Initialize database connection
    getDatabase();

    // Initialize schema
    await initializeSchema();

    // Initialize sync metadata
    await initializeSyncMetadata();

    console.log('[INFO] Database migration completed successfully');

    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Database migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run migration
migrate();
