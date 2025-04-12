
import { db } from './db';
import { SeedManager } from './core/seed-manager';

async function clearAll() {
  try {
    console.log('Starting complete database clear...');
    const manager = new SeedManager();
    await manager.clearDatabase();
    console.log('Database cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearAll();
