
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function standardizeFieldNames() {
  console.log('Starting field name standardization...');

  try {
    // Execute each ALTER TABLE statement separately
    const alterStatements = [
      sql`ALTER TABLE venues RENAME COLUMN artist_id TO "artistId"`,
      sql`ALTER TABLE venues RENAME COLUMN created_at TO "createdAt"`,
      sql`ALTER TABLE venues RENAME COLUMN updated_at TO "updatedAt"`,
      
      sql`ALTER TABLE tour_venues RENAME COLUMN venue_id TO "venueId"`,
      sql`ALTER TABLE tour_venues RENAME COLUMN created_at TO "createdAt"`,
      sql`ALTER TABLE tour_venues RENAME COLUMN status_updated_at TO "statusUpdatedAt"`,
      
      sql`ALTER TABLE tour_routes RENAME COLUMN start_venue_id TO "startVenueId"`,
      sql`ALTER TABLE tour_routes RENAME COLUMN end_venue_id TO "endVenueId"`,
      sql`ALTER TABLE tour_routes RENAME COLUMN created_at TO "createdAt"`,
      
      sql`ALTER TABLE venue_network RENAME COLUMN connected_venue_id TO "connectedVenueId"`,
      sql`ALTER TABLE venue_network RENAME COLUMN created_at TO "createdAt"`,
      
      sql`ALTER TABLE collaborative_opportunities RENAME COLUMN creator_venue_id TO "creatorVenueId"`,
      sql`ALTER TABLE collaborative_opportunities RENAME COLUMN created_at TO "createdAt"`,
      
      sql`ALTER TABLE collaborative_participants RENAME COLUMN opportunity_id TO "opportunityId"`,
      sql`ALTER TABLE collaborative_participants RENAME COLUMN created_at TO "createdAt"`
    ];

    // Execute each statement one at a time
    for (const statement of alterStatements) {
      try {
        await db.execute(statement);
        console.log('Executed statement successfully');
      } catch (error) {
        console.warn('Warning: Failed to execute statement:', error.message);
        // Continue with other statements even if one fails
      }
    }

    console.log('Field name standardization completed');
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
