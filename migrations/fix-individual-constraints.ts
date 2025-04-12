/**
 * Manually fix individual constraints that might need special handling
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { SyncLogger } from "../server/core/sync-logger";

const logger = new SyncLogger('FixIndividualConstraints');

/**
 * Main function to fix individual constraints
 */
async function main() {
  logger.log('Starting individual constraint fixes', 'info');
  
  try {
    // Fix tour_routes foreign key constraints
    await fixTourRoutesConstraints();
    
    // Fix index constraints (especially for tables with multiple indexes)
    await fixIndexConstraints();
    
    // Fix any special cases for unique constraints
    await fixUniqueConstraints();
    
    logger.log('Successfully completed individual constraint fixes', 'info');
  } catch (error) {
    logger.log(`Error in individual constraint fixes: ${error}`, 'error');
    throw error;
  }
}

/**
 * Fix the tourRoutes foreign key constraints which have a different format
 */
async function fixTourRoutesConstraints() {
  logger.log('Fixing tourRoutes constraints', 'info');
  
  const constraints = [
    { oldName: 'tour_routes_tour_id_fkey', newName: 'tourRoutesTourIdToursIdFk' },
    { oldName: 'tour_routes_start_venue_id_fkey', newName: 'tourRoutesStartVenueIdVenuesIdFk' },
    { oldName: 'tour_routes_end_venue_id_fkey', newName: 'tourRoutesEndVenueIdVenuesIdFk' }
  ];
  
  for (const constraint of constraints) {
    try {
      logger.log(`Renaming ${constraint.oldName} to ${constraint.newName}`, 'info');
      
      await db.execute(sql`
        ALTER TABLE "tourRoutes" 
        RENAME CONSTRAINT "${constraint.oldName}" TO "${constraint.newName}";
      `);
    } catch (error) {
      logger.log(`Error renaming constraint ${constraint.oldName}: ${error}`, 'warning');
      // Continue with other constraints even if one fails
    }
  }
}

/**
 * Fix index constraints that might need special handling
 */
async function fixIndexConstraints() {
  logger.log('Fixing index constraints', 'info');
  
  const indexesToRename = [
    // Add specific indexes with their new names here if they need special handling
    { table: 'artists', oldName: 'artists_bandsintown_id_unique', newName: 'artistsBandsintownIdUnique' },
    { table: 'artists', oldName: 'artists_songkick_id_unique', newName: 'artistsSongkickIdUnique' },
    { table: 'artists', oldName: 'artists_spotify_id_unique', newName: 'artistsSpotifyIdUnique' },
    { table: 'venues', oldName: 'venues_bandsintown_id_unique', newName: 'venuesBandsintownIdUnique' },
    { table: 'venues', oldName: 'venues_songkick_id_key', newName: 'venuesSongkickIdUnique' },
    { table: 'users', oldName: 'users_email_unique', newName: 'usersEmailUnique' },
    { table: 'users', oldName: 'users_username_unique', newName: 'usersUsernameUnique' }
  ];
  
  for (const index of indexesToRename) {
    try {
      logger.log(`Renaming index ${index.oldName} to ${index.newName}`, 'info');
      
      await db.execute(sql`
        ALTER INDEX "${index.oldName}" RENAME TO "${index.newName}";
      `);
    } catch (error) {
      logger.log(`Error renaming index ${index.oldName}: ${error}`, 'warning');
      // Continue with other indexes even if one fails
    }
  }
}

/**
 * Fix unique constraints that might need special handling
 */
async function fixUniqueConstraints() {
  logger.log('Fixing unique constraints', 'info');
  
  // Add specific unique constraints that need special handling
  // Example:
  // await db.execute(sql`
  //   ALTER TABLE "tableName" 
  //   RENAME CONSTRAINT "old_constraint_name" TO "newConstraintName";
  // `);
}

// Run the migration
main()
  .then(() => {
    console.log('✅ Successfully fixed individual constraints');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing individual constraints:', error);
    process.exit(1);
  });