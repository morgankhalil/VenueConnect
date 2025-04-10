import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { tourVenues } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Update all tour venue statuses to use the new priority-based status system
 */
async function main() {
  console.log('Updating tour venue statuses to use the new status system...');
  
  try {
    // Get all tour venues
    const venues = await db.select().from(tourVenues);
    console.log(`Found ${venues.length} tour venue records to update`);
    
    // Status mappings from old to new simplified system
    // Using only: potential, hold, confirmed, cancelled
    const statusMappings: Record<string, string> = {
      'proposed': 'potential',
      'suggested': 'potential',
      'requested': 'hold',
      'contacted': 'hold',
      'pending': 'potential',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled'
    };
    
    // Update each venue status based on the mapping
    for (const venue of venues) {
      const oldStatus = venue.status || 'potential';
      const newStatus = statusMappings[oldStatus] || 'potential';
      
      // Only update if there's a change needed
      if (oldStatus !== newStatus) {
        await db
          .update(tourVenues)
          .set({ 
            status: newStatus,
            statusUpdatedAt: new Date()
          })
          .where(eq(tourVenues.id, venue.id));
          
        console.log(`Updated venue ${venue.id} status from "${oldStatus}" to "${newStatus}"`);
      }
    }
    
    console.log('Status update completed successfully');
  } catch (error) {
    console.error('Error updating venue statuses:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });