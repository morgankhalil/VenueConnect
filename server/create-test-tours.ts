import { db } from './db';
import { tours, tourVenues, venues, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateDistance, estimateTravelTime } from '../shared/utils/geo';

/**
 * Calculate initial optimization score for a tour
 * This is a simplified version of the function in initial-tour-score.ts
 * with direct geo utility imports to avoid circular dependencies
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
        Number(current.venue.latitude),
        Number(current.venue.longitude),
        Number(next.venue.latitude),
        Number(next.venue.longitude)
      );
      
      // Add to total distance
      totalDistance += distance;
      
      // Calculate travel time
      const travelTime = estimateTravelTime(distance);
      totalTravelTime += travelTime;
    }
  }
  
  // Calculate the initial score (unoptimized)
  // Start with a base score and apply distance penalties
  const baseScore = 70; // Typical unoptimized tour starts around 70/100
  const distancePenalty = Math.min(20, totalDistance / 150); // Distance penalty
  
  // Calculate final score
  const optimizationScore = Math.max(30, Math.round(baseScore - distancePenalty));
  
  return {
    optimizationScore,
    totalDistance,
    totalTravelTime
  };
}

/**
 * Create specialized test tours for optimization testing
 * This script creates tours with different edge cases to validate optimization functionality
 */
async function createTestTours() {
  try {
    console.log("Starting to create specialized test tours...");
    
    // Get available artists
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
        eq(venues.latitude, venues.latitude) // Filter for non-null latitudes
      )
      .limit(40); // Get more venues for complex tours
    
    if (venueResults.length < 10) {
      console.error("Not enough venues with coordinates in the database");
      return;
    }
    
    console.log(`Found ${venueResults.length} venues with coordinates for test tours`);
    
    // Create an array to track tour IDs for later optimization score setting
    const createdTourIds = [];
    
    // 1. Distance-optimized tour - venues very far from each other
    const westCoastVenues = venueResults.filter(v => 
      v.longitude < -110 && v.longitude > -130 && 
      v.latitude > 30 && v.latitude < 50
    );
    
    const eastCoastVenues = venueResults.filter(v => 
      v.longitude > -85 && v.longitude < -70 && 
      v.latitude > 30 && v.latitude < 45
    );
    
    const midwestVenues = venueResults.filter(v => 
      v.longitude > -110 && v.longitude < -85 &&
      v.latitude > 35 && v.latitude < 50
    );
    
    const southernVenues = venueResults.filter(v => 
      v.latitude < 35 && v.latitude > 25 &&
      v.longitude > -105 && v.longitude < -75
    );
    
    // Gather venues in an inefficient zigzag pattern
    let zigzagVenues = [];
    if (westCoastVenues.length > 0) zigzagVenues.push(westCoastVenues[0]);
    if (eastCoastVenues.length > 0) zigzagVenues.push(eastCoastVenues[0]);
    if (midwestVenues.length > 0) zigzagVenues.push(midwestVenues[0]);
    if (southernVenues.length > 0) zigzagVenues.push(southernVenues[0]);
    if (westCoastVenues.length > 1) zigzagVenues.push(westCoastVenues[1]);
    if (eastCoastVenues.length > 1) zigzagVenues.push(eastCoastVenues[1]);
    
    // Fallback if we don't have enough venues with geographic diversity
    if (zigzagVenues.length < 6) {
      // Sort venues by longitude (west to east)
      const sortedByLongitude = [...venueResults].sort((a, b) => a.longitude - b.longitude);
      
      // Pick venues from different parts of the array to ensure geographic diversity
      zigzagVenues = [
        sortedByLongitude[0],                                     // Westmost
        sortedByLongitude[sortedByLongitude.length - 1],          // Eastmost
        sortedByLongitude[Math.floor(sortedByLongitude.length / 2)], // Middle
        sortedByLongitude[Math.floor(sortedByLongitude.length / 4)], // 1/4
        sortedByLongitude[Math.floor(3 * sortedByLongitude.length / 4)], // 3/4
        sortedByLongitude[Math.floor(sortedByLongitude.length / 6)]  // 1/6
      ];
    }
    
    if (zigzagVenues.length >= 6) {
      const distanceTestTour = await createZigzagDistanceTour(
        artistResults[0], 
        zigzagVenues, 
        "Extreme Distance Test Tour"
      );
      
      if (distanceTestTour) createdTourIds.push(distanceTestTour.id);
    }
    
    // 2. Large dataset tour - many venues for performance testing
    let largeDatasetVenues = venueResults.slice(0, Math.min(30, venueResults.length));
    if (largeDatasetVenues.length >= 15) {
      const largeDatasetTour = await createLargeDatasetTour(
        artistResults[1],
        largeDatasetVenues,
        "Large Dataset Test Tour"
      );
      
      if (largeDatasetTour) createdTourIds.push(largeDatasetTour.id);
    }
    
    // 3. Close proximity venue tour - venues very close to each other
    // Find venues that are in the same city
    const cityGroups: Record<string, typeof venueResults[0][]> = {};
    venueResults.forEach(venue => {
      if (!venue.city) return;
      
      if (!cityGroups[venue.city]) {
        cityGroups[venue.city] = [];
      }
      cityGroups[venue.city].push(venue);
    });
    
    // Find the city with the most venues
    let bestCity = '';
    let bestCityCount = 0;
    
    Object.entries(cityGroups).forEach(([city, venues]) => {
      if (venues.length > bestCityCount) {
        bestCity = city;
        bestCityCount = venues.length;
      }
    });
    
    if (bestCityCount >= 4) {
      // Use venues from the same city for close proximity test
      const proximityTestTour = await createCloseProximityTour(
        artistResults[2],
        cityGroups[bestCity].slice(0, Math.min(10, cityGroups[bestCity].length)),
        `Close Proximity Test Tour (${bestCity})`
      );
      
      if (proximityTestTour) createdTourIds.push(proximityTestTour.id);
    }
    
    // Calculate and set initial optimization scores for all created tours
    if (createdTourIds.length > 0) {
      console.log("Calculating initial optimization scores...");
      await calculateAndSetInitialScores(createdTourIds);
    }
    
    console.log(`Successfully created ${createdTourIds.length} specialized test tours`);
    
  } catch (error) {
    console.error("Error creating test tours:", error);
  }
}

/**
 * Create a tour with venues in a zigzag pattern to maximize the travel inefficiency
 * This will create a great demonstration case for optimization
 */
async function createZigzagDistanceTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 30); // Start 30 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 45); // 45-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Complex tour with extremely inefficient initial routing',
      startDate,
      endDate,
      totalBudget: 350000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) {
    console.error("Failed to create zigzag distance tour");
    return null;
  }
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Add venues in a zigzag pattern
  // Intentionally alternate between east and west to create an inefficient route
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    
    // More confirmed venues at the beginning and end, potentials in the middle
    let status = 'potential';
    if (i === 0 || i === venues.length - 1 || i === 1 || i === venues.length - 2) {
      status = 'confirmed';
    } else if (i === 2 || i === venues.length - 3) {
      status = 'hold';
    }
    
    // Set dates for confirmed venues only
    let date = null;
    if (status === 'confirmed') {
      date = new Date(startDate);
      date.setDate(date.getDate() + (i * 7)); // Every 7 days for confirmed venues
    }
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venue.id,
        status,
        date,
        sequence: i,
        notes: `Venue ${i+1} in zigzag test tour (${status})`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  console.log(`Added ${venues.length} venues to zigzag distance tour`);
  return tour;
}

/**
 * Create a tour with many venues to test performance with large datasets
 */
async function createLargeDatasetTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 90); // Start 90 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 100); // 100-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Large tour with many venues to test optimization performance',
      startDate,
      endDate,
      totalBudget: 500000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) {
    console.error("Failed to create large dataset tour");
    return null;
  }
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Add many venues with a mix of statuses
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    
    // Mix of statuses 
    let status: string;
    if (i % 5 === 0) {
      status = 'confirmed';
    } else if (i % 5 === 1) {
      status = 'hold';
    } else {
      status = 'potential';
    }
    
    // Set dates for confirmed venues only
    let date = null;
    if (status === 'confirmed') {
      date = new Date(startDate);
      date.setDate(date.getDate() + (i * 3)); // Every 3 days for confirmed venues
    }
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venue.id,
        status,
        date,
        sequence: i,
        notes: `Venue ${i+1} in large dataset test (${status})`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  console.log(`Added ${venues.length} venues to large dataset tour`);
  return tour;
}

/**
 * Create a tour with venues in close proximity to test optimization for dense areas
 */
async function createCloseProximityTour(artist: any, venues: any[], name: string) {
  // Set up dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 120); // Start 120 days from now
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 10); // 10-day tour
  
  // Create tour
  const tourResult = await db
    .insert(tours)
    .values({
      name,
      artistId: artist.id,
      status: 'planning',
      description: 'Tour with venues in close proximity to test optimization in dense areas',
      startDate,
      endDate,
      totalBudget: 100000,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  
  if (!tourResult.length) {
    console.error("Failed to create close proximity tour");
    return null;
  }
  
  const tour = tourResult[0];
  console.log(`Created tour: ${tour.name} (ID: ${tour.id})`);
  
  // Add venues with close proximity
  // Mix up the order to test optimization within a small geographic area
  const shuffledVenues = [...venues].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < shuffledVenues.length; i++) {
    const venue = shuffledVenues[i];
    
    // First and last are confirmed
    let status = 'potential';
    if (i === 0 || i === shuffledVenues.length - 1) {
      status = 'confirmed';
    }
    
    // Set close dates for all venues
    let date = null;
    if (status === 'confirmed') {
      date = new Date(startDate);
      date.setDate(date.getDate() + i); // One venue per day for this tight schedule
    }
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: venue.id,
        status,
        date,
        sequence: i,
        notes: `Venue ${i+1} in proximity test tour (${status})`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  console.log(`Added ${venues.length} venues to close proximity tour`);
  return tour;
}

/**
 * Calculate and set initial optimization scores for tours
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
          initialTravelTime: totalTravelTime ?? 0,
          updatedAt: new Date()
        })
        .where(eq(tours.id, tourId));
      
      console.log(`Set initial score for tour ID ${tourId}: ${optimizationScore}/100, distance: ${totalDistance} km, time: ${totalTravelTime} minutes`);
    } catch (error) {
      console.error(`Error calculating score for tour ID ${tourId}:`, error);
    }
  }
  
  console.log("Score calculation complete");
}

// Execute the function if this script is run directly
if (require.main === module) {
  createTestTours().then(() => {
    console.log("Test tour creation completed");
    process.exit(0);
  }).catch(err => {
    console.error("Error in test tour creation:", err);
    process.exit(1);
  });
}

export { createTestTours };