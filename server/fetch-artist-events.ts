/**
 * Artist-centric event data collection script
 * 
 * This script fetches events for artists using the Bandsintown API:
 * 1. Retrieves artists from our database 
 * 2. Fetches upcoming events for each artist from Bandsintown
 * 3. Matches events with our venues based on venue name similarity
 * 4. Creates events in our database
 */

import axios from 'axios';
import { db } from './db';
import { artists, venues, events, artistGenres, genres } from '../shared/schema';
import { eq, and, like, ilike, or, sql } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// The Bandsintown app_id - this is a public identifier required by Bandsintown API
// We use 'venueconnect' as our app_id
const APP_ID = 'venueconnect';

// Fetch artist events from Bandsintown
async function fetchArtistEvents(artistName: string) {
  try {
    console.log(`Fetching events for artist: ${artistName}`);
    const encodedName = encodeURIComponent(artistName);
    const url = `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${APP_ID}`;
    
    const response = await axios.get(url);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching events for artist ${artistName}:`, error);
    return [];
  }
}

// Format venue name for better matching
function formatVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '') // Remove "The" prefix
    .replace(/&/g, 'and')    // Replace & with and
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
}

// Find the best venue match from our database
async function findMatchingVenue(venueName: string, venueCity: string, venueRegion: string) {
  try {
    // First try exact name and location match
    const exactMatches = await db
      .select()
      .from(venues)
      .where(
        and(
          eq(venues.name, venueName),
          or(
            eq(venues.city, venueCity),
            venues.region ? eq(venues.region, venueRegion) : sql`1=1`
          )
        )
      );
    
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }
    
    // Try fuzzy name match with location match
    const formattedName = formatVenueName(venueName);
    const fuzzyMatches = await db
      .select()
      .from(venues)
      .where(
        and(
          or(
            ilike(venues.name, `%${formattedName}%`),
            ilike(venues.name, `%${venueName}%`)
          ),
          or(
            ilike(venues.city, `%${venueCity}%`),
            venues.region ? ilike(venues.region, `%${venueRegion}%`) : sql`1=1`
          )
        )
      );
    
    if (fuzzyMatches.length > 0) {
      return fuzzyMatches[0];
    }
    
    // Try location match only for very similar names
    if (formattedName.length > 5) {
      const locationMatches = await db
        .select()
        .from(venues)
        .where(
          and(
            or(
              ilike(venues.name, `%${formattedName.substring(0, 5)}%`),
              ilike(venues.name, `%${venueName.substring(0, 5)}%`)
            ),
            or(
              eq(venues.city, venueCity),
              venues.region ? eq(venues.region, venueRegion) : sql`1=1`
            )
          )
        );
      
      if (locationMatches.length > 0) {
        return locationMatches[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding matching venue for ${venueName}:`, error);
    return null;
  }
}

// Create event in database
async function createEvent(venueId: number, artistId: number, date: string, time: string = '20:00', status: string = 'confirmed') {
  try {
    // Check if event already exists
    const existingEvent = await db
      .select()
      .from(events)
      .where(and(
        eq(events.venueId, venueId),
        eq(events.artistId, artistId),
        eq(events.date, date)
      ));
    
    if (existingEvent.length > 0) {
      console.log(`Event already exists: ${date}`);
      return existingEvent[0];
    }
    
    // Create new event
    console.log(`Creating new event on ${date}`);
    const [newEvent] = await db.insert(events).values({
      venueId,
      artistId,
      date,
      status,
      startTime: time,
      sourceName: 'bandsintown'
    }).returning();
    
    return newEvent;
  } catch (error) {
    console.error(`Error creating event:`, error);
    throw error;
  }
}

// Main function to fetch events for artists
async function fetchArtistsEvents(artistNames?: string[]) {
  try {
    console.log('Starting Bandsintown events and artists seeding');
    
    // Get artists from database or use provided names
    let artistsToProcess: { id: number, name: string }[] = [];
    
    if (artistNames && artistNames.length > 0) {
      console.log('Using provided artist names:', artistNames);
      
      // Find these artists in our database
      for (const name of artistNames) {
        const existingArtists = await db
          .select({ id: artists.id, name: artists.name })
          .from(artists)
          .where(eq(artists.name, name));
        
        if (existingArtists.length > 0) {
          artistsToProcess.push(existingArtists[0]);
        } else {
          console.log(`Artist not found in database: ${name}`);
        }
      }
    } else {
      // Get all artists from database, ordered by popularity
      artistsToProcess = await db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .orderBy(sql`RANDOM()`)
        .limit(20); // Process a subset of random artists
        
      console.log(`Found ${artistsToProcess.length} artists in database`);
    }
    
    let processedArtists = 0;
    let eventsCreated = 0;
    let venuesFound = 0;
    let venuesNotFound = 0;
    
    // Process artists in batches to avoid API rate limits
    const BATCH_SIZE = 2;
    
    for (let i = 0; i < artistsToProcess.length; i += BATCH_SIZE) {
      const artistBatch = artistsToProcess.slice(i, i + BATCH_SIZE);
      
      // Process artists sequentially within the batch
      for (const artist of artistBatch) {
        console.log(`\nProcessing artist ${artist.id}: ${artist.name}`);
        
        // Fetch artist events from Bandsintown
        const artistEvents = await fetchArtistEvents(artist.name);
        
        if (!Array.isArray(artistEvents) || artistEvents.length === 0) {
          console.log(`No upcoming events found for artist: ${artist.name}`);
          continue;
        }
        
        console.log(`Found ${artistEvents.length} events for ${artist.name}`);
        
        // Process each event
        for (const eventData of artistEvents) {
          try {
            // Extract venue information
            const venue = eventData.venue;
            if (!venue) continue;
            
            const venueName = venue.name;
            const venueCity = venue.city;
            const venueRegion = venue.region || '';
            const venueCountry = venue.country;
            
            // Skip non-US events for now
            if (venueCountry !== 'United States') {
              console.log(`Skipping non-US event in ${venueCity}, ${venueCountry}`);
              continue;
            }
            
            console.log(`Checking venue: ${venueName} in ${venueCity}, ${venueRegion}`);
            
            // Find matching venue in our database
            const matchingVenue = await findMatchingVenue(venueName, venueCity, venueRegion);
            
            if (!matchingVenue) {
              console.log(`No matching venue found for: ${venueName} in ${venueCity}, ${venueRegion}`);
              venuesNotFound++;
              continue;
            }
            
            venuesFound++;
            console.log(`Found matching venue ID ${matchingVenue.id}: ${matchingVenue.name}`);
            
            // Extract event date and time
            const eventDate = eventData.datetime ? new Date(eventData.datetime) : new Date(eventData.date);
            const date = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Format time (if available)
            let time = '20:00'; // Default time if not specified
            if (eventData.datetime) {
              const dateObj = new Date(eventData.datetime);
              time = dateObj.toTimeString().substring(0, 5); // HH:MM
            }
            
            // Create event in our database
            await createEvent(matchingVenue.id, artist.id, date, time);
            eventsCreated++;
            
          } catch (error) {
            console.error(`Error processing event for ${artist.name}:`, error);
          }
        }
        
        processedArtists++;
        console.log(`Completed processing artist: ${artist.name}`);
        
        // Be nice to the API - add a delay between artists
        await setTimeout(1000);
      }
      
      // Add a delay between batches
      if (i + BATCH_SIZE < artistsToProcess.length) {
        console.log(`\nCompleted batch ${Math.floor(i/BATCH_SIZE) + 1}. Waiting before next batch...`);
        await setTimeout(3000);
      }
    }
    
    // Print summary
    console.log('\nArtist event fetching completed!');
    console.log(`Processed ${processedArtists} artists`);
    console.log(`Created ${eventsCreated} new events`);
    console.log(`Found ${venuesFound} matching venues`);
    console.log(`Could not find matches for ${venuesNotFound} venues`);
    
  } catch (error) {
    console.error('Error in artist event fetching:', error);
  }
}

// Run the main function
// Check for specific artist names in arguments
const artistNames = process.argv.slice(2);

// Main function
async function run() {
  await fetchArtistsEvents(artistNames.length > 0 ? artistNames : undefined);
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });