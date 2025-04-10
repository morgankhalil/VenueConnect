
import { db } from '../db';
import { syncLogs } from '../../shared/schema';

export class SyncLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  async log(message: string, level: 'info' | 'error' | 'warning' = 'info') {
    console.log(`[${this.context}] ${message}`);
    
    await db.insert(syncLogs).values({
      context: this.context,
      message,
      level,
      timestamp: new Date()
    });
  }
}
