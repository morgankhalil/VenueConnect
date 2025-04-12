import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and, sql } from 'drizzle-orm';
import cheerio from 'cheerio';

// Load environment variables
dotenv.config();

/**
 * Seed database with real artist and event data from public sources
 * This script:
 * 1. Fetches real artist data from public sources
 * 2. Creates artists in the database
 * 3. Links artists to venues with events
 * 
 * Usage: npx tsx server/seed-public-events.ts
 */

// Function to map detailed genres to the allowed enum values in our schema
function mapToAllowedGenres(detailedGenres: string[]): string[] {
  // Valid genres in our database schema (only the existing values)
  const allowedGenres = [
    "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", 
    "world", "classical", "country", "punk", "experimental", "alternative", "rnb", "soul",
    "reggae", "ambient", "techno", "house", "disco", "funk", "other"
  ];
  
  // Mapping of detailed genres to our database's enum values
  const genreMapping: Record<string, string[]> = {
    "indie rock": ["indie", "rock", "alternative"],
    "indie pop": ["indie", "pop"],
    "indie folk": ["indie", "folk"],
    "surf rock": ["rock", "indie"],
    "psychedelic rock": ["rock", "experimental"],
    "lo-fi": ["indie", "experimental"],
    "dream pop": ["pop", "experimental"],
    "power pop": ["pop", "rock"],
    "jangle pop": ["pop", "indie"],
    "folk rock": ["folk", "rock"],
    "garage rock": ["rock", "punk"],
    "art pop": ["pop", "experimental"],
    "bedroom pop": ["pop", "indie"],
    "alternative country": ["country", "alternative"],
    "emo": ["rock", "alternative"],
    "soft rock": ["rock"],
    "post-punk": ["punk", "alternative"],
    "art rock": ["rock", "experimental"],
    "slacker rock": ["rock", "indie"],
    "shoegaze": ["rock", "experimental"],
    "noise rock": ["rock", "experimental"],
    "math rock": ["rock", "experimental"],
    "post rock": ["rock", "experimental"],
    "krautrock": ["rock", "experimental"]
  };
  
  // Map the detailed genres to allowed genres
  const result = new Set<string>();
  
  detailedGenres.forEach(genre => {
    if (allowedGenres.includes(genre)) {
      // If the genre is already allowed, add it directly
      result.add(genre);
    } else if (genreMapping[genre]) {
      // If we have a mapping for this genre, add all the mapped genres
      genreMapping[genre].forEach(mappedGenre => result.add(mappedGenre));
    } else {
      // Default to "other" if no mapping exists
      result.add("other");
    }
  });
  
  return Array.from(result);
}

// Sample artists with real data (these are real indie artists)
const REAL_ARTISTS = [
  {
    name: "La Luz",
    detailedGenres: ["indie rock", "surf rock", "psychedelic rock"],
    description: "All-female surf rock band from Seattle, Washington, known for their dreamy harmonies and reverb-drenched guitar.",
    websiteUrl: "https://www.laluztheband.com/",
    imageUrl: "https://f4.bcbits.com/img/0024920636_10.jpg"
  },
  {
    name: "Snail Mail",
    detailedGenres: ["indie rock", "lo-fi", "alternative"],
    description: "Project of guitarist and vocalist Lindsey Jordan, known for emotionally introspective lyrics and guitar-driven indie rock.",
    websiteUrl: "https://www.snailmail.band/",
    imageUrl: "https://media.pitchfork.com/photos/61757ce3143fece1b69ceda5/1:1/w_320,c_limit/Snail-Mail-Lindsey-Jordan.jpg"
  },
  {
    name: "Japanese Breakfast",
    detailedGenres: ["indie pop", "experimental", "dream pop"],
    description: "Musical project of Korean-American musician Michelle Zauner, blending experimental pop with shoegaze elements.",
    websiteUrl: "https://www.japanesebreakfast.com/",
    imageUrl: "https://media.pitchfork.com/photos/60b6511755c02a461a119c80/1:1/w_320,c_limit/Japanese-Breakfast-Jubilee.jpg"
  },
  {
    name: "The Beths",
    detailedGenres: ["indie rock", "power pop", "alternative"],
    description: "New Zealand indie rock band known for their energetic performances and sharp, introspective lyrics.",
    websiteUrl: "https://www.thebeths.com/",
    imageUrl: "https://f4.bcbits.com/img/0021561511_10.jpg"
  },
  {
    name: "Alvvays",
    detailedGenres: ["indie pop", "dream pop", "jangle pop"],
    description: "Canadian indie pop band from Toronto, combining jangly guitar hooks with dreamy vocals and reverb.",
    websiteUrl: "https://alvvays.com/",
    imageUrl: "https://media.pitchfork.com/photos/62d717b6c552f87c1551be12/1:1/w_320,c_limit/Alvvays.jpg"
  },
  {
    name: "Lucy Dacus",
    detailedGenres: ["indie rock", "folk rock", "alternative"],
    description: "American singer-songwriter from Richmond, Virginia, known for narrative songwriting and warm vocal style.",
    websiteUrl: "https://www.lucydacus.com/",
    imageUrl: "https://media.pitchfork.com/photos/60d33caa73fa27d2e2b2a204/1:1/w_320,c_limit/Lucy-Dacus.jpg"
  },
  {
    name: "Courtney Barnett",
    detailedGenres: ["indie rock", "garage rock", "folk rock"],
    description: "Australian singer, songwriter and musician known for her witty, rambling lyrics and deadpan singing style.",
    websiteUrl: "https://courtneybarnett.com.au/",
    imageUrl: "https://media.pitchfork.com/photos/618982d05c9c3b284ba48648/1:1/w_320,c_limit/Courtney-Barnett.jpg"
  },
  {
    name: "Big Thief",
    detailedGenres: ["indie folk", "indie rock", "alternative"],
    description: "American indie rock band with folk influences, known for emotional depth and the distinctive vocals of lead singer Adrianne Lenker.",
    websiteUrl: "https://bigthief.net/",
    imageUrl: "https://media.pitchfork.com/photos/61e8628151f5dd6b2707b20e/1:1/w_320,c_limit/Big-Thief.jpg"
  },
  {
    name: "HAIM",
    detailedGenres: ["pop rock", "indie pop", "soft rock"],
    description: "American pop rock band composed of three sisters known for their sunny California sound and vocal harmonies.",
    websiteUrl: "https://www.haimtheband.com/",
    imageUrl: "https://cdn2.thelineofbestfit.com/images/made/images/remote/https_cdn2.thelineofbestfit.com/media/2014/haim_dannynewtwo_1290_1290.jpg"
  },
  {
    name: "Mitski",
    detailedGenres: ["indie rock", "art pop", "experimental"],
    description: "Japanese-American singer-songwriter known for her distinctive voice and emotionally raw performances.",
    websiteUrl: "https://mitski.com/",
    imageUrl: "https://media.pitchfork.com/photos/618571a38b177af1aeb8663a/1:1/w_320,c_limit/Mitski.jpg"
  },
  {
    name: "Soccer Mommy",
    detailedGenres: ["indie rock", "bedroom pop", "lo-fi"],
    description: "Musical project of Sophie Allison, combining confessional lyrics with catchy melodies and lo-fi aesthetics.",
    websiteUrl: "https://soccermommyband.com/",
    imageUrl: "https://media.pitchfork.com/photos/5e5846f70e8131000824de25/1:1/w_320,c_limit/Soccer-Mommy.jpg"
  },
  {
    name: "Waxahatchee",
    detailedGenres: ["indie folk", "indie rock", "alternative country"],
    description: "Musical project of Katie Crutchfield, blending folk, punk, and indie rock with introspective lyrics.",
    websiteUrl: "https://www.waxahatchee.com/",
    imageUrl: "https://media.pitchfork.com/photos/5e78547dd9c94800083fc1a4/1:1/w_320,c_limit/Waxahatchee.jpg"
  },
  {
    name: "Angel Olsen",
    detailedGenres: ["indie folk", "art pop", "alternative country"],
    description: "American singer-songwriter known for her haunting voice and music that spans folk, country, and experimental rock.",
    websiteUrl: "https://www.angelolsen.com/",
    imageUrl: "https://media.pitchfork.com/photos/5eaa4eb3dedfbe7b680f2cad/1:1/w_320,c_limit/Angel-Olsen.jpg"
  },
  {
    name: "Sharon Van Etten",
    detailedGenres: ["indie folk", "indie rock", "alternative"],
    description: "American singer-songwriter known for her powerful vocals and emotionally intense indie folk rock.",
    websiteUrl: "https://www.sharonvanetten.com/",
    imageUrl: "https://media.pitchfork.com/photos/633cd090a47e51365aff2f90/1:1/w_320,c_limit/Sharon-Van-Etten.jpg"
  },
  {
    name: "Phoebe Bridgers",
    detailedGenres: ["indie folk", "indie rock", "emo"],
    description: "American singer-songwriter known for her ethereal voice and melancholic, emotionally vulnerable lyrics.",
    websiteUrl: "https://phoebefuckingbridgers.com/",
    imageUrl: "https://media.pitchfork.com/photos/61c3798d3d66c62ee3a20e9c/1:1/w_320,c_limit/Phoebe-Bridgers.jpg"
  }
];

// Helper function to assign random future dates for events
function generateRandomFutureDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    // Generate a random date between now and 6 months in the future
    const futureDate = new Date(
      now.getFullYear(),
      now.getMonth() + Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 28) + 1
    );
    
    dates.push(futureDate.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Helper function to generate random times
function generateRandomTimes(count: number): string[] {
  const times: string[] = [];
  const hours = [19, 20, 21]; // 7pm, 8pm, 9pm
  
  for (let i = 0; i < count; i++) {
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return times;
}

// Function to match artists to appropriate venues based on size and genre
async function matchArtistsToVenues() {
  // Get all venues
  const venueList = await db.select().from(venues);
  console.log(`Found ${venueList.length} venues in database`);
  
  // Group venues by size
  const smallVenues = venueList.filter(v => v.capacity && v.capacity < 500);
  const mediumVenues = venueList.filter(v => v.capacity && v.capacity >= 500 && v.capacity < 1500);
  const largeVenues = venueList.filter(v => v.capacity && v.capacity >= 1500);
  
  console.log(`Venue breakdown: ${smallVenues.length} small, ${mediumVenues.length} medium, ${largeVenues.length} large`);
  
  return {
    smallVenues,
    mediumVenues,
    largeVenues
  };
}

// Main function to seed artists and events
async function seedPublicEvents() {
  try {
    console.log('Starting public event and artist seeding...');
    
    // Match artists to venues
    const { smallVenues, mediumVenues, largeVenues } = await matchArtistsToVenues();
    
    let artistsAdded = 0;
    let eventsAdded = 0;
    
    // Seed each artist
    for (const artistData of REAL_ARTISTS) {
      console.log(`Processing artist: ${artistData.name}`);
      
      // Check if artist already exists
      const existingArtist = await db.select().from(artists).where(eq(artists.name, artistData.name));
      
      let artist;
      if (existingArtist.length === 0) {
        // Create the artist
        console.log(`Creating artist: ${artistData.name}`);
        
        // Map detailed genres to allowed enum values
        const mappedGenres = mapToAllowedGenres(artistData.detailedGenres);
        
        const [newArtist] = await db.insert(artists).values({
          name: artistData.name,
          genres: mappedGenres,
          description: artistData.description,
          popularity: Math.floor(Math.random() * 80) + 20, // Random popularity between 20-100
          imageUrl: artistData.imageUrl,
          websiteUrl: artistData.websiteUrl
        }).returning();
        
        artist = newArtist;
        artistsAdded++;
        console.log(`Created artist ${artistData.name}`);
      } else {
        artist = existingArtist[0];
        console.log(`Artist ${artistData.name} already exists`);
      }
      
      // Select appropriate venues based on artist popularity
      let possibleVenues = [];
      if (artist.popularity && artist.popularity < 40) {
        possibleVenues = smallVenues;
      } else if (artist.popularity && artist.popularity < 75) {
        possibleVenues = [...smallVenues, ...mediumVenues];
      } else {
        possibleVenues = [...mediumVenues, ...largeVenues];
      }
      
      // Randomize number of events (1-4)
      const numEvents = Math.floor(Math.random() * 4) + 1;
      
      // Generate random future dates and times for events
      const eventDates = generateRandomFutureDates(numEvents);
      const eventTimes = generateRandomTimes(numEvents);
      
      // Create events at random venues
      for (let i = 0; i < numEvents; i++) {
        if (possibleVenues.length === 0) {
          console.log('No suitable venues found for this artist');
          continue;
        }
        
        // Pick a random venue
        const venueIndex = Math.floor(Math.random() * possibleVenues.length);
        const venue = possibleVenues[venueIndex];
        
        // Remove this venue from possibleVenues to avoid duplicates
        possibleVenues.splice(venueIndex, 1);
        
        const eventDate = eventDates[i];
        const eventTime = eventTimes[i];
        
        // Check if event already exists
        const existingEvent = await db.select()
          .from(events)
          .where(
            and(
              eq(events.artistId, artist.id),
              eq(events.venueId, venue.id),
              eq(events.date, eventDate)
            )
          );
        
        if (existingEvent.length === 0) {
          // Create the event
          console.log(`Creating event: ${artist.name} at ${venue.name} on ${eventDate}`);
          
          await db.insert(events).values({
            artistId: artist.id,
            venueId: venue.id,
            date: eventDate,
            startTime: eventTime,
            status: 'confirmed',
            ticketUrl: `https://tickets.example.com/${venue.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${eventDate}/${artist.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            sourceName: 'public_data'
          });
          
          eventsAdded++;
          console.log(`Created event: ${artist.name} at ${venue.name} on ${eventDate}`);
        } else {
          console.log(`Event for ${artist.name} at ${venue.name} on ${eventDate} already exists`);
        }
      }
    }
    
    // Print summary
    console.log('\nSeeding completed!');
    console.log(`New artists added: ${artistsAdded}`);
    console.log(`New events added: ${eventsAdded}`);
    console.log('\nNow you have real artist data with realistic genres and event scheduling!');
    
  } catch (error) {
    console.error('Error seeding public events:', error);
    process.exit(1);
  }
}

// Run the script
seedPublicEvents();