/**
 * Standardize all venue statuses in the database
 * This migration converts all venue status values to use the new standardized system:
 * - confirmed
 * - potential
 * - hold
 * - cancelled
 */

import { db } from '../server/db';
import { tourVenues } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Normalize venue status to one of the standardized values
 * @param status Original status string
 * @returns Normalized status from the set: 'confirmed', 'potential', 'hold', 'cancelled'
 */
function normalizeStatus(status: string): string {
  const normalizedStatus = status.toLowerCase();
  
  // Map legacy statuses to the new simplified system
  if (normalizedStatus.startsWith('hold') || 
      normalizedStatus === 'contacted' || 
      normalizedStatus === 'negotiating') {
    return 'hold';
  } else if (normalizedStatus === 'suggested') {
    return 'potential';
  } else if (normalizedStatus === 'confirmed') {
    return 'confirmed';
  } else if (normalizedStatus === 'cancelled') {
    return 'cancelled';
  }
  
  // Default to 'potential' for any unknown status
  return 'potential';
}

async function main() {
  console.log('Starting venue status standardization...');
  
  // Fetch all tour venues
  const allTourVenues = await db.select().from(tourVenues);
  console.log(`Found ${allTourVenues.length} tour venues to process`);
  
  let updatedCount = 0;
  
  // Process each venue one by one
  for (const venue of allTourVenues) {
    if (!venue.status) continue;
    
    const originalStatus = venue.status;
    const standardizedStatus = normalizeStatus(originalStatus);
    
    // Only update if the status actually changes
    if (originalStatus !== standardizedStatus) {
      await db
        .update(tourVenues)
        .set({ 
          status: standardizedStatus, 
          statusUpdatedAt: new Date() 
        })
        .where(sql`id = ${venue.id}`);
      
      updatedCount++;
      console.log(`Updated venue ${venue.id} status from "${originalStatus}" to "${standardizedStatus}"`);
    }
  }
  
  console.log(`Status standardization complete. Updated ${updatedCount} venues.`);
}

main()
  .then(() => {
    console.log('Venue status standardization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error standardizing venue statuses:', error);
    process.exit(1);
  });