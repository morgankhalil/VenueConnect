/**
 * Update the demo tours to have varying venue statuses
 * This script adds a variety of statuses to demo tours to showcase the simplified status system
 */

import { db } from './db';
import { tours, tourVenues } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateDemoTourStatuses() {
  console.log('Database connection initialized');
  console.log('Updating demo tour venue statuses...');

  try {
    // Get tours
    const toursResult = await db.query.tours.findMany({
      orderBy: tours.id,
    });

    if (toursResult.length === 0) {
      console.log('No tours found');
      return;
    }

    console.log(`Found ${toursResult.length} tours to update`);

    // Update Tour 1: "Optimization Demo 1" - make it have the typical pattern
    // with confirmed start/end and potential venues in between
    const tourId1 = toursResult[0].id;
    const tourVenues1 = await db.query.tourVenues.findMany({
      where: eq(tourVenues.tourId, tourId1),
      orderBy: tourVenues.id,
    });

    if (tourVenues1.length > 0) {
      // First venue is confirmed
      await db.update(tourVenues)
        .set({
          status: 'confirmed',
        })
        .where(eq(tourVenues.id, tourVenues1[0].id));
      
      // Last venue is confirmed
      await db.update(tourVenues)
        .set({
          status: 'confirmed',
        })
        .where(eq(tourVenues.id, tourVenues1[tourVenues1.length - 1].id));
        
      // Middle venues are potential or hold
      for (let i = 1; i < tourVenues1.length - 1; i++) {
        const status = i % 2 === 0 ? 'potential' : 'hold';
        await db.update(tourVenues)
          .set({
            status,
          })
          .where(eq(tourVenues.id, tourVenues1[i].id));
      }
      
      console.log(`Updated ${tourVenues1.length} venues for tour ${tourId1}`);
    }

    // Update Tour 2: "Start-End Fixed Tour" - just confirm the start/end
    const tourId2 = toursResult[1]?.id;
    if (tourId2) {
      const tourVenues2 = await db.query.tourVenues.findMany({
        where: eq(tourVenues.tourId, tourId2),
        orderBy: tourVenues.id,
      });

      if (tourVenues2.length > 0) {
        // First venue is confirmed
        await db.update(tourVenues)
          .set({
            status: 'confirmed',
          })
          .where(eq(tourVenues.id, tourVenues2[0].id));
        
        // Last venue is confirmed
        await db.update(tourVenues)
          .set({
            status: 'confirmed',
          })
          .where(eq(tourVenues.id, tourVenues2[tourVenues2.length - 1].id));
          
        // Middle venues are all potential
        for (let i = 1; i < tourVenues2.length - 1; i++) {
          await db.update(tourVenues)
            .set({
              status: 'potential',
            })
            .where(eq(tourVenues.id, tourVenues2[i].id));
        }
        
        console.log(`Updated ${tourVenues2.length} venues for tour ${tourId2}`);
      }
    }

    // Update Tour 3: "Mixed Status Tour" - create a mix of all different statuses
    const tourId3 = toursResult[2]?.id;
    if (tourId3) {
      const tourVenues3 = await db.query.tourVenues.findMany({
        where: eq(tourVenues.tourId, tourId3),
        orderBy: tourVenues.id,
      });

      if (tourVenues3.length > 0) {
        const statuses = ['confirmed', 'hold', 'potential', 'cancelled'];
        
        for (let i = 0; i < tourVenues3.length; i++) {
          const status = statuses[i % statuses.length];
          await db.update(tourVenues)
            .set({
              status,
            })
            .where(eq(tourVenues.id, tourVenues3[i].id));
        }
        
        console.log(`Updated ${tourVenues3.length} venues for tour ${tourId3}`);
      }
    }

    // Update Tour 4: "Dense Calendar Tour" - mix of confirmed and holds
    const tourId4 = toursResult[3]?.id;
    if (tourId4) {
      const tourVenues4 = await db.query.tourVenues.findMany({
        where: eq(tourVenues.tourId, tourId4),
        orderBy: tourVenues.id,
      });

      if (tourVenues4.length > 0) {
        for (let i = 0; i < tourVenues4.length; i++) {
          const status = i % 3 === 0 ? 'confirmed' : (i % 3 === 1 ? 'hold' : 'potential');
          await db.update(tourVenues)
            .set({
              status,
            })
            .where(eq(tourVenues.id, tourVenues4[i].id));
        }
        
        console.log(`Updated ${tourVenues4.length} venues for tour ${tourId4}`);
      }
    }

    // Update Tour 5: "Cross-Country Tour" - mostly confirmed with one cancelled
    const tourId5 = toursResult[4]?.id;
    if (tourId5) {
      const tourVenues5 = await db.query.tourVenues.findMany({
        where: eq(tourVenues.tourId, tourId5),
        orderBy: tourVenues.id,
      });

      if (tourVenues5.length > 0) {
        // Set all to confirmed except one cancelled in the middle
        for (let i = 0; i < tourVenues5.length; i++) {
          // Make middle venue cancelled
          const status = i === Math.floor(tourVenues5.length / 2) ? 'cancelled' : 'confirmed';
          await db.update(tourVenues)
            .set({
              status,
            })
            .where(eq(tourVenues.id, tourVenues5[i].id));
        }
        
        console.log(`Updated ${tourVenues5.length} venues for tour ${tourId5}`);
      }
    }

    console.log('All demo tour venue statuses updated successfully');

  } catch (error) {
    console.error('Error updating demo tour venue statuses:', error);
  }
}

// Run the function
updateDemoTourStatuses().then(() => {
  console.log('Finished');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});