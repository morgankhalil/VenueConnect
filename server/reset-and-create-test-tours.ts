import { db } from './db';
import { tours, tourVenues, venues, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateDistance, estimateTravelTime } from '../shared/utils/geo';

/**
 * Reset tours database and create three specialized test tours
 */
async function resetAndCreateTestTours() {
  try {
    console.log("Starting database reset...");
    
    // Step 1: Delete all tour_venues first to avoid foreign key constraint errors
    console.log("Deleting tour venues...");
    await db.delete(tourVenues).execute();
    console.log("All tour venues deleted successfully.");
    
    // Step 2: Delete all tours
    console.log("Deleting tours...");
    await db.delete(tours).execute();
    console.log("All tours deleted successfully.");
    
    // Step 3: Create test tours
    console.log("Creating new test tours...");
    await createSpecializedTestTours();
    console.log("Test tours created successfully.");
    
    console.log("Database reset and test tour creation completed successfully!");
    
  } catch (error) {
    console.error("Error resetting database and creating test tours:", error);
    throw error;
  }
}

/**
 * Create three specialized test tours
 */
async function createSpecializedTestTours() {
  try {
    console.log("Starting to create specialized test tours...");
    
    // Get available artists
    const artistResults = await db
      .select()
      .from(artists)
      .limit(3);
    
    if (!artistResults.length) {
      console.error("No artists found in the database");
      return;
    }
    
    // Get venues with coordinates
    const venueResults = await db
      .select()
      .from(venues)
      .where(
        eq(venues.latitude, venues.latitude) // Filter for non-null latitudes
      )
      .limit(40); // Get more venues for complex tours
    
    if (venueResults.length < 10) {
      console.error("Not enough venues with coordinates in the database");
      return;
    }
    
    console.log(`Found ${venueResults.length} venues with coordinates for test tours`);
    
    // Create three different test tours
    const createdTourIds = [];
    
    // 1. Extreme Distance Tour - zigzag across the country for maximum inefficiency
    console.log("Creating Extreme Distance Test Tour...");
    const extremeDistanceTour = await createExtremeDistanceTour(artistResults[0], venueResults);
    if (extremeDistanceTour) createdTourIds.push(extremeDistanceTour.id);
    
    // 2. Large Dataset Tour
    console.log("Creating Large Dataset Test Tour...");
    const largeDatasetTour = await createLargeDatasetTour(artistResults[1], venueResults);
    if (largeDatasetTour) createdTourIds.push(largeDatasetTour.id);
    
    // 3. Close Proximity Tour
    console.log("Creating Close Proximity Test Tour...");
    const closeProximityTour = await createCloseProximityTour(artistResults[2], venueResults);
    if (closeProximityTour) createdTourIds.push(closeProximityTour.id);
    
    // Calculate and set initial optimization scores for all tours
    if (createdTourIds.length > 0) {
      console.log("Calculating initial optimization scores...");
      await calculateAndSetInitialScores(createdTourIds);
    }
    
    console.log(`Successfully created ${createdTourIds.length} specialized test tours`);
    return createdTourIds;
  } catch (error) {
    console.error("Error creating test tours:", error);
    throw error;
  }
}

/**
 * Create a tour with venues in a zigzag pattern to maximize travel inefficiency
 */
async function createExtremeDistanceTour(artist: any, allVenues: any[]) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30); // Start 30 days from now
  
  // Sort venues by longitude (west to east)
  const sortedByLongitude = [...allVenues].sort((a, b) => 
    (a.longitude || 0) - (b.longitude || 0)
  );
  
  // Create zigzag pattern by alternating between west and east
  const zigzagVenues = [];
  const westThird = Math.floor(sortedByLongitude.length / 3);
  const eastThird = Math.floor(2 * sortedByLongitude.length / 3);
  
  // Take 3 from west, 3 from east for maximum distance
  if (sortedByLongitude.length >= 6) {
    zigzagVenues.push(sortedByLongitude[0]); // westmost
    zigzagVenues.push(sortedByLongitude[sortedByLongitude.length - 1]); // eastmost
    zigzagVenues.push(sortedByLongitude[Math.floor(westThird / 2)]); // middle of west third
    zigzagVenues.push(sortedByLongitude[sortedByLongitude.length - Math.floor(westThird / 2)]); // middle of east third
    zigzagVenues.push(sortedByLongitude[westThird]); // end of west third
    zigzagVenues.push(sortedByLongitude[eastThird]); // start of east third
  }
  
  if (zigzagVenues.length < 6) {
    console.error("Not enough venues for zigzag pattern");
    return null;
  }
  
  // Create tour
  const [tourResult] = await db.insert(tours).values({
    name: "Extreme Distance Test Tour",
    artistId: artist.id,
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "planning",
    type: "headline",
    totalVenues: zigzagVenues.length,
    confirmedVenues: 2,
    potentialVenues: zigzagVenues.length - 2,
    bookedVenues: 0,
    budget: 50000,
    notes: "This tour has an extremely inefficient zigzag pattern across regions to test optimization capabilities",
  }).returning();
  
  // Add venues with dates in zigzag order to maximize inefficiency
  console.log(`Adding ${zigzagVenues.length} venues to extreme distance tour...`);
  
  for (let i = 0; i < zigzagVenues.length; i++) {
    const venue = zigzagVenues[i];
    const date = new Date(startDate);
    date.setDate(date.getDate() + (i * 3)); // Every 3 days
    
    // First and last venues are confirmed, others are potential
    const status = (i === 0 || i === zigzagVenues.length - 1) ? "confirmed" : "potential";
    
    await db.insert(tourVenues).values({
      tourId: tourResult.id,
      venueId: venue.id,
      date: date.toISOString().split('T')[0],
      status: status,
      sequence: i + 1,
      notes: status === "confirmed" ? "Fixed point in tour" : "Venue available for optimization",
      confirmedCapacity: venue.capacity,
      guaranteeAmount: Math.floor(Math.random() * 2000) + 1000,
      expenses: Math.floor(Math.random() * 500) + 200,
      statusUpdatedAt: new Date()
    });
  }
  
  console.log(`Created extreme distance tour with ID: ${tourResult.id}`);
  return tourResult;
}

/**
 * Create a tour with many venues to test performance with large datasets
 */
async function createLargeDatasetTour(artist: any, allVenues: any[]) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 90); // Start 90 days from now
  
  // Get as many venues as we can, up to 30
  const largeDatasetVenues = allVenues.slice(0, Math.min(30, allVenues.length));
  
  if (largeDatasetVenues.length < 15) {
    console.error("Not enough venues for large dataset tour");
    return null;
  }
  
  // Create tour
  const [tourResult] = await db.insert(tours).values({
    name: "Large Dataset Test Tour",
    artistId: artist.id,
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "planning",
    type: "headline",
    totalVenues: largeDatasetVenues.length,
    confirmedVenues: 2,
    potentialVenues: largeDatasetVenues.length - 2,
    bookedVenues: 0,
    budget: 150000,
    notes: "This tour has many venues to test optimization performance with large datasets",
  }).returning();
  
  // Add venues with dates in sequence
  console.log(`Adding ${largeDatasetVenues.length} venues to large dataset tour...`);
  
  for (let i = 0; i < largeDatasetVenues.length; i++) {
    const venue = largeDatasetVenues[i];
    const date = new Date(startDate);
    date.setDate(date.getDate() + (i * 2)); // Every 2 days
    
    // First and last venues are confirmed, others are potential
    const status = (i === 0 || i === largeDatasetVenues.length - 1) ? "confirmed" : "potential";
    
    await db.insert(tourVenues).values({
      tourId: tourResult.id,
      venueId: venue.id,
      date: date.toISOString().split('T')[0],
      status: status,
      sequence: i + 1,
      notes: status === "confirmed" ? "Fixed point in tour" : "Venue available for optimization",
      confirmedCapacity: venue.capacity,
      guaranteeAmount: Math.floor(Math.random() * 2000) + 1000,
      expenses: Math.floor(Math.random() * 500) + 200,
      statusUpdatedAt: new Date()
    });
  }
  
  console.log(`Created large dataset tour with ID: ${tourResult.id}`);
  return tourResult;
}

/**
 * Create a tour with venues in close proximity to test optimization for dense areas
 */
async function createCloseProximityTour(artist: any, allVenues: any[]) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 120); // Start 120 days from now
  
  // Group venues by city
  const cityGroups: Record<string, any[]> = {};
  allVenues.forEach(venue => {
    if (!venue.city) return;
    
    if (!cityGroups[venue.city]) {
      cityGroups[venue.city] = [];
    }
    cityGroups[venue.city].push(venue);
  });
  
  // Find the city with the most venues
  let bestCity = '';
  let bestCityCount = 0;
  let bestCityVenues: any[] = [];
  
  Object.entries(cityGroups).forEach(([city, venues]) => {
    if (venues.length > bestCityCount) {
      bestCity = city;
      bestCityCount = venues.length;
      bestCityVenues = venues;
    }
  });
  
  if (bestCityCount < 4) {
    console.error("No city with enough venues for close proximity tour");
    return null;
  }
  
  // Use venues from the same city for close proximity test (max 10)
  const closeProximityVenues = bestCityVenues.slice(0, Math.min(10, bestCityVenues.length));
  
  // Create tour
  const [tourResult] = await db.insert(tours).values({
    name: `Close Proximity Test Tour (${bestCity})`,
    artistId: artist.id,
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "planning",
    type: "club",
    totalVenues: closeProximityVenues.length,
    confirmedVenues: 2,
    potentialVenues: closeProximityVenues.length - 2,
    bookedVenues: 0,
    budget: 15000,
    notes: `This tour tests venues in close proximity within ${bestCity}`,
  }).returning();
  
  // Add venues with dates in sequence
  console.log(`Adding ${closeProximityVenues.length} venues to close proximity tour...`);
  
  for (let i = 0; i < closeProximityVenues.length; i++) {
    const venue = closeProximityVenues[i];
    const date = new Date(startDate);
    date.setDate(date.getDate() + i); // Every day
    
    // First and last venues are confirmed, others are potential
    const status = (i === 0 || i === closeProximityVenues.length - 1) ? "confirmed" : "potential";
    
    await db.insert(tourVenues).values({
      tourId: tourResult.id,
      venueId: venue.id,
      date: date.toISOString().split('T')[0],
      status: status,
      sequence: i + 1,
      notes: status === "confirmed" ? "Fixed point in tour" : "Venue available for optimization",
      confirmedCapacity: venue.capacity,
      guaranteeAmount: Math.floor(Math.random() * 1000) + 500,
      expenses: Math.floor(Math.random() * 300) + 100,
      statusUpdatedAt: new Date()
    });
  }
  
  console.log(`Created close proximity tour with ID: ${tourResult.id}`);
  return tourResult;
}

/**
 * Calculate and set initial optimization scores for tours
 */
async function calculateAndSetInitialScores(tourIds: number[]) {
  console.log(`Calculating initial scores for ${tourIds.length} tours...`);
  
  for (const tourId of tourIds) {
    try {
      // Get all venues for this tour with their venue data
      const tourVenueResults = await db
        .select({
          tourVenue: tourVenues,
          venue: venues
        })
        .from(tourVenues)
        .innerJoin(venues, eq(tourVenues.venueId, venues.id))
        .where(eq(tourVenues.tourId, tourId))
        .orderBy(tourVenues.sequence);
      
      if (tourVenueResults.length < 2) {
        console.log(`Tour ${tourId} doesn't have enough venues with coordinates to calculate a score`);
        continue;
      }
      
      // Format the data for the scoring function
      const formattedData = tourVenueResults.map(r => ({
        ...r.tourVenue,
        venue: r.venue
      }));
      
      // Calculate the initial score
      const { optimizationScore, totalDistance, totalTravelTime } = calculateInitialTourScore(formattedData);
      
      // Update the tour with the initial score
      await db
        .update(tours)
        .set({
          initialOptimizationScore: optimizationScore,
          initialTotalDistance: totalDistance,
          initialTravelTime: totalTravelTime
        })
        .where(eq(tours.id, tourId));
      
      console.log(`Set initial score for tour ID ${tourId}: ${optimizationScore}/100, distance: ${totalDistance} km, time: ${Math.round(totalTravelTime)} minutes`);
    } catch (error) {
      console.error(`Error calculating score for tour ${tourId}:`, error);
    }
  }
  
  console.log("Score calculation complete");
}

/**
 * Calculate initial optimization score for a tour
 */
function calculateInitialTourScore(
  tourVenues: any[]
): { 
  optimizationScore: number, 
  totalDistance: number, 
  totalTravelTime: number
} {
  // Filter venues with coordinates and sort by date or sequence
  const venuesWithCoordinates = tourVenues
    .filter(tv => tv.venue && tv.venue.latitude && tv.venue.longitude)
    .sort((a, b) => {
      // Sort by date if available, otherwise by sequence
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return (a.sequence || 0) - (b.sequence || 0);
    });

  // If we don't have at least 2 venues with coordinates, we can't calculate a score
  if (venuesWithCoordinates.length < 2) {
    return {
      optimizationScore: 40, // Base score for unoptimized tours with minimal data
      totalDistance: 0,
      totalTravelTime: 0
    };
  }

  // Calculate total distance and travel time
  let totalDistance = 0;
  let totalTravelTime = 0;
  
  // Process consecutive pairs to calculate distance and travel time
  for (let i = 0; i < venuesWithCoordinates.length - 1; i++) {
    const current = venuesWithCoordinates[i];
    const next = venuesWithCoordinates[i + 1];
    
    if (current.venue && next.venue && 
        current.venue.latitude && current.venue.longitude && 
        next.venue.latitude && next.venue.longitude) {
      // Calculate distance between venues
      const distance = calculateDistance(
        current.venue.latitude,
        current.venue.longitude,
        next.venue.latitude,
        next.venue.longitude
      );
      
      totalDistance += distance;
      
      // Estimate travel time (in minutes)
      const travelTime = estimateTravelTime(distance);
      totalTravelTime += travelTime;
    }
  }
  
  // Calculate the optimization score
  // Base formula: 100 - factors that reduce score
  // For an unoptimized route, we start with a base score of 50
  let optimizationScore = 50;
  
  // Adjust if the tour is very efficient already or very inefficient
  if (venuesWithCoordinates.length > 15 && totalDistance > 20000) {
    optimizationScore = 50; // Large inefficient tour
  } else if (venuesWithCoordinates.length > 10 && totalDistance > 10000) {
    optimizationScore = 50; // Medium inefficient tour
  } else if (totalDistance < 50) {
    optimizationScore = 70; // Very short distances, already somewhat optimized
  }
  
  return {
    optimizationScore,
    totalDistance,
    totalTravelTime
  };
}

// Execute the function directly when script is run
resetAndCreateTestTours()
  .then(() => {
    console.log("Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });