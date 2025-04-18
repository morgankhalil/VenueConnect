/**
 * Run the migration to standardize all constraint names
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { SyncLogger } from "../server/core/sync-logger";

const logger = new SyncLogger('RunStandardizeConstraints');

/**
 * Main runner function
 */
async function main() {
  logger.log('Starting constraint name standardization migration', 'info');

  try {
    // Execute standardize-constraint-names.ts
    await import('./standardize-constraint-names');
    
    logger.log('Successfully ran constraint name standardization migration', 'info');
    
    // Execute fix-individual-constraints.ts
    logger.log('Starting to fix individual constraints', 'info');
    await import('./fix-individual-constraints');
    
    logger.log('Successfully fixed individual constraints', 'info');
  } catch (error) {
    logger.log(`Error in migration process: ${error}`, 'error');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the migration
main()
  .then(() => {
    console.log('✅ Successfully ran constraint name standardization migration');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error running constraint name standardization migration:', error);
    process.exit(1);
  });