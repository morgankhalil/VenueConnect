
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
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id SERIAL PRIMARY KEY,
          context TEXT NOT NULL,
          message TEXT NOT NULL,
          level TEXT NOT NULL,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );
        
        INSERT INTO sync_logs (context, message, level, timestamp)
        VALUES (${this.context}, ${message}, ${level}, NOW())
      `);
    } catch (error) {
      // Gracefully handle missing table
      console.warn('Warning: sync_logs table not available');
    }
  }
}
