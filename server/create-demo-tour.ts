import { db } from './db';
import { tours, tourVenues, venues, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Create a demo tour with a specific structure that demonstrates optimization features
 * - 2 confirmed venues to serve as fixed points
 * - A gap between them that can be filled by the optimizer
 * - A good date range to allow for optimization
 */
async function createDemoTour() {
  try {
    console.log("Starting to create demo tour...");
    
    // Find an artist to use for the tour
    const artistResult = await db
      .select()
      .from(artists)
      .limit(1);
    
    if (!artistResult.length) {
      console.error("No artists found in the database");
      return;
    }
    
    const artist = artistResult[0];
    console.log(`Using artist: ${artist.name} (ID: ${artist.id})`);
    
    // Get existing venues with coordinates
    const venueResults = await db
      .select()
      .from(venues)
      .where(
        eq(venues.latitude, venues.latitude) // This is a trick to filter for non-null latitudes
      )
      .limit(10);
    
    if (venueResults.length < 5) {
      console.error("Not enough venues with coordinates in the database");
      return;
    }
    
    // Create a new tour
    const tourName = `Optimization Demo Tour ${new Date().toISOString().split('T')[0]}`;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 60); // Start 60 days from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day tour
    
    const tourResult = await db
      .insert(tours)
      .values({
        name: tourName,
        artistId: artist.id,
        status: 'planning',
        description: 'A demo tour created to showcase the tour optimization features',
        startDate,
        endDate,
        totalBudget: 200000,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!tourResult.length) {
      console.error("Failed to create tour");
      return;
    }
    
    const tour = tourResult[0];
    console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
    
    // Create two fixed (confirmed) venues at the start and end
    // We'll pick venues that are geographically distant to make optimization interesting
    const firstVenue = venueResults[0];
    const lastVenue = venueResults[venueResults.length - 1];
    
    // First venue - beginning of tour
    const firstVenueDate = new Date(startDate);
    firstVenueDate.setDate(firstVenueDate.getDate() + 3); // 3 days after start
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: firstVenue.id,
        status: 'confirmed', // This is fixed and won't be moved by optimizer
        date: firstVenueDate,
        sequence: 1,
        notes: 'Opening venue for the tour',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    console.log(`Added confirmed starting venue: ${firstVenue.name} on ${firstVenueDate.toISOString().split('T')[0]}`);
    
    // Last venue - end of tour
    const lastVenueDate = new Date(startDate);
    lastVenueDate.setDate(lastVenueDate.getDate() + 27); // 27 days after start (3 days before end)
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: lastVenue.id,
        status: 'confirmed', // This is fixed and won't be moved by optimizer
        date: lastVenueDate,
        sequence: 10, // Higher sequence number
        notes: 'Closing venue for the tour',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    console.log(`Added confirmed ending venue: ${lastVenue.name} on ${lastVenueDate.toISOString().split('T')[0]}`);
    
    // Add a couple of proposed venues in the middle without specific dates
    // These will be rescheduled by the optimizer
    for (let i = 1; i <= 3; i++) {
      const venue = venueResults[i];
      
      await db
        .insert(tourVenues)
        .values({
          tourId: tour.id,
          venueId: venue.id,
          status: 'proposed', // Proposed status allows the optimizer to suggest dates
          sequence: i + 1, // Sequence between first and last
          notes: 'Proposed venue for optimization',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      
      console.log(`Added proposed venue: ${venue.name} (without date)`);
    }
    
    console.log("\nDEMO TOUR CREATED SUCCESSFULLY");
    console.log("---------------------------");
    console.log(`Tour ID: ${tour.id}`);
    console.log(`Tour Name: ${tour.name}`);
    console.log(`Tour has 2 confirmed venues (start/end) and 3 proposed venues without dates.`);
    console.log(`You can now optimize this tour to see how the algorithm suggests dates for the proposed venues.`);
    console.log(`Visit: /tours/${tour.id}/optimize to try it out!`);
    
  } catch (error) {
    console.error("Error creating demo tour:", error);
  }
}

// Run the function
createDemoTour().then(() => process.exit(0));