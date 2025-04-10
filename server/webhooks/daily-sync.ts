import { SyncManager } from '../core/sync-manager';

export async function runDailySync() {
  try {
    console.log('Starting daily sync process...');
    const syncManager = new SyncManager();
    await syncManager.run();
    console.log('Daily sync completed successfully');
  } catch (error) {
    console.error('Error during daily sync:', error);
    throw error;
  }
}