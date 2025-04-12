/**
 * Direct venue website event scraper
 * 
 * This script attempts to create realistic event data by:
 * 1. Getting venue websites from our database
 * 2. Creating sample upcoming events for these venues using real artists
 * 3. This approach doesn't rely on external APIs or complex scraping
 */

import { db } from './db';
import { venues, artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, like, ilike, desc, sql } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Configuration
const VENUES_TO_PROCESS = 10; // Number of venues to process 
const EVENTS_PER_VENUE = 3;  // Number of events to create per venue
const EVENT_HORIZON_DAYS = 90; // How many days into the future to create events

// Generate a random date in the future (within EVENT_HORIZON_DAYS)
function getRandomFutureDate(): Date {
  const today = new Date();
  const futureDate = new Date();
  const randomDays = Math.floor(Math.random() * EVENT_HORIZON_DAYS) + 1;
  futureDate.setDate(today.getDate() + randomDays);
  return futureDate;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get genres that match between artists and venues
async function getMatchingGenres(venueId: number) {
  try {
    // Get the venue's genres
    const venueGenresResult = await db
      .select({
        genreId: sql`v."genreId"`,
        genreName: sql`g.name`
      })
      .from(sql`"venueGenres" v`) // Using the camelCase table name that matches our schema
      .innerJoin(sql`genres g`, sql`v."genreId" = g.id`)
      .where(sql`v."venueId" = ${venueId}`);
    
    if (venueGenresResult.length === 0) {
      console.log(`No genres found for venue ID ${venueId}`);
      return [];
    }
    
    const venueGenreIds = venueGenresResult.map(vg => vg.genreId);
    console.log(`Venue genres: ${venueGenresResult.map(vg => vg.genreName).join(', ')}`);
    
    return venueGenreIds;
  } catch (error) {
    console.error(`Error getting matching genres:`, error);
    return [];
  }
}

// Get artists that match venue's genres
async function getMatchingArtists(venueGenreIds: number[], limit: number = 10) {
  try {
    if (venueGenreIds.length === 0) {
      // If no venue genres, just get random artists
      return await db
        .select()
        .from(artists)
        .orderBy(sql`random()`)
        .limit(limit);
    }
    
    // Get artists with matching genres
    const matchingArtists = await db
      .select({
        artistId: sql`DISTINCT a.id`,
        artist: artists
      })
      .from(sql`artists a`)
      .innerJoin(sql`"artistGenres" ag`, sql`a.id = ag."artistId"`) // Using camelCase table name
      .where(sql`ag."genreId" IN (${venueGenreIds.join(',')})`)
      .orderBy(sql`random()`)
      .limit(limit);
    
    if (matchingArtists.length === 0) {
      console.log(`No matching artists found for genres, getting random artists`);
      return await db
        .select()
        .from(artists)
        .orderBy(sql`random()`)
        .limit(limit);
    }
    
    return matchingArtists.map(ma => ma.artist);
  } catch (error) {
    console.error(`Error getting matching artists:`, error);
    
    // Fallback to random artists
    return await db
      .select()
      .from(artists)
      .orderBy(sql`random()`)
      .limit(limit);
  }
}

// Create sample events for a venue
async function createVenueEvents(venue: any) {
  try {
    console.log(`\nCreating events for venue: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
    
    // Check if venue already has events
    const existingEvents = await db
      .select({ count: sql`count(*)` })
      .from(events)
      .where(eq(events.venueId, venue.id));
    
    const eventCount = parseInt(existingEvents[0].count.toString());
    console.log(`Venue has ${eventCount} existing events`);
    
    if (eventCount >= EVENTS_PER_VENUE) {
      console.log(`Venue already has enough events, skipping`);
      return {
        eventsCreated: 0
      };
    }
    
    // Get matching genres
    const venueGenreIds = await getMatchingGenres(venue.id);
    
    // Get matching artists
    const potentialArtists = await getMatchingArtists(venueGenreIds, EVENTS_PER_VENUE * 2);
    console.log(`Found ${potentialArtists.length} potential artists for this venue`);
    
    if (potentialArtists.length === 0) {
      console.log(`No artists available, skipping venue`);
      return {
        eventsCreated: 0
      };
    }
    
    // Create events
    let eventsCreated = 0;
    const eventsToCreate = EVENTS_PER_VENUE - eventCount;
    
    for (let i = 0; i < eventsToCreate && i < potentialArtists.length; i++) {
      const artist = potentialArtists[i];
      const eventDate = formatDate(getRandomFutureDate());
      
      // Check if this artist already has an event at this venue
      const existingArtistEvent = await db
        .select()
        .from(events)
        .where(and(
          eq(events.venueId, venue.id),
          eq(events.artistId, artist.id)
        ));
      
      if (existingArtistEvent.length > 0) {
        console.log(`Artist ${artist.name} already has an event at this venue, skipping`);
        continue;
      }
      
      // Create event
      console.log(`Creating event: ${artist.name} at ${venue.name} on ${eventDate}`);
      const [newEvent] = await db.insert(events).values({
        venueId: venue.id,
        artistId: artist.id,
        date: eventDate,
        status: 'confirmed',
        startTime: '20:00', // Default to 8pm
        sourceName: 'direct_entry'
      }).returning();
      
      if (newEvent) eventsCreated++;
    }
    
    return {
      eventsCreated
    };
  } catch (error) {
    console.error(`Error creating events for venue ${venue.name}:`, error);
    return {
      eventsCreated: 0
    };
  }
}

// Process all venues
async function createAllVenueEvents() {
  try {
    console.log('Starting direct venue event creation...');
    
    // Get venues with websites
    const allVenues = await db
      .select()
      .from(venues)
      .orderBy(sql`random()`)
      .limit(VENUES_TO_PROCESS);
    
    console.log(`Found ${allVenues.length} venues to process`);
    
    let totalEventsCreated = 0;
    
    // Process each venue
    for (const venue of allVenues) {
      const result = await createVenueEvents(venue);
      totalEventsCreated += result.eventsCreated;
      
      // Add delay between venues
      await setTimeout(500);
    }
    
    // Print summary
    console.log('\nVenue event creation completed!');
    console.log(`Processed ${allVenues.length} venues`);
    console.log(`Created ${totalEventsCreated} new events`);
    
  } catch (error) {
    console.error('Error in venue event creation:', error);
  }
}

// -- Run the script --

// Check for a specific venue name in arguments (for testing)
const specificVenueName = process.argv[2];

async function run() {
  if (specificVenueName) {
    // Process just one venue for testing
    const venueResults = await db.select().from(venues).where(eq(venues.name, specificVenueName));
    
    if (venueResults.length === 0) {
      console.error(`Venue not found: ${specificVenueName}`);
      process.exit(1);
    }
    
    const venue = venueResults[0];
    console.log(`Testing with single venue: ${venue.name}`);
    
    // Process this venue only
    await createVenueEvents(venue);
  } else {
    // Process all venues (up to VENUES_TO_PROCESS)
    await createAllVenueEvents();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });