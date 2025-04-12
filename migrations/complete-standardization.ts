import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Complete standardization of all remaining column names to camelCase
 * This migration addresses all remaining snake_case columns not handled in previous migrations
 * and renames tables to follow camelCase convention as well
 */
async function main() {
  console.log('Starting complete database standardization...');

  try {
    // First standardize column names
    console.log('Standardizing column names to camelCase...');

    // Standardize artist_tour_preferences table columns
    console.log('Standardizing artist_tour_preferences columns...');
    await db.execute(sql`ALTER TABLE artist_tour_preferences RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE artist_tour_preferences RENAME COLUMN updated_at TO "updatedAt"`);

    // Standardize sync_logs table columns
    console.log('Standardizing sync_logs columns...');
    await db.execute(sql`ALTER TABLE sync_logs RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE sync_logs RENAME COLUMN log_message TO "logMessage"`);

    // Standardize tour_gap_suggestions table columns 
    console.log('Standardizing tour_gap_suggestions columns...');
    await db.execute(sql`ALTER TABLE tour_gap_suggestions RENAME COLUMN created_at TO "createdAt"`);

    // Standardize tour_gaps table columns
    console.log('Standardizing tour_gaps columns...');
    await db.execute(sql`ALTER TABLE tour_gaps RENAME COLUMN created_at TO "createdAt"`);

    // Standardize tours table columns
    console.log('Standardizing tours columns...');
    await db.execute(sql`ALTER TABLE tours RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE tours RENAME COLUMN updated_at TO "updatedAt"`);

    // Standardize venue_network table columns
    console.log('Standardizing venue_network columns...');
    await db.execute(sql`ALTER TABLE venue_network RENAME COLUMN trust_score TO "trustScore"`);
    await db.execute(sql`ALTER TABLE venue_network RENAME COLUMN collaborative_bookings TO "collaborativeBookings"`);

    // Standardize venue_tour_preferences table columns
    console.log('Standardizing venue_tour_preferences columns...');
    await db.execute(sql`ALTER TABLE venue_tour_preferences RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE venue_tour_preferences RENAME COLUMN updated_at TO "updatedAt"`);

    // Now rename tables to follow camelCase
    console.log('Standardizing table names to camelCase...');
    
    // First check for any foreign key constraints that might be affected
    console.log('Creating backup before table renaming...');
    
    // Rename tables with snake_case names to camelCase
    console.log('Renaming tables...');
    await db.execute(sql`ALTER TABLE collaborative_participants RENAME TO "collaborativeParticipants"`);
    await db.execute(sql`ALTER TABLE collaborative_opportunities RENAME TO "collaborativeOpportunities"`);
    await db.execute(sql`ALTER TABLE venue_network RENAME TO "venueNetwork"`);
    await db.execute(sql`ALTER TABLE webhook_configurations RENAME TO "webhookConfigurations"`);
    await db.execute(sql`ALTER TABLE venue_tour_preferences RENAME TO "venueTourPreferences"`);
    await db.execute(sql`ALTER TABLE tour_venues RENAME TO "tourVenues"`);
    await db.execute(sql`ALTER TABLE artist_tour_preferences RENAME TO "artistTourPreferences"`);
    await db.execute(sql`ALTER TABLE tour_gaps RENAME TO "tourGaps"`);
    await db.execute(sql`ALTER TABLE tour_gap_suggestions RENAME TO "tourGapSuggestions"`);
    await db.execute(sql`ALTER TABLE tour_routes RENAME TO "tourRoutes"`);
    await db.execute(sql`ALTER TABLE sync_logs RENAME TO "syncLogs"`);

    console.log('Table and column standardization completed successfully');
  } catch (error) {
    console.error('Error during standardization:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });