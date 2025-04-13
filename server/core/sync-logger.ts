
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
        CREATE TABLE IF NOT EXISTS "syncLogs" (
          id SERIAL PRIMARY KEY,
          context VARCHAR NOT NULL,
          "logMessage" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW()
        );
      `);

      // Insert the log message
      await db.execute(sql`
        INSERT INTO "syncLogs" (context, "logMessage", "createdAt")
        VALUES (${this.context}, ${message}, NOW());
      `);
    } catch (error: any) {
      console.error('Error writing to syncLogs:', error);
      
      // If table doesn't exist, try to create it
      if (error.code === '42P01') { // relation does not exist
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "syncLogs" (
              id SERIAL PRIMARY KEY,
              context VARCHAR NOT NULL,
              "logMessage" TEXT NOT NULL,
              "createdAt" TIMESTAMP DEFAULT NOW()
            );
          `);
          // Try inserting again after table creation
          await db.execute(sql`
            INSERT INTO "syncLogs" (context, "logMessage", "createdAt")
            VALUES (${this.context}, ${message}, NOW());
          `);
        } catch (createError) {
          console.error('Failed to create syncLogs table:', createError);
        }
      }
    }
  }
}
