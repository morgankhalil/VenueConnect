/**
 * Test script for Bandsintown Concerts API
 * 
 * This script tests the Bandsintown API's artist events endpoint:
 * GET /artists/{artistname}/events
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import { db } from './db';
import { artists, events } from '../shared/schema';
import { eq, and, not, isNull } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Check for API key
const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;
if (!BANDSINTOWN_API_KEY) {
  console.error('Error: BANDSINTOWN_API_KEY environment variable is not set');
  process.exit(1);
}

// Base URL for Bandsintown API
const BANDSINTOWN_API_BASE_URL = 'https://rest.bandsintown.com';
const BANDSINTOWN_API_V3_URL = 'https://rest.bandsintown.com/v3.0';

/**
 * Fetch events for a specific artist from Bandsintown (standard endpoint)
 */
async function getArtistEvents(artistName: string) {
  try {
    console.log(`Testing artist events endpoint for: ${artistName}`);

    // URL encode the artist name
    const encodedArtistName = encodeURIComponent(artistName);

    // Construct the API URL
    const url = `${BANDSINTOWN_API_BASE_URL}/artists/${encodedArtistName}/events?app_id=${BANDSINTOWN_API_KEY}`;
    
    console.log(`Request URL: ${url}`);
    
    // Make the API request
    const response = await axios.get(url);
    
    // Log the response status and data
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching artist events: ${error}`);
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response data:`, error.response?.data);
    }
    return null;
  }
}

/**
 * Fetch events for a specific artist from Bandsintown (v3.0 API)
 */
async function getArtistEventsV3(artistName: string) {
  try {
    console.log(`Testing v3.0 artist events endpoint for: ${artistName}`);

    // URL encode the artist name
    const encodedArtistName = encodeURIComponent(artistName);

    // Construct the API URL
    const url = `${BANDSINTOWN_API_V3_URL}/artists/${encodedArtistName}/events?app_id=${BANDSINTOWN_API_KEY}`;
    
    console.log(`Request URL: ${url}`);
    
    // Make the API request
    const response = await axios.get(url);
    
    // Log the response status and data
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching artist events (v3): ${error}`);
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response data:`, error.response?.data);
    }
    return null;
  }
}

/**
 * Test search endpoint for artist events
 */
async function testSearchEndpoint(artistName: string) {
  try {
    console.log(`\nTesting search endpoint for ${artistName} events`);
    
    // Construct the API URL for search
    const url = `${BANDSINTOWN_API_BASE_URL}/artists/${encodeURIComponent(artistName)}/events?app_id=${BANDSINTOWN_API_KEY}`;
    
    // Make the API request
    const response = await axios.get(url);
    
    // Log the response status and data
    console.log(`Response status: ${response.status}`);
    console.log(`Response data: events = ${response.data.length}`);
    
    if (response.data.length > 0) {
      console.log('\nSample event details:');
      const event = response.data[0];
      console.log(`Venue: ${event.venue.name} in ${event.venue.city}, ${event.venue.country}`);
      console.log(`Date: ${event.datetime}`);
      console.log(`Lineup: ${event.lineup.join(', ')}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Test failed: ${error}`);
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Error data:`, error.response?.data);
    }
    return null;
  }
}

/**
 * Create or update events in the database from Bandsintown API data
 */
async function processEvents(artistName: string, apiEvents: any[]) {
  try {
    console.log(`\nProcessing ${apiEvents.length} events for ${artistName}`);
    
    // First get artist ID from database
    const artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (artistResult.length === 0) {
      console.error(`Artist not found in database: ${artistName}`);
      return { processed: 0, created: 0 };
    }
    
    const artist = artistResult[0];
    console.log(`Found artist in database: ${artist.name} (ID: ${artist.id})`);
    
    let created = 0;
    
    // Process each event
    for (const apiEvent of apiEvents) {
      try {
        // Extract event data
        const venueData = apiEvent.venue;
        const eventDate = new Date(apiEvent.datetime);
        
        // Format date as YYYY-MM-DD
        const formattedDate = eventDate.toISOString().split('T')[0];
        
        // Format time as HH:MM
        const hours = eventDate.getUTCHours().toString().padStart(2, '0');
        const minutes = eventDate.getUTCMinutes().toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        
        // Check if event already exists
        const existingEvent = await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.artistId, artist.id),
              eq(events.date, formattedDate),
              eq(events.venueName, venueData.name)
            )
          );
        
        if (existingEvent.length > 0) {
          console.log(`Event already exists for ${artist.name} at ${venueData.name} on ${formattedDate}`);
          continue;
        }
        
        // Create new event
        const [newEvent] = await db
          .insert(events)
          .values({
            artistId: artist.id,
            venueName: venueData.name,
            venueCity: venueData.city,
            venueCountry: venueData.country,
            venueRegion: venueData.region || '',
            date: formattedDate,
            startTime: formattedTime,
            status: 'confirmed',
            sourceName: 'bandsintown',
            sourceId: apiEvent.id.toString()
          })
          .returning();
        
        console.log(`Created event: ${artist.name} at ${venueData.name} on ${formattedDate}`);
        created++;
      } catch (error) {
        console.error(`Error processing event: ${error}`);
      }
    }
    
    return { processed: apiEvents.length, created };
  } catch (error) {
    console.error(`Error processing events: ${error}`);
    return { processed: 0, created: 0 };
  }
}

/**
 * Sync events for artists in the database
 */
async function syncArtistEvents(limit: number = 5) {
  try {
    console.log(`Starting event sync from Bandsintown`);
    
    // Get artists to sync
    const artistsToSync = await db
      .select()
      .from(artists)
      .where(
        and(
          not(isNull(artists.name))
        )
      )
      .limit(limit);
    
    console.log(`Found ${artistsToSync.length} artists to sync events for`);
    
    // Track results
    let totalProcessed = 0;
    let totalCreated = 0;
    
    // Sync each artist
    for (const artist of artistsToSync) {
      try {
        console.log(`\nSyncing events for artist: ${artist.name}`);
        
        // Get events from Bandsintown
        const events = await getArtistEvents(artist.name);
        
        if (!events || events.length === 0) {
          console.log(`No events found for ${artist.name}`);
          continue;
        }
        
        console.log(`Found ${events.length} events for ${artist.name}`);
        
        // Process the events
        const result = await processEvents(artist.name, events);
        totalProcessed += result.processed;
        totalCreated += result.created;
        
        // Add delay between artists
        await setTimeout(1000);
      } catch (error) {
        console.error(`Error syncing artist ${artist.name}: ${error}`);
      }
    }
    
    console.log(`\nSync completed. Processed ${totalProcessed} events, created ${totalCreated} new events.`);
    return { totalProcessed, totalCreated };
  } catch (error) {
    console.error(`Error syncing artist events: ${error}`);
    return { totalProcessed: 0, totalCreated: 0 };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'test';
    
    if (command === 'test') {
      // Test with a specific artist name
      const artistName = args[1] || 'The Midnight';
      console.log(`Testing artist events endpoint for: ${artistName}`);
      await getArtistEvents(artistName);
    } else if (command === 'search') {
      // Test search endpoint
      const artistName = args[1] || 'The Midnight';
      await testSearchEndpoint(artistName);
    } else if (command === 'sync') {
      // Sync events for artists in database
      const limit = args[1] ? parseInt(args[1]) : 5;
      await syncArtistEvents(limit);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log(`Usage:`);
      console.log(` - test [artist_name]: Test artist events endpoint`);
      console.log(` - search [artist_name]: Test search endpoint`);
      console.log(` - sync [limit]: Sync events for artists in database`);
    }
  } catch (error) {
    console.error(`Error in main function: ${error}`);
  }
  // No need to disconnect as db doesn't have this method
}

// Run the script if it's the main module
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export {
  getArtistEvents,
  testSearchEndpoint,
  syncArtistEvents
};