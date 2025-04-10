import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events, venueNetwork } from '../shared/schema';
import axios from 'axios';
import { eq, and, sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Seed database starting from a specific venue
 * This approach:
 * 1. Starts with an existing venue in the database
 * 2. Fetches relevant artists from Bandsintown (this API endpoint works)
 * 3. Creates connections between similar venues
 * 4. Sets up a functional venue network
 */

interface BandsInTownArtist {
  id: string;
  name: string;
  url: string;
  image_url?: string;
  thumb_url?: string;
  facebook_page_url?: string;
  mbid?: string;
  tracker_count?: number;
  upcoming_event_count?: number;
}

// Venue size categories based on capacity
const VENUE_SIZES = {
  small: { min: 0, max: 500 },
  medium: { min: 501, max: 2000 },
  large: { min: 2001, max: 5000 },
  extraLarge: { min: 5001, max: Number.MAX_SAFE_INTEGER }
};

// Venue compatibility scores by size difference
const VENUE_COMPATIBILITY = {
  // Same size, high compatibility
  same: { trustScore: 85, collaborationLikelihood: 0.8 },
  // One size difference, moderate compatibility
  adjacent: { trustScore: 75, collaborationLikelihood: 0.6 },
  // Two size differences, low compatibility
  distant: { trustScore: 65, collaborationLikelihood: 0.3 },
  // More than two size differences, minimal compatibility
  incompatible: { trustScore: 50, collaborationLikelihood: 0.1 }
};

// Artists that would typically play at The Bowery Ballroom
// This is a mix of indie, alternative, and emerging artists
// that would fit the venue's capacity and reputation
const BOWERY_COMPATIBLE_ARTISTS = [
  'Lucy Dacus',
  'Soccer Mommy',
  'Japanese Breakfast',
  'Courtney Barnett',
  'Big Thief',
  'Mitski',
  'Car Seat Headrest',
  'Parquet Courts',
  'Snail Mail',
  'The National',
  'Kurt Vile',
  'Beach House',
  'Father John Misty',
  'Real Estate',
  'Toro y Moi',
  'Angel Olsen',
  'Slowdive',
  'Destroyer',
  'The War on Drugs',
  'Sharon Van Etten',
  'Unknown Mortal Orchestra',
  'Alvvays',
  'Mac DeMarco',
  'Waxahatchee',
  'Perfume Genius'
];

/**
 * Fetch artist data from Bandsintown
 */
async function fetchArtist(artistName: string): Promise<BandsInTownArtist | null> {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    // Sanitize artist name for URL
    const encodedArtistName = encodeURIComponent(artistName.trim());
    const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}`;
    
    console.log(`Fetching artist data for '${artistName}'...`);
    
    const response = await axios.get(apiEndpoint, { 
      params: { app_id: apiKey },
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data && response.data.name) {
      console.log(`Successfully retrieved data for artist ${artistName}`);
      return response.data;
    }
    
    console.log(`No data found for artist ${artistName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching artist '${artistName}':`, error);
    return null;
  }
}

/**
 * Add artist to database if it doesn't exist
 */
async function addArtistToDatabase(artistData: BandsInTownArtist): Promise<number> {
  // Check if artist already exists
  const existingArtists = await db.select()
    .from(artists)
    .where(eq(artists.name, artistData.name))
    .limit(1);

  if (existingArtists.length > 0) {
    console.log(`Artist '${artistData.name}' already exists in database`);
    return existingArtists[0].id;
  }

  // Insert new artist
  console.log(`Adding artist '${artistData.name}' to database`);
  const newArtists = await db.insert(artists).values({
    name: artistData.name,
    bandsintownId: artistData.id,
    imageUrl: artistData.image_url,
    websiteUrl: artistData.url,
    genres: determineGenres(artistData.name), // Function to assign plausible genres
    popularity: artistData.tracker_count ? Math.min(100, Math.floor(artistData.tracker_count / 1000)) : 50
  }).returning();

  if (newArtists.length > 0) {
    console.log(`Added new artist: ${newArtists[0].name} (ID: ${newArtists[0].id})`);
    return newArtists[0].id;
  }

  throw new Error(`Failed to add artist ${artistData.name} to database`);
}

/**
 * Determine appropriate genres for an artist
 */
function determineGenres(artistName: string): string[] {
  // This is a simplified implementation using name-based matching
  // A real implementation would use an external API to get genres
  const artistNameLower = artistName.toLowerCase();

  // Genre patterns based on typical artists for each genre
  // These are simplified associations for demonstration
  const genrePatterns = {
    'indie': ['japanese breakfast', 'soccer mommy', 'alvvays', 'mitski', 'beach house', 'car seat headrest', 'snail mail', 'the national', 'courtney barnett'],
    'rock': ['the national', 'car seat headrest', 'kurt vile', 'parquet courts', 'the war on drugs'],
    'folk': ['father john misty', 'sharon van etten', 'waxahatchee', 'angel olsen', 'big thief', 'lucy dacus'],
    'electronic': ['toro y moi', 'unknown mortal orchestra', 'perfume genius'],
    'alternative': ['slowdive', 'mac demarco', 'destroyer', 'real estate']
  };

  // Check for artist matches across genres
  const matchedGenres = Object.entries(genrePatterns)
    .filter(([_, artists]) => {
      return artists.some(a => artistNameLower.includes(a.toLowerCase()));
    })
    .map(([genre, _]) => genre);

  // Default to indie if no matches
  return matchedGenres.length > 0 ? matchedGenres : ['indie'];
}

/**
 * Create connections between venues based on size and geography
 */
async function createVenueConnections() {
  console.log('Creating venue network connections...');
  
  // Get all venues
  const allVenues = await db.select().from(venues);
  
  if (allVenues.length <= 1) {
    console.log('Need at least 2 venues to create connections');
    return 0;
  }
  
  // First clear any existing connections
  await db.delete(venueNetwork);
  console.log('Cleared existing venue connections');
  
  let connectionsCreated = 0;

  // Categorize venues by size
  const venuesBySize = {
    small: [] as typeof allVenues,
    medium: [] as typeof allVenues,
    large: [] as typeof allVenues,
    extraLarge: [] as typeof allVenues
  };
  
  allVenues.forEach(venue => {
    const capacity = venue.capacity || 0;
    if (capacity <= VENUE_SIZES.small.max) {
      venuesBySize.small.push(venue);
    } else if (capacity <= VENUE_SIZES.medium.max) {
      venuesBySize.medium.push(venue);
    } else if (capacity <= VENUE_SIZES.large.max) {
      venuesBySize.large.push(venue);
    } else {
      venuesBySize.extraLarge.push(venue);
    }
  });
  
  console.log('Venue size distribution:');
  console.log(`- Small venues (0-500): ${venuesBySize.small.length}`);
  console.log(`- Medium venues (501-2000): ${venuesBySize.medium.length}`);
  console.log(`- Large venues (2001-5000): ${venuesBySize.large.length}`);
  console.log(`- Extra large venues (5001+): ${venuesBySize.extraLarge.length}`);
  
  // Create connections
  for (let i = 0; i < allVenues.length; i++) {
    for (let j = i + 1; j < allVenues.length; j++) {
      const venue1 = allVenues[i];
      const venue2 = allVenues[j];
      
      // Determine size categories
      const getCategory = (capacity: number) => {
        if (capacity <= VENUE_SIZES.small.max) return 'small';
        if (capacity <= VENUE_SIZES.medium.max) return 'medium';
        if (capacity <= VENUE_SIZES.large.max) return 'large';
        return 'extraLarge';
      };
      
      const category1 = getCategory(venue1.capacity || 0);
      const category2 = getCategory(venue2.capacity || 0);
      
      // Calculate size difference
      const sizeMap = { small: 1, medium: 2, large: 3, extraLarge: 4 };
      const sizeDiff = Math.abs(sizeMap[category1] - sizeMap[category2]);
      
      // Determine compatibility
      let compatibility;
      if (sizeDiff === 0) compatibility = VENUE_COMPATIBILITY.same;
      else if (sizeDiff === 1) compatibility = VENUE_COMPATIBILITY.adjacent;
      else if (sizeDiff === 2) compatibility = VENUE_COMPATIBILITY.distant;
      else compatibility = VENUE_COMPATIBILITY.incompatible;
      
      // Location-based boost (same state gets higher score)
      const locationBoost = venue1.state === venue2.state ? 10 : 0;
      
      // Final trust score
      const trustScore = Math.min(100, compatibility.trustScore + locationBoost);
      
      // Decide number of collaborations (more for similar venues)
      const collaborativeBookings = Math.floor(Math.random() * 10 * compatibility.collaborationLikelihood) + 1;
      
      // Create connection
      await db.insert(venueNetwork).values({
        venueId: venue1.id,
        connectedVenueId: venue2.id,
        status: 'active',
        trustScore,
        collaborativeBookings
      });
      
      connectionsCreated++;
    }
  }
  
  console.log(`Created ${connectionsCreated} venue connections`);
  return connectionsCreated;
}

/**
 * Create tour-friendly events for artists across the venue network
 */
async function createArtistEvents() {
  console.log('Creating artist events across venues...');
  
  // Get all venues and artists
  const allVenues = await db.select().from(venues);
  const allArtists = await db.select().from(artists);
  
  if (allVenues.length === 0 || allArtists.length === 0) {
    console.log('Need venues and artists to create events');
    return 0;
  }
  
  // Clear existing events
  await db.delete(events);
  console.log('Cleared existing events');
  
  let eventsCreated = 0;
  
  // Define time range for events (next 6 months)
  const today = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(today.getMonth() + 6);
  
  // Group venues by size
  const venuesBySize = {
    small: [] as typeof allVenues,
    medium: [] as typeof allVenues,
    large: [] as typeof allVenues,
    extraLarge: [] as typeof allVenues
  };
  
  allVenues.forEach(venue => {
    const capacity = venue.capacity || 0;
    if (capacity <= VENUE_SIZES.small.max) {
      venuesBySize.small.push(venue);
    } else if (capacity <= VENUE_SIZES.medium.max) {
      venuesBySize.medium.push(venue);
    } else if (capacity <= VENUE_SIZES.large.max) {
      venuesBySize.large.push(venue);
    } else {
      venuesBySize.extraLarge.push(venue);
    }
  });
  
  // Create tours for each artist
  for (const artist of allArtists) {
    // Determine appropriate venue size for this artist based on popularity
    let targetVenueSize: keyof typeof venuesBySize;
    const popularity = artist.popularity || 50;
    
    if (popularity < 30) targetVenueSize = 'small';
    else if (popularity < 60) targetVenueSize = 'medium';
    else if (popularity < 85) targetVenueSize = 'large';
    else targetVenueSize = 'extraLarge';
    
    // Get suitable venues
    const primaryVenues = venuesBySize[targetVenueSize];
    
    // Plus venues one size smaller and one size larger when appropriate
    let secondaryVenues: typeof allVenues = [];
    
    if (targetVenueSize === 'small') {
      secondaryVenues = venuesBySize.medium;
    } else if (targetVenueSize === 'medium') {
      secondaryVenues = [...venuesBySize.small, ...venuesBySize.large];
    } else if (targetVenueSize === 'large') {
      secondaryVenues = [...venuesBySize.medium, ...venuesBySize.extraLarge];
    } else {
      secondaryVenues = venuesBySize.large;
    }
    
    // Determine number of shows for this artist
    const numShows = Math.floor(Math.random() * 5) + 3; // 3-7 shows
    
    // Create primary venue events first (more likely at ideal venue size)
    const tourVenues = [];
    
    // Add primary venues until we reach our target, or run out
    for (let i = 0; i < Math.min(numShows, primaryVenues.length); i++) {
      const randomIndex = Math.floor(Math.random() * primaryVenues.length);
      const venue = primaryVenues[randomIndex];
      
      // Don't include the same venue twice
      if (!tourVenues.some(v => v.id === venue.id)) {
        tourVenues.push(venue);
      }
    }
    
    // Add secondary venues if needed to reach target number
    if (tourVenues.length < numShows && secondaryVenues.length > 0) {
      for (let i = tourVenues.length; i < numShows && i < (tourVenues.length + secondaryVenues.length); i++) {
        const randomIndex = Math.floor(Math.random() * secondaryVenues.length);
        const venue = secondaryVenues[randomIndex];
        
        // Don't include the same venue twice
        if (!tourVenues.some(v => v.id === venue.id)) {
          tourVenues.push(venue);
        }
      }
    }
    
    // Create chronological tour dates
    let tourDate = new Date();
    // Random start in the next 30 days
    tourDate.setDate(tourDate.getDate() + Math.floor(Math.random() * 30));
    
    for (const venue of tourVenues) {
      // Format date as YYYY-MM-DD
      const dateString = tourDate.toISOString().split('T')[0];
      
      // Random evening time between 7pm and 10pm
      const hour = Math.floor(Math.random() * 4) + 19; // 19-22 (7pm-10pm)
      const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Create the event
      await db.insert(events).values({
        artistId: artist.id,
        venueId: venue.id,
        date: dateString,
        startTime: timeString,
        status: 'confirmed',
        sourceId: `manual-seed-${artist.id}-${venue.id}`,
        sourceName: 'seed-script'
      });
      
      eventsCreated++;
      
      // Move tour date forward 1-3 days
      const daysBetween = Math.floor(Math.random() * 3) + 1;
      tourDate.setDate(tourDate.getDate() + daysBetween);
      
      // Cap at 6 months from today
      if (tourDate > sixMonthsLater) {
        break;
      }
    }
  }
  
  console.log(`Created ${eventsCreated} events across ${allVenues.length} venues`);
  return eventsCreated;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let venueName = 'The Bowery Ballroom'; // Default venue
  
  // Look for a venue name argument
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--venue=')) {
      venueName = args[i].substring('--venue='.length);
      break;
    }
  }
  
  return { venueName };
}

/**
 * Main function to seed data from a specific venue
 */
async function seedFromVenue() {
  try {
    console.log('Starting database seeding from a specific venue...');
    
    // Check for API key (for artist data only)
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY before running this script.');
      process.exit(1);
    }
    
    // Parse command line args to get venue name
    const { venueName } = parseArgs();
    
    // Get the source venue
    const sourceVenue = await db.select()
      .from(venues)
      .where(eq(venues.name, venueName))
      .limit(1);
    
    if (sourceVenue.length === 0) {
      console.error(`ERROR: Source venue "${venueName}" not found in database`);
      console.error('Available venues:');
      
      // List available venues
      const availableVenues = await db.select({ id: venues.id, name: venues.name }).from(venues);
      for (const venue of availableVenues) {
        console.error(`- ${venue.name} (ID: ${venue.id})`);
      }
      
      console.error('\nUse --venue="Venue Name" to specify a venue');
      process.exit(1);
    }
    
    console.log(`Using venue: ${sourceVenue[0].name} (ID: ${sourceVenue[0].id}) as seed venue`);
    
    // Process artists that would play at Bowery Ballroom
    const artistStats = {
      processed: 0,
      added: 0,
      failed: 0
    };
    
    console.log(`Adding ${BOWERY_COMPATIBLE_ARTISTS.length} compatible artists for ${sourceVenue[0].name}...`);
    
    for (const artistName of BOWERY_COMPATIBLE_ARTISTS) {
      try {
        // Fetch artist data from Bandsintown
        const artistData = await fetchArtist(artistName);
        if (!artistData) {
          console.log(`Failed to fetch data for ${artistName}, skipping`);
          artistStats.failed++;
          continue;
        }
        
        // Add to database
        await addArtistToDatabase(artistData);
        artistStats.added++;
      } catch (error) {
        console.error(`Error processing artist ${artistName}:`, error);
        artistStats.failed++;
      }
      
      artistStats.processed++;
    }
    
    console.log(`\nArtist processing complete:`);
    console.log(`- Processed: ${artistStats.processed}`);
    console.log(`- Added: ${artistStats.added}`);
    console.log(`- Failed: ${artistStats.failed}`);
    
    // Create venue network
    const connections = await createVenueConnections();
    
    // Create events for artists
    const eventCount = await createArtistEvents();
    
    // Print final summary
    console.log(`\n== Seeding Complete ==`);
    console.log(`Source venue: ${sourceVenue[0].name}`);
    console.log(`Artists added: ${artistStats.added}`);
    console.log(`Venue network connections: ${connections}`);
    console.log(`Events created: ${eventCount}`);
    
    console.log('\nDatabase ready for use!');
    process.exit(0);
  } catch (error) {
    console.error('Error in seed process:', error);
    process.exit(1);
  }
}

// Run the script
seedFromVenue();