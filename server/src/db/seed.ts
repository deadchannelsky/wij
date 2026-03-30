/**
 * Database seed script
 * Run with: npm run db:seed
 * Creates sample calendar events for testing
 */

import { runQuery, closeDatabase, getDatabase } from './db';

async function seed(): Promise<void> {
  try {
    console.log('[INFO] Starting database seeding...');

    // Initialize database
    getDatabase();

    // Create sample events
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const seedEvents = [
      {
        id: 'sample-home-1',
        title: 'At Home, Ohio',
        description: 'Home in Ohio',
        location: 'Ohio',
        startTime: now.toISOString(),
        endTime: tomorrow.toISOString(),
      },
      {
        id: 'sample-conference-1',
        title: 'Conference - Chicago',
        description: 'Tech conference in Chicago',
        location: 'Chicago, IL',
        startTime: tomorrow.toISOString(),
        endTime: nextWeek.toISOString(),
      },
      {
        id: 'sample-home-2',
        title: 'At Home, Ohio',
        description: 'Back home in Ohio',
        location: 'Ohio',
        startTime: nextWeek.toISOString(),
        endTime: twoWeeks.toISOString(),
      }
    ];

    for (const event of seedEvents) {
      await runQuery(
        `INSERT OR REPLACE INTO calendar_events
         (id, title, description, location, start_time, end_time, google_event_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.title,
          event.description,
          event.location,
          event.startTime,
          event.endTime,
          event.id,
          new Date().toISOString()
        ]
      );
    }

    console.log(`[INFO] Seeded ${seedEvents.length} sample events`);
    console.log('[INFO] Database seeding completed successfully');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Database seeding failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run seed
seed();
