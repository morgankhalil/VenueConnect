/**
 * Create a demo tour specifically to showcase AI optimization
 * This tour will have a mix of confirmed and potential venues in different geographic areas
 * to demonstrate the distance optimization and date scheduling capabilities
 */

import { db } from './db';
import { artists, tours, tourVenues, venues } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateDistance, calculateTotalDistance, estimateTravelTime } from './utils/distance';

async function createAiOptimizationDemoTour() {
  console.log("Creating AI Optimization Demo Tour...");
  
  // Get or create demo artist
  let demoArtist = await db.query.artists.findFirst({
    where: eq(artists.name, "Demo AI Band")
  });
  
  if (!demoArtist) {
    const [newArtist] = await db.insert(artists)
      .values({
        name: "Demo AI Band",
        genres: ["rock", "electronic"],
        bandsintownId: null,
        songkickId: null,
        spotifyId: null,
        imageUrl: null,
        websiteUrl: null,
        description: "Demo artist for AI optimization showcase"
      })
      .returning();
    
    demoArtist = newArtist;
    console.log("Created demo artist:", demoArtist.name);
  }
  
  // Create a tour with a date range
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 2); // Two month tour
  
  const [demoTour] = await db.insert(tours)
    .values({
      name: `AI Optimization Demo Tour ${startDate.toISOString().split('T')[0]}`,
      artistId: demoArtist.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "planning",
      description: "This tour is designed to showcase the AI optimization features",
      marketFocus: "mixed",
      venueTypes: ["small", "medium"],
      targetAttendance: 500,
      isPublic: true,
      estimatedBudget: 50000
    })
    .returning();
  
  console.log("Created demo tour:", demoTour.name);
  
  // Get venues or create them if needed
  const venueData = [
    { name: "West Coast Venue", city: "Los Angeles", region: "CA", country: "USA", latitude: 34.0522, longitude: -118.2437, marketCategory: "primary" as const, capacity: 1200, venueType: "club" as const, capacityCategory: "medium" as const},
    { name: "Midwest Venue", city: "Chicago", region: "IL", country: "USA", latitude: 41.8781, longitude: -87.6298, marketCategory: "primary" as const, capacity: 800, venueType: "club" as const, capacityCategory: "medium" as const },
    { name: "East Coast Venue", city: "New York", region: "NY", country: "USA", latitude: 40.7128, longitude: -74.0060, marketCategory: "primary" as const, capacity: 1500, venueType: "theater" as const, capacityCategory: "large" as const },
    { name: "Southern Venue", city: "Austin", region: "TX", country: "USA", latitude: 30.2672, longitude: -97.7431, marketCategory: "secondary" as const, capacity: 600, venueType: "bar" as const, capacityCategory: "small" as const },
    { name: "Northwest Venue", city: "Seattle", region: "WA", country: "USA", latitude: 47.6062, longitude: -122.3321, marketCategory: "secondary" as const, capacity: 750, venueType: "club" as const, capacityCategory: "small" as const },
    { name: "Southeast Venue", city: "Atlanta", region: "GA", country: "USA", latitude: 33.7490, longitude: -84.3880, marketCategory: "secondary" as const, capacity: 850, venueType: "club" as const, capacityCategory: "medium" as const },
    { name: "Northeast Venue", city: "Boston", region: "MA", country: "USA", latitude: 42.3601, longitude: -71.0589, marketCategory: "secondary" as const, capacity: 700, venueType: "bar" as const, capacityCategory: "small" as const },
  ];
  
  const venueEntities = [];
  
  // Create or find venues
  for (const venue of venueData) {
    let existingVenue = await db.query.venues.findFirst({
      where: eq(venues.name, venue.name)
    });
    
    if (!existingVenue) {
      const [newVenue] = await db.insert(venues)
        .values({
          name: venue.name,
          city: venue.city,
          region: venue.region,
          country: venue.country,
          latitude: venue.latitude,
          longitude: venue.longitude,
          marketCategory: venue.marketCategory,
          capacity: venue.capacity,
          venueType: venue.venueType,
          capacityCategory: venue.capacityCategory,
          website: null,
          contactEmail: null,
          contactPhone: null,
          bookingLeadTime: 60,
          imageUrl: null,
          description: `Demo venue for AI optimization in ${venue.city}`,
          address: null,
          bandsintownId: null,
          songkickId: null
        })
        .returning();
      
      existingVenue = newVenue;
      console.log("Created venue:", existingVenue.name);
    }
    
    venueEntities.push(existingVenue);
  }
  
  // Create tour venues with a mix of confirmed and potential
  // First, add two confirmed venues at the beginning and end
  const firstDate = new Date(startDate);
  const lastDate = new Date(endDate);
  lastDate.setDate(lastDate.getDate() - 5); // 5 days before end
  
  // Add confirmed venues
  await db.insert(tourVenues)
    .values({
      tourId: demoTour.id,
      venueId: venueEntities[0].id, // West Coast venue
      date: firstDate.toISOString(),
      status: "confirmed",
      isFixed: true,
      sequence: 0
    });
  
  await db.insert(tourVenues)
    .values({
      tourId: demoTour.id,
      venueId: venueEntities[2].id, // East Coast venue
      date: lastDate.toISOString(),
      status: "confirmed",
      isFixed: true,
      sequence: 6
    });
  
  console.log("Added confirmed venues at beginning and end");
  
  // Add potential venues in between with no dates
  let sequence = 1;
  for (let i = 1; i < venueEntities.length; i++) {
    // Skip the East Coast venue which is already confirmed
    if (i === 2) continue;
    
    await db.insert(tourVenues)
      .values({
        tourId: demoTour.id,
        venueId: venueEntities[i].id,
        date: null, // No date set
        status: "potential",
        isFixed: false,
        sequence: sequence++
      });
  }
  
  console.log("Added potential venues");
  
  // Calculate and set initial metrics
  const tourVenuesList = await db.query.tourVenues.findMany({
    where: eq(tourVenues.tourId, demoTour.id),
    with: {
      venue: true
    }
  });
  
  // Extract venues with coordinates
  const venuesWithCoords = tourVenuesList
    .filter(tv => tv.venue.latitude && tv.venue.longitude)
    .map(tv => ({
      id: tv.id,
      latitude: tv.venue.latitude,
      longitude: tv.venue.longitude
    }));
  
  // Calculate baseline metrics for the tour
  const totalDistance = calculateTotalDistance(venuesWithCoords);
  const totalTravelTime = estimateTravelTime(totalDistance);
  
  // Update the tour with initial metrics
  await db.update(tours)
    .set({
      initialTotalDistance: totalDistance,
      initialTravelTime: totalTravelTime,
      optimizationScore: 0, // No optimization applied yet
      estimatedTravelDistance: totalDistance,
      estimatedTravelTime: totalTravelTime
    })
    .where(eq(tours.id, demoTour.id));
  
  console.log("Set initial metrics:");
  console.log(`- Total Distance: ${totalDistance} km`);
  console.log(`- Total Travel Time: ${totalTravelTime} minutes`);
  
  console.log(`\nAI Optimization Demo Tour created with ID: ${demoTour.id}`);
  console.log("Tour has 2 confirmed venues and 5 potential venues across the United States");
  console.log("Run the following to view the tour details:");
  console.log(`  GET /api/tours/${demoTour.id}`);
  
  return demoTour.id;
}

// Run the function when script is executed directly
// In ESM context, we can't use require.main === module
// If this file is imported, the following code won't execute immediately
createAiOptimizationDemoTour()
  .then(() => {
    console.log("Demo tour creation complete");
  })
  .catch(error => {
    console.error("Error creating demo tour:", error);
  });

export { createAiOptimizationDemoTour };