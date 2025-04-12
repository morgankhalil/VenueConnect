
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class SyncLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  async log(message: string, level: 'info' | 'error' | 'warning' = 'info') {
    console.log(`[${this.context}] ${message}`);

    try {
      // Create table if it doesn't exist with proper schema
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id SERIAL PRIMARY KEY,
          context TEXT NOT NULL,
          message TEXT NOT NULL,
          level TEXT NOT NULL,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Insert the log message
      await db.execute(sql`
        INSERT INTO sync_logs (context, message, level, timestamp)
        VALUES (${this.context}, ${message}, ${level}, NOW());
      `);
    } catch (error: any) {
      console.error('Error writing to sync_logs:', error);
      
      // If table doesn't exist, try to create it
      if (error.code === '42P01') { // relation does not exist
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS sync_logs (
              id SERIAL PRIMARY KEY,
              context TEXT NOT NULL,
              message TEXT NOT NULL,
              level TEXT NOT NULL,
              timestamp TIMESTAMPTZ DEFAULT NOW()
            );
          `);
          // Try inserting again after table creation
          await db.execute(sql`
            INSERT INTO sync_logs (context, message, level, timestamp)
            VALUES (${this.context}, ${message}, ${level}, NOW());
          `);
        } catch (createError) {
          console.error('Failed to create sync_logs table:', createError);
        }
      }
    }
  }
}
