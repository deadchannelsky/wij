/**
 * Database initialization and management
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/app.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: sqlite3.Database | null = null;

/**
 * Get or initialize database connection
 */
export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[ERROR] Database connection failed:', err.message);
        process.exit(1);
      }
      console.log('[INFO] Database connected:', dbPath);

      // Enable foreign keys
      db!.run('PRAGMA foreign_keys = ON');
    });
  }
  return db;
}

/**
 * Run a query with parameters
 */
export function runQuery(query: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(query, params, (err) => {
      if (err) {
        console.error('[ERROR] Query failed:', err.message, { query, params });
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get a single row
 */
export function getRow<T>(query: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(query, params, (err, row) => {
      if (err) {
        console.error('[ERROR] Get row failed:', err.message, { query, params });
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
}

/**
 * Get all rows
 */
export function getAllRows<T>(query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
      if (err) {
        console.error('[ERROR] Get all rows failed:', err.message, { query, params });
        reject(err);
      } else {
        resolve((rows || []) as T[]);
      }
    });
  });
}

/**
 * Close database connection
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
