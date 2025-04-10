import { db } from './db';
import { artists, tours, tourVenues, venues } from '../shared/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Seed the database with tour data
 * This creates sample tours, tour venues, and related data
 */
async function seedTours() {
  console.log('Seeding tours data...');

  try {
    // Check if we already have tours
    const existingTours = await db.select().from(tours);
    
    if (existingTours.length > 0) {
      console.log(`Found ${existingTours.length} existing tours, skipping seed.`);
      return;
    }
    
    // Get some existing artists
    const existingArtists = await db.select().from(artists).limit(10);
    
    if (existingArtists.length === 0) {
      console.log('No artists found, please seed artists first.');
      return;
    }
    
    // Get existing venues
    const existingVenues = await db.select().from(venues).limit(20);
    
    if (existingVenues.length === 0) {
      console.log('No venues found, please seed venues first.');
      return;
    }
    
    // Create sample tours
    const tourData = [
      {
        name: 'Summer East Coast Tour 2025',
        artistId: existingArtists[0].id,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-07-15'),
        status: 'planning',
        description: 'A summer tour covering major venues on the East Coast',
        totalBudget: 150000,
        estimatedTravelDistance: 1250.5,
        estimatedTravelTime: 1440 * 5, // 5 days in minutes
        optimizationScore: 85
      },
      {
        name: 'Midwest Tour 2025',
        artistId: existingArtists[1].id,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-09-15'),
        status: 'planning',
        description: 'Tour covering major Midwest cities and venues',
        totalBudget: 120000,
        estimatedTravelDistance: 980.75,
        estimatedTravelTime: 1440 * 4, // 4 days in minutes
        optimizationScore: 78
      },
      {
        name: 'West Coast Fall Tour 2025',
        artistId: existingArtists[2].id,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-11-15'),
        status: 'booking',
        description: 'Intensive tour through West Coast venues',
        totalBudget: 180000,
        estimatedTravelDistance: 1540.25,
        estimatedTravelTime: 1440 * 6, // 6 days in minutes
        optimizationScore: 92
      }
    ];
    
    console.log(`Adding ${tourData.length} tours...`);
    
    // Insert tours
    for (const tour of tourData) {
      const [newTour] = await db.insert(tours).values(tour).returning();
      console.log(`Added tour: ${newTour.name}`);
      
      // Add tour venues (5-7 per tour)
      const venueCount = Math.floor(Math.random() * 3) + 5; // 5-7 venues
      const shuffledVenues = existingVenues.sort(() => Math.random() - 0.5).slice(0, venueCount);
      
      // We'll distribute venues over the tour date range
      const tourStartTime = new Date(tour.startDate).getTime();
      const tourEndTime = new Date(tour.endDate).getTime();
      const tourDuration = tourEndTime - tourStartTime;
      const daysBetweenShows = Math.floor(tourDuration / (venueCount * 24 * 60 * 60 * 1000));
      
      for (let i = 0; i < shuffledVenues.length; i++) {
        const venue = shuffledVenues[i];
        const showDate = new Date(tourStartTime + i * daysBetweenShows * 24 * 60 * 60 * 1000);
        
        // Calculate travel distance and time from previous (if not first venue)
        let travelDistance: number | null = null;
        let travelTime: number | null = null;
        
        if (i > 0) {
          const prevVenue = shuffledVenues[i - 1];
          // If both venues have coordinates, calculate distance
          if (prevVenue.latitude && prevVenue.longitude && venue.latitude && venue.longitude) {
            // Simple distance calculation for demo purposes
            travelDistance = Math.sqrt(
              Math.pow((venue.latitude - prevVenue.latitude) * 69.5, 2) + 
              Math.pow((venue.longitude - prevVenue.longitude) * 51.5, 2)
            ) * 0.621371; // Convert to miles
            
            // Rough estimate of travel time - 50 mph average speed
            travelTime = Math.floor((travelDistance / 50) * 60); // Minutes
          }
        }
        
        // Different statuses for venues to show different states
        const statuses = ['proposed', 'requested', 'confirmed'];
        const status = statuses[Math.floor(Math.random() * (i < 2 ? 3 : 2))]; // More confirmed for early shows
        
        await db.insert(tourVenues).values({
          tourId: newTour.id,
          venueId: venue.id,
          date: showDate,
          status: status,
          sequence: i + 1,
          travelDistanceFromPrevious: travelDistance,
          travelTimeFromPrevious: travelTime,
          notes: `${status === 'confirmed' ? 'Confirmed' : 'Pending'} show at ${venue.name}`
        });
        
        console.log(`  Added venue: ${venue.name} (${showDate.toISOString().split('T')[0]})`);
      }
    }
    
    console.log('Tour seeding completed successfully.');

  } catch (error) {
    console.error('Error seeding tours:', error);
  }
}

// Run the seed function
seedTours()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed tours:', error);
    process.exit(1);
  });