
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class SyncLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  async log(message: string, level: 'info' | 'error' | 'warning' = 'info') {
    console.log(`[${this.context}] ${message}`);
    
    await db.execute(sql`
      INSERT INTO sync_logs (context, message, level, timestamp)
      VALUES (${this.context}, ${message}, ${level}, NOW())
    `);
  }
}
