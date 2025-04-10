import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Simple script to seed events and artists for a single venue
 * 
 * Usage: npx tsx server/seed-single-venue.ts "The Bowery Ballroom"
 * 
 * The venue name must match a venue in the database and 
 * must have a known Bandsintown ID in the knownVenueIds mapping.
 */

// Known Bandsintown venue IDs
const knownVenueIds: Record<string, string> = {
  'The Bug Jar': '10068739-the-bug-jar',
  'The Bowery Ballroom': '1847-the-bowery-ballroom',
  'The 9:30 Club': '209-9-30-club',
  'The Troubadour': '1941-the-troubadour',
  'The Fillmore': '1941-the-fillmore',
  'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
  'The Ryman Auditorium': '1941-ryman-auditorium',
  'House of Blues': '1941-house-of-blues-chicago'
};

async function seedSingleVenue() {
  try {
    // Get venue name from command line or use default
    const venueName = process.argv[2] || 'The Bowery Ballroom';
    
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      process.exit(1);
    }
    
    // Get venue ID
    const bandsintownId = knownVenueIds[venueName];
    if (!bandsintownId) {
      console.error(`No Bandsintown ID found for venue: ${venueName}`);
      console.error('Available venues:', Object.keys(knownVenueIds).join(', '));
      process.exit(1);
    }
    
    // Get venue from database
    console.log(`Looking up venue in database: ${venueName}`);
    const venue = await db.select().from(venues).where(eq(venues.name, venueName)).limit(1);
    
    if (!venue.length) {
      console.error(`Venue not found in database: ${venueName}`);
      process.exit(1);
    }
    
    const venueId = venue[0].id;
    console.log(`Found venue in database: ${venueName} (ID: ${venueId})`);
    
    // Fetch events from Bandsintown
    console.log(`Fetching events from Bandsintown for ${venueName} (${bandsintownId})`);
    
    const apiEndpoint = `https://rest.bandsintown.com/venues/${bandsintownId}/events`;
    console.log(`API Endpoint: ${apiEndpoint}`);
    
    try {
      // Use simpler authentication with just the app_id parameter
      console.log('Trying authentication with app_id parameter...');
      
      // Bandsintown API primarily authenticates using the app_id parameter
      const response = await axios.get(apiEndpoint, {
        params: { app_id: apiKey },
        headers: { 
          'Accept': 'application/json'
        }
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response from Bandsintown API');
        console.error('Response data:', response.data);
        process.exit(1);
      }
      
      const eventsData = response.data;
      console.log(`Retrieved ${eventsData.length} events for venue ${venueName}`);
      
      // Process events
      let eventsAdded = 0;
      let artistsAdded = 0;
      
      for (const eventData of eventsData) {
        if (!eventData.artist) {
          console.log('Skipping event with missing artist data');
          continue;
        }
        
        // Process artist
        const artistName = eventData.artist.name;
        console.log(`Processing artist: ${artistName}`);
        
        // Check if artist exists
        let artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
        
        if (!artist.length) {
          // Create artist
          console.log(`Creating new artist: ${artistName}`);
          
          const [newArtist] = await db.insert(artists).values({
            name: artistName,
            genres: ['rock'],
            popularity: eventData.artist.tracker_count 
              ? Math.min(100, Math.floor(eventData.artist.tracker_count / 1000)) 
              : 50,
            imageUrl: eventData.artist.image_url,
            websiteUrl: eventData.artist.url,
            bandsintownId: eventData.artist.id,
            description: `Artist from Bandsintown: ${artistName}`
          }).returning();
          
          artist = [newArtist];
          artistsAdded++;
          console.log(`Added artist: ${artistName} (ID: ${newArtist.id})`);
        } else {
          console.log(`Artist already exists: ${artistName} (ID: ${artist[0].id})`);
        }
        
        // Process event
        console.log(`Processing event for ${artistName}`);
        
        // Parse date
        const eventDate = new Date(eventData.datetime);
        const dateString = eventDate.toISOString().split('T')[0];
        const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);
        
        // Check if event exists
        const existingEvent = await db.select()
          .from(events)
          .where(
            and(
              eq(events.artistId, artist[0].id),
              eq(events.venueId, venueId),
              eq(events.date, dateString)
            )
          )
          .limit(1);
        
        if (existingEvent.length > 0) {
          // Update event
          console.log(`Updating existing event: ${artistName} on ${dateString}`);
          
          await db.update(events)
            .set({
              status: eventData.status || 'confirmed',
              ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
              sourceId: eventData.id,
              sourceName: 'bandsintown'
            })
            .where(eq(events.id, existingEvent[0].id));
        } else {
          // Create event
          console.log(`Creating new event: ${artistName} on ${dateString}`);
          
          await db.insert(events).values({
            artistId: artist[0].id,
            venueId: venueId,
            date: dateString,
            startTime: timeString,
            status: eventData.status || 'confirmed',
            ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
            sourceId: eventData.id,
            sourceName: 'bandsintown'
          });
          
          eventsAdded++;
          console.log(`Created event: ${artistName} on ${dateString}`);
        }
      }
      
      // Print summary
      console.log('\nSeeding completed!');
      console.log(`Venue: ${venueName}`);
      console.log(`Total events processed: ${eventsData.length}`);
      console.log(`New events added: ${eventsAdded}`);
      console.log(`New artists added: ${artistsAdded}`);
      
    } catch (error: any) {
      console.error('Error fetching data from Bandsintown:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error:', error.message);
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
seedSingleVenue();