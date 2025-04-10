import { db } from './db';
import { artists, tours, tourVenues, venues } from '../shared/schema';
import { eq, or, sql, and, desc } from 'drizzle-orm';

/**
 * Seed database with tour data for specific venues
 * This script allows you to specify exactly which venues to include in your tours
 * 
 * Usage: 
 * npx tsx server/seed-specific-venues.ts
 */

// Array of venue names to include in the tours
// These are specific venues that will be included in the generated tours
const TARGET_VENUES = [
  // East Coast Tour
  'The Bowery Ballroom',
  'Brooklyn Steel',
  'The 9:30 Club',
  
  // Midwest/Central Tour  
  'First Avenue',
  'The Ryman Auditorium',
  'Lincoln Hall',
  
  // West Coast Tour
  'The Troubadour',
  'The Fillmore',
  'The Independent',
  'Red Rocks Amphitheatre'
];

// Artist names to create if they don't exist
const ARTIST_DATA = [
  {
    name: 'The Midnight',
    genres: ['electronic', 'rock'] as any,
    description: 'Synthwave band with nostalgic 80s influenced sound',
    popularity: 75
  },
  {
    name: 'Khruangbin',
    genres: ['indie', 'world'] as any, 
    description: 'Psychedelic trio blending global musical influences',
    popularity: 82
  },
  {
    name: 'Japanese Breakfast',
    genres: ['indie', 'pop'] as any,
    description: 'Indie pop project of musician Michelle Zauner',
    popularity: 78
  }
];

/**
 * Main function to seed tours with specific venues
 */
async function seedSpecificVenues() {
  console.log('Starting specific venue tour seeding...');

  try {
    // 1. Find or create artists
    const artistIds = await ensureArtistsExist();
    if (artistIds.length === 0) {
      console.error('Failed to create artists');
      return;
    }
    
    // 2. Find the specified venues
    const targetVenues = await findTargetVenues();
    if (targetVenues.length === 0) {
      console.error('None of the specified venues were found in the database');
      return;
    }
    
    console.log(`Found ${targetVenues.length} venues for tour creation`);
    targetVenues.forEach(venue => {
      console.log(`- ${venue.name} (ID: ${venue.id})`);
    });
    
    // 3. Create tours using these specific venues
    await createToursWithSpecificVenues(artistIds, targetVenues);
    
    console.log('Tour seeding with specific venues completed successfully!');
  } catch (error) {
    console.error('Error during specific venue seeding:', error);
  }
}

/**
 * Ensure artists exist, create them if they don't
 */
async function ensureArtistsExist(): Promise<number[]> {
  const artistIds: number[] = [];
  
  for (const artistData of ARTIST_DATA) {
    // Check if artist exists
    const existingArtist = await db.select()
      .from(artists)
      .where(eq(artists.name, artistData.name))
      .limit(1);
    
    if (existingArtist.length > 0) {
      console.log(`Artist already exists: ${artistData.name} (ID: ${existingArtist[0].id})`);
      artistIds.push(existingArtist[0].id);
    } else {
      // Create the artist
      const [newArtist] = await db.insert(artists).values({
        name: artistData.name,
        genres: artistData.genres,
        popularity: artistData.popularity,
        description: artistData.description,
        imageUrl: null,
        websiteUrl: null
      }).returning();
      
      console.log(`Created new artist: ${newArtist.name} (ID: ${newArtist.id})`);
      artistIds.push(newArtist.id);
    }
  }
  
  return artistIds;
}

/**
 * Find the target venues in the database
 */
async function findTargetVenues() {
  // Create an array of OR conditions for venue names
  const conditions = TARGET_VENUES.map(venueName => 
    eq(venues.name, venueName)
  );
  
  // Query for venues with these names
  const foundVenues = await db.select()
    .from(venues)
    .where(or(...conditions));
  
  return foundVenues;
}

/**
 * Create tours using the specified venues
 */
async function createToursWithSpecificVenues(artistIds: number[], venueList: any[]) {
  // Create a tour for each artist
  for (let i = 0; i < artistIds.length; i++) {
    const artistId = artistIds[i];
    
    // Get artist info for the name
    const artist = await db.select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    
    if (!artist.length) continue;
    
    // Create tour data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 30); // Start 30 days from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + venueList.length * 3 + 5); // 3 days between venues plus 5 days buffer
    
    const tourName = `${artist[0].name} ${startDate.getFullYear()} Tour`;
    
    // Calculate estimated travel metrics between venues
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let j = 1; j < venueList.length; j++) {
      const prevVenue = venueList[j-1];
      const currentVenue = venueList[j];
      
      if (prevVenue.latitude && prevVenue.longitude && 
          currentVenue.latitude && currentVenue.longitude) {
        // Calculate distance in miles
        const distance = calculateDistance(
          prevVenue.latitude, prevVenue.longitude,
          currentVenue.latitude, currentVenue.longitude
        );
        
        totalDistance += distance;
        // Rough estimate of travel time - 50 mph average
        totalTime += Math.floor((distance / 50) * 60); // minutes
      }
    }
    
    // Format dates as strings in YYYY-MM-DD format
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const updatedAtStr = new Date().toISOString();
    
    // Insert the tour
    const [newTour] = await db.insert(tours).values({
      name: tourName,
      artistId: artistId,
      startDate: startDateStr,
      endDate: endDateStr,
      status: 'planning',
      description: `${artist[0].name} tour featuring shows at selected venues`,
      totalBudget: 50000 + Math.random() * 150000,
      estimatedTravelDistance: totalDistance,
      estimatedTravelTime: totalTime,
      // Use the same values for initial metrics to start with
      initialOptimizationScore: 50, // Mediocre score to start with
      initialTotalDistance: totalDistance,
      initialTravelTime: totalTime,
      optimizationScore: 50, // Will be improved through optimization
      updatedAt: updatedAtStr
    }).returning();
    
    console.log(`Created tour: ${newTour.name} (ID: ${newTour.id})`);
    
    // Add tour venues with incremental dates
    let currentDate = new Date(startDate);
    
    for (let j = 0; j < venueList.length; j++) {
      const venue = venueList[j];
      
      // Calculate travel distance and time from previous venue
      let travelDistance: number | null = null;
      let travelTime: number | null = null;
      
      if (j > 0) {
        const prevVenue = venueList[j-1];
        if (prevVenue.latitude && prevVenue.longitude && 
            venue.latitude && venue.longitude) {
          travelDistance = calculateDistance(
            prevVenue.latitude, prevVenue.longitude,
            venue.latitude, venue.longitude
          );
          travelTime = Math.floor((travelDistance / 50) * 60); // minutes
        }
      }
      
      // Assign different statuses to show a realistic tour planning state
      let status: string;
      if (j === 0) {
        // First venue is often confirmed
        status = 'confirmed';
      } else if (j === venueList.length - 1) {
        // Last venue is often confirmed
        status = 'confirmed';
      } else if (j < 2) {
        // Early venues are often on hold
        status = ['hold1', 'hold2'][Math.floor(Math.random() * 2)];
      } else {
        // Later venues are in various states
        status = ['potential', 'contacted', 'negotiating', 'hold3', 'hold4'][Math.floor(Math.random() * 5)];
      }
      
      // Format date for database
      const venueDateStr = currentDate.toISOString().split('T')[0];
      const statusUpdatedAtStr = new Date().toISOString();
      
      // Insert the tour venue
      await db.insert(tourVenues).values({
        tourId: newTour.id,
        venueId: venue.id,
        date: venueDateStr,
        status: status,
        sequence: j + 1,
        travelDistanceFromPrevious: travelDistance,
        travelTimeFromPrevious: travelTime,
        notes: `Show at ${venue.name}`,
        statusUpdatedAt: statusUpdatedAtStr
      });
      
      console.log(`  Added venue: ${venue.name} (${currentDate.toISOString().split('T')[0]}, Status: ${status})`);
      
      // Move to next date (2-4 days between shows)
      const daysBetween = Math.floor(Math.random() * 3) + 2;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + daysBetween);
    }
  }
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula for distance calculation
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

// Run the seed function
seedSpecificVenues()
  .then(() => {
    console.log('Specific venue tour seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed specific venues:', error);
    process.exit(1);
  });