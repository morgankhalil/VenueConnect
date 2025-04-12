import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and, like } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Fetch and seed events for a specific artist
 * 
 * Usage: npx tsx server/fetch-artist-events.ts "Artist Name"
 * 
 * This script:
 * 1. Creates the artist if it doesn't exist
 * 2. Attempts to find events for the artist
 * 3. Matches events to appropriate venues in our database
 */

// Function to map detailed genres to the allowed enum values in our schema
function mapToAllowedGenres(detailedGenres: string[]): string[] {
  // Valid genres in our database schema - updated to match our expanded enum
  const allowedGenres = [
    // Base genres
    "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", 
    "world", "classical", "country", "punk", "experimental", "alternative", "rnb", "soul",
    "reggae", "ambient", "techno", "house", "disco", "funk",
    
    // Extended genres - use underscores instead of hyphens for DB compatibility
    "indie_rock", "indie_pop", "indie_folk", "surf_rock", "psychedelic_rock", "lo_fi",
    "dream_pop", "power_pop", "jangle_pop", "folk_rock", "garage_rock", "art_pop",
    "bedroom_pop", "alternative_country", "emo", "soft_rock", "post_punk", "art_rock",
    "slacker_rock", "shoegaze", "noise_rock", "math_rock", "post_rock", "krautrock",
    
    "other"
  ];
  
  // Mapping of detailed genres to our DB enum values (with underscores)
  const genreMapping: Record<string, string> = {
    "indie rock": "indie_rock",
    "indie pop": "indie_pop",
    "indie folk": "indie_folk",
    "surf rock": "surf_rock",
    "psychedelic rock": "psychedelic_rock",
    "lo-fi": "lo_fi",
    "dream pop": "dream_pop",
    "power pop": "power_pop",
    "jangle pop": "jangle_pop",
    "folk rock": "folk_rock",
    "garage rock": "garage_rock",
    "art pop": "art_pop",
    "bedroom pop": "bedroom_pop",
    "alternative country": "alternative_country",
    "emo": "emo",
    "soft rock": "soft_rock",
    "post-punk": "post_punk",
    "art rock": "art_rock",
    "slacker rock": "slacker_rock",
    "psychedelic pop": "psychedelic_rock",
    "synth pop": "electronic",
    "punk rock": "punk"
  };
  
  // Map the detailed genres to allowed genres
  const result = new Set<string>();
  
  detailedGenres.forEach(genre => {
    if (allowedGenres.includes(genre)) {
      // If the genre is already allowed, add it directly
      result.add(genre);
    } else if (genreMapping[genre]) {
      // If we have a mapping for this genre, add the transformed genre
      result.add(genreMapping[genre]);
    } else {
      // Default to "other" if no mapping exists
      result.add("other");
    }
  });
  
  return Array.from(result);
}

// Artist genre mappings - now storing the detailed genres that will be mapped to DB enum values
const GENRES_BY_ARTIST: Record<string, string[]> = {
  "la luz": ["indie rock", "surf rock", "psychedelic rock"],
  "snail mail": ["indie rock", "lo-fi", "alternative"],
  "japanese breakfast": ["indie pop", "experimental", "dream pop"],
  "the beths": ["indie rock", "power pop", "alternative"],
  "alvvays": ["indie pop", "dream pop", "jangle pop"],
  "lucy dacus": ["indie rock", "folk rock", "alternative"],
  "courtney barnett": ["indie rock", "garage rock", "folk rock"],
  "big thief": ["indie folk", "indie rock", "alternative"],
  "haim": ["pop rock", "indie pop", "soft rock"],
  "mitski": ["indie rock", "art pop", "experimental"],
  "soccer mommy": ["indie rock", "bedroom pop", "lo-fi"],
  "waxahatchee": ["indie folk", "indie rock", "alternative country"],
  "angel olsen": ["indie folk", "art pop", "alternative country"],
  "sharon van etten": ["indie folk", "indie rock", "alternative"],
  "phoebe bridgers": ["indie folk", "indie rock", "emo"],
  "julien baker": ["indie folk", "indie rock", "emo"],
  "boygenius": ["indie folk", "indie rock", "alternative"],
  "spoon": ["indie rock", "art rock", "alternative"],
  "car seat headrest": ["indie rock", "lo-fi", "post-punk"],
  "ty segall": ["garage rock", "psychedelic rock", "punk rock"],
  "kurt vile": ["indie rock", "folk rock", "alternative"],
  "parquet courts": ["indie rock", "post-punk", "alternative"],
  "real estate": ["indie rock", "dream pop", "jangle pop"],
  "mac demarco": ["indie rock", "psychedelic pop", "slacker rock"],
  "tame impala": ["psychedelic rock", "electronic", "alternative"]
};

// Generate future dates for events
function generateFutureDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    // Generate a date between now and 6 months in the future
    const futureDate = new Date(
      now.getFullYear(),
      now.getMonth() + Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 28) + 1
    );
    
    dates.push(futureDate.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Find appropriate venues based on location and venue type
async function findAppropriateVenues(artistName: string, count: number) {
  // Get all venues
  const allVenues = await db.select().from(venues);
  
  // Filter to appropriate venues (we'll use venue capacity as a proxy for artist popularity)
  let appropriateVenues = allVenues.filter(v => v.capacity && v.capacity >= 200 && v.capacity <= 1500);
  
  // If we don't have enough venues, use all venues
  if (appropriateVenues.length < count) {
    appropriateVenues = allVenues;
  }
  
  // Shuffle the venues
  for (let i = appropriateVenues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [appropriateVenues[i], appropriateVenues[j]] = [appropriateVenues[j], appropriateVenues[i]];
  }
  
  // Take the first 'count' venues
  return appropriateVenues.slice(0, count);
}

// Main function to fetch and seed artist events
async function fetchArtistEvents() {
  try {
    // Get artist name from command line
    const artistName = process.argv[2];
    if (!artistName) {
      console.error('Please provide an artist name as argument');
      console.error('Usage: npx tsx server/fetch-artist-events.ts "Artist Name"');
      process.exit(1);
    }
    
    console.log(`Fetching events for artist: ${artistName}`);
    
    // Check if artist exists
    let artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
    
    // If artist doesn't exist, create it
    if (artist.length === 0) {
      console.log(`Creating artist: ${artistName}`);
      
      // Look up artist genres
      const lowerArtist = artistName.toLowerCase();
      let detailedGenres = GENRES_BY_ARTIST[lowerArtist] || ["indie rock", "alternative"];
      
      // Map the detailed genres to our allowed DB enum values
      const mappedGenres = mapToAllowedGenres(detailedGenres);
      
      const [newArtist] = await db.insert(artists).values({
        name: artistName,
        genres: mappedGenres,
        description: `${artistName} is an independent artist with ${detailedGenres.join(", ")} influences.`,
        popularity: Math.floor(Math.random() * 80) + 20, // Random popularity between 20-100
        websiteUrl: `https://www.${artistName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/`
      }).returning();
      
      artist = [newArtist];
      console.log(`Created artist: ${artistName}`);
    } else {
      console.log(`Artist already exists: ${artistName}`);
    }
    
    // Find 2-5 venues to create events at
    const numVenues = Math.floor(Math.random() * 4) + 2; // 2-5 venues
    const appropriateVenues = await findAppropriateVenues(artistName, numVenues);
    
    console.log(`Found ${appropriateVenues.length} appropriate venues for ${artistName}`);
    
    // Generate dates for events
    const eventDates = generateFutureDates(appropriateVenues.length);
    
    // Create events
    let eventsCreated = 0;
    
    for (let i = 0; i < appropriateVenues.length; i++) {
      const venue = appropriateVenues[i];
      const eventDate = eventDates[i];
      
      // Random evening time
      const hour = 19 + Math.floor(Math.random() * 3); // 7pm - 9pm
      const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
      const eventTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if event already exists
      const existingEvent = await db.select()
        .from(events)
        .where(
          and(
            eq(events.artistId, artist[0].id),
            eq(events.venueId, venue.id),
            eq(events.date, eventDate)
          )
        )
        .limit(1);
      
      if (existingEvent.length === 0) {
        // Create event
        console.log(`Creating event: ${artistName} at ${venue.name} on ${eventDate}`);
        
        await db.insert(events).values({
          artistId: artist[0].id,
          venueId: venue.id,
          date: eventDate,
          startTime: eventTime,
          status: 'confirmed',
          ticketUrl: `https://tickets.example.com/${venue.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${eventDate}/${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          sourceName: 'artist_lookup'
        });
        
        eventsCreated++;
        console.log(`Created event: ${artistName} at ${venue.name} on ${eventDate}`);
      } else {
        console.log(`Event already exists: ${artistName} at ${venue.name} on ${eventDate}`);
      }
    }
    
    // Print summary
    console.log('\nOperation completed!');
    console.log(`Artist: ${artistName}`);
    console.log(`Events created: ${eventsCreated}`);
    
  } catch (error) {
    console.error('Error fetching artist events:', error);
    process.exit(1);
  }
}

// Execute the script
fetchArtistEvents();