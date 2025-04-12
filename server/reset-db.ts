/**
 * Reset the database - drops all tables and rebuilds schema
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import { SyncLogger } from './core/sync-logger';

const logger = new SyncLogger('DatabaseReset');

async function resetDatabase() {
  try {
    logger.log('Starting complete database reset', 'info');

    // Drop all tables
    logger.log('Dropping all tables', 'info');
    await db.execute(sql`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    logger.log('All tables dropped successfully', 'info');
    logger.log('Database reset complete', 'info');
    logger.log('You should now run "npm run db:push" to recreate the schema', 'info');
  } catch (error) {
    logger.log(`Error resetting database: ${error}`, 'error');
    throw error;
  }
}

resetDatabase()
  .then(() => {
    console.log('Database reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  });