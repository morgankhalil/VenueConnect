
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function standardizeFieldNames() {
  console.log('Starting field name standardization...');

  try {
    // Rename columns in all tables
    await db.execute(sql`
      ALTER TABLE venues RENAME COLUMN artist_id TO "artistId";
      ALTER TABLE venues RENAME COLUMN created_at TO "createdAt";
      ALTER TABLE venues RENAME COLUMN updated_at TO "updatedAt";
      
      ALTER TABLE tour_venues RENAME COLUMN venue_id TO "venueId";
      ALTER TABLE tour_venues RENAME COLUMN created_at TO "createdAt";
      ALTER TABLE tour_venues RENAME COLUMN status_updated_at TO "statusUpdatedAt";
      
      ALTER TABLE tour_routes RENAME COLUMN start_venue_id TO "startVenueId";
      ALTER TABLE tour_routes RENAME COLUMN end_venue_id TO "endVenueId";
      ALTER TABLE tour_routes RENAME COLUMN created_at TO "createdAt";
      
      ALTER TABLE venue_network RENAME COLUMN connected_venue_id TO "connectedVenueId";
      ALTER TABLE venue_network RENAME COLUMN created_at TO "createdAt";
      
      ALTER TABLE collaborative_opportunities RENAME COLUMN creator_venue_id TO "creatorVenueId";
      ALTER TABLE collaborative_opportunities RENAME COLUMN created_at TO "createdAt";
      
      ALTER TABLE collaborative_participants RENAME COLUMN opportunity_id TO "opportunityId";
      ALTER TABLE collaborative_participants RENAME COLUMN created_at TO "createdAt";
    `);

    console.log('Field name standardization completed successfully');
  } catch (error) {
    console.error('Error standardizing field names:', error);
    throw error;
  }
}

standardizeFieldNames()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
