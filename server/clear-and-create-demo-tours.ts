import { db } from './db';
import { tours, tourVenues, venues, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateInitialTourScore } from '../shared/utils/initial-tour-score';

/**
 * Clear all existing tours and create new demo tours
 * This script will:
 * 1. Delete all existing tour_venues
 * 2. Delete all existing tours
 * 3. Create 5 new demo tours with different structures for optimization testing
 * 4. Calculate and set initial optimization scores for each tour
 */
async function clearAndCreateDemoTours() {
  try {
    console.log("Starting to clear and create demo tours...");
    
    // Step 1: Delete all existing tour venues
    console.log("Clearing existing tour venues...");
    await db.delete(tourVenues);
    
    // Step 2: Delete all existing tours
    console.log("Clearing existing tours...");
    await db.delete(tours);
    
    // Step 3: Create new demo tours
    await createDemoTours();
    
    console.log("Operation completed successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Create 5 demo tours with different structures
 */
async function createDemoTours() {
  // Get artists from database
  const artistResults = await db
    .select()
    .from(artists)
    .limit(5);
  
  if (!artistResults.length) {
    console.error("No artists found in the database");
    return;
  }
  
  // Get venues with coordinates
  const venueResults = await db
    .select()
    .from(venues)
    .where(
      eq(venues.latitude, venues.latitude) // This is a trick to filter for non-null latitudes
    )
    .limit(20);
  
  if (venueResults.length < 5) {
    console.error("Not enough venues with coordinates in the database");
    return;
  }
  
  // Log all venues with coordinates for debugging
  console.log("Available venues with coordinates:");
  venueResults.forEach(venue => {
    console.log(`- ${venue.name} (ID: ${venue.id}, Coordinates: ${venue.latitude}, ${venue.longitude})`);
  });
  
  // Adjust for fewer venues
  console.log(`Found ${venueResults.length} venues with coordinates`);
  
  // Create an array to track tour IDs for later optimization score setting
  const createdTourIds = [];
  
  // We'll reuse venues for different tours to work with what we have
  const tour1 = await createOptimizableTour(artistResults[0], venueResults.slice(0, 5), "Optimization Demo 1");
  if (tour1) createdTourIds.push(tour1.id);
  
  // For the other tours, we'll reuse the same venues but in different orders
  const shuffled1 = [...venueResults].sort(() => 0.5 - Math.random());
  const tour2 = await createStartEndTour(artistResults[1], shuffled1.slice(0, 5), "Start-End Fixed Tour");
  if (tour2) createdTourIds.push(tour2.id);
  
  const shuffled2 = [...venueResults].sort(() => 0.5 - Math.random());
  const tour3 = await createConfirmedMixTour(artistResults[2], shuffled2.slice(0, 5), "Mixed Status Tour");
  if (tour3) createdTourIds.push(tour3.id);
  
  const shuffled3 = [...venueResults].sort(() => 0.5 - Math.random());
  const tour4 = await createDenseCalendarTour(artistResults[3], shuffled3.slice(0, 6), "Dense Calendar Tour");
  if (tour4) createdTourIds.push(tour4.id);
  
  const shuffled4 = [...venueResults].sort(() => 0.5 - Math.random());
  const tour5 = await createLongDistanceTour(artistResults[4], shuffled4.slice(0, 6), "Cross-Country Tour");
  if (tour5) createdTourIds.push(tour5.id);
  
  console.log("Successfully created 5 demo tours");
  
  // Calculate and set initial optimization scores for all created tours
  console.log("Calculating initial optimization scores...");
  await calculateAndSetInitialScores(createdTourIds);
}

/**
 * Create a tour with two fixed points and proposed venues in between
 * This is ideal for demonstrating the basic optimization capabilities
 */
async function createOptimizableTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 60); // Start 60 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30); // 30-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Demo tour to showcase tour optimization with two fixed points',
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
  
  // First venue (beginning of tour)
  const firstVenueDate = new Date(startDate);
  firstVenueDate.setDate(firstVenueDate.getDate() + 3);
  
  await db
    .insert(tourVenues)
    .values({
      tourId: tour.id,
      venueId: venues[0].id,
      status: 'confirmed',
      date: firstVenueDate,
      sequence: 1,
      notes: 'Opening venue - confirmed date',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  // Last venue (end of tour)
  const lastVenueDate = new Date(startDate);
  lastVenueDate.setDate(lastVenueDate.getDate() + 27);
  
  // Make sure we have enough venues
  const lastVenueIndex = Math.min(4, venues.length - 1);
  
  await db
    .insert(tourVenues)
    .values({
      tourId: tour.id,
      venueId: venues[lastVenueIndex].id,
      status: 'confirmed',
      date: lastVenueDate,
      sequence: 10,
      notes: 'Closing venue - confirmed date',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  // Add potential venues in between (using the new simplified status system)
  for (let i = 1; i <= Math.min(3, venues.length - 2); i++) {
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venues[i].id,
        status: 'potential',
        sequence: i + 1,
        notes: 'Potential venue for optimization',
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  console.log(`Added venues to tour: ${tour.name} (${venues.length} venues)`);
  
  return tour;
}

/**
 * Create a tour with confirmed start and end, but no dates for proposed venues
 */
async function createStartEndTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 75); // Start 75 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 45); // 45-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Demo tour with fixed start and end dates',
      startDate,
      endDate,
      totalBudget: 300000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) return;
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Start venue
  const firstVenueDate = new Date(startDate);
  firstVenueDate.setDate(firstVenueDate.getDate() + 2);
  
  await db
    .insert(tourVenues)
    .values({
      tourId: tour.id,
      venueId: venues[0].id,
      status: 'confirmed',
      date: firstVenueDate,
      sequence: 1,
      notes: 'Tour kickoff',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  // End venue
  const lastVenueDate = new Date(endDate);
  lastVenueDate.setDate(lastVenueDate.getDate() - 2);
  
  // Make sure we have enough venues
  const lastVenueIndex = Math.min(4, venues.length - 1);
  
  await db
    .insert(tourVenues)
    .values({
      tourId: tour.id,
      venueId: venues[lastVenueIndex].id,
      status: 'confirmed',
      date: lastVenueDate,
      sequence: 15,
      notes: 'Tour finale',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  
  // Multiple potential venues without dates (using the new simplified status system)
  for (let i = 1; i < Math.min(4, venues.length - 1); i++) {
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venues[i].id,
        status: 'potential',
        sequence: i + 2,
        notes: 'Potential venue',
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  return tour;
}

/**
 * Create a tour with a mix of confirmed, booked, and proposed venues
 */
async function createConfirmedMixTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 120); // Start 120 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 40); // 40-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Demo tour with mixed venue statuses',
      startDate,
      endDate,
      totalBudget: 250000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) return;
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Different statuses for venues (using simplified status system)
  const statusConfigurations = [
    { status: 'confirmed', date: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000) },
    { status: 'hold', date: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000) },
    { status: 'potential', date: null },
    { status: 'confirmed', date: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) },
    { status: 'potential', date: null }
  ];
  
  // Add venues with different statuses
  for (let i = 0; i < Math.min(5, venues.length); i++) {
    const config = statusConfigurations[i];
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venues[i].id,
        status: config.status,
        date: config.date,
        sequence: i + 1,
        notes: `Venue with ${config.status} status`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  return tour;
}

/**
 * Create a tour with a dense calendar of close dates
 */
async function createDenseCalendarTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 90); // Start 90 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 20); // 20-day tour (more dense)
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Demo tour with densely packed schedule',
      startDate,
      endDate,
      totalBudget: 180000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) return;
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Add a mix of confirmed and proposed venues with close dates
  for (let i = 0; i < Math.min(6, venues.length); i++) {
    const venueDate = new Date(startDate);
    venueDate.setDate(venueDate.getDate() + (i * 3)); // Every 3 days
    
    const status = i % 2 === 0 ? 'confirmed' : 'potential';
    const date = status === 'confirmed' ? venueDate : null;
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venues[i].id,
        status,
        date,
        sequence: i + 1,
        notes: `${status} venue for dense tour`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  return tour;
}

/**
 * Create a tour with venues that are geographically distant
 */
async function createLongDistanceTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 150); // Start 150 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 60); // 60-day tour (longer for distances)
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Demo tour with long distances between venues',
      startDate,
      endDate,
      totalBudget: 350000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) return;
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Add venues that are likely to be geographically distant
  // We'll use venues from different parts of the array
  const venueIndices = [0, 5, 2, 4, 1, 3];
  
  for (let i = 0; i < venueIndices.length; i++) {
    const venue = venues[venueIndices[i]];
    
    // Every other venue is confirmed with a date (using simplified status system)
    const status = i % 2 === 0 ? 'confirmed' : 'potential';
    let date = null;
    
    if (status === 'confirmed') {
      date = new Date(startDate);
      date.setDate(date.getDate() + (i * 10)); // Every 10 days for confirmed venues
    }
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venue.id,
        status,
        date,
        sequence: i + 1,
        notes: `${status} venue for long-distance tour`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  return tour;
}

/**
 * Calculate and set initial optimization scores for tours
 * This queries the tour venues with their venue data, calculates the initial score,
 * and updates the tour record with this baseline score for comparison
 */
async function calculateAndSetInitialScores(tourIds: number[]) {
  if (!tourIds.length) {
    console.log("No tours to calculate scores for");
    return;
  }
  
  console.log(`Calculating initial scores for ${tourIds.length} tours...`);
  
  for (const tourId of tourIds) {
    try {
      // Get tour venues with venue data for this tour
      const tourVenuesWithVenueData = await db
        .select({
          tourVenue: tourVenues,
          venue: venues,
        })
        .from(tourVenues)
        .leftJoin(venues, eq(venues.id, tourVenues.venueId))
        .where(eq(tourVenues.tourId, tourId))
        .orderBy(tourVenues.sequence);
        
      if (!tourVenuesWithVenueData.length) {
        console.log(`No venues found for tour ID: ${tourId}, skipping`);
        continue;
      }
      
      // Format the data for the score calculation
      const venuesForScoring = tourVenuesWithVenueData.map(record => ({
        ...record.tourVenue,
        venue: record.venue
      }));
      
      // Calculate the initial score
      const { optimizationScore, totalDistance, totalTravelTime } = 
        calculateInitialTourScore(venuesForScoring);
      
      // Update the tour with the initial score
      await db
        .update(tours)
        .set({
          initialOptimizationScore: optimizationScore,
          initialTotalDistance: totalDistance,
          initialTravelTime: totalTravelTime,
          updatedAt: new Date()
        })
        .where(eq(tours.id, tourId));
      
      console.log(`Set initial score for tour ID ${tourId}: ${optimizationScore}/100`);
    } catch (error) {
      console.error(`Error calculating score for tour ID ${tourId}:`, error);
    }
  }
  
  console.log("Score calculation complete");
}

// Run the function
clearAndCreateDemoTours().then(() => {
  console.log("Finished");
  process.exit(0);
});