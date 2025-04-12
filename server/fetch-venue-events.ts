/**
 * Venue-centric event data collection script
 * 
 * This script fetches events for our existing venues by:
 * 1. Retrieving all venues from our database
 * 2. Searching for each venue on Songkick
 * 3. Scraping upcoming events for each venue
 * 4. Creating artists and events in our database
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { venues, artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, gt, sql } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Utility to convert venue name to a searchable format
function formatVenueNameForSearch(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '') // Remove "The" prefix
    .replace(/&/g, 'and')    // Replace & with and
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
}

/**
 * Search Songkick for a venue
 */
async function searchSongkickVenue(venueName: string) {
  try {
    console.log(`Searching Songkick for venue: ${venueName}`);
    const searchName = formatVenueNameForSearch(venueName);
    const encodedName = encodeURIComponent(searchName);
    const url = `https://www.songkick.com/search?query=${encodedName}&type=venues`;
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Find venue listings - focus on the first matching venue
    const venueResults = [];
    $('.venues .venue').each((i, el) => {
      const name = $(el).find('.summary strong.primary-detail').text().trim();
      const location = $(el).find('.summary .secondary-detail').text().trim();
      const url = 'https://www.songkick.com' + $(el).find('a.url').attr('href');
      
      venueResults.push({
        name,
        location,
        url
      });
    });
    
    if (venueResults.length === 0) {
      console.log(`No Songkick results found for venue: ${venueName}`);
      return null;
    }
    
    // Check for the best match - we could implement fuzzy matching here
    const bestMatch = venueResults[0]; // For now just take the first result
    console.log(`Found Songkick venue: ${bestMatch.name} in ${bestMatch.location}`);
    
    return bestMatch;
  } catch (error: any) {
    console.error(`Error searching Songkick for venue ${venueName}:`, error.message);
    return null;
  }
}

/**
 * Get upcoming events for a venue from Songkick
 */
async function getVenueEvents(venueUrl: string) {
  try {
    console.log(`Fetching events from: ${venueUrl}`);
    const response = await axios.get(`${venueUrl}/calendar`);
    const $ = cheerio.load(response.data);
    
    // Parse event listings
    const events = [];
    $('.event-listings .event-listing').each((i, el) => {
      // Get event date
      const dateEl = $(el).find('.event-listing-date');
      const day = dateEl.find('.day').text().trim();
      const month = dateEl.find('.month').text().trim();
      const year = dateEl.find('.year').text().trim();
      const dateString = `${day} ${month} ${year}`;
      
      // Get artist name
      const artistName = $(el).find('.event-listing-title').text().trim();
      
      // Get additional details
      const venueDetailsEl = $(el).find('.event-listing-venue-location');
      const venueName = venueDetailsEl.find('.event-listing-venue').text().trim();
      const eventUrl = 'https://www.songkick.com' + $(el).find('a.event-link').attr('href');
      
      events.push({
        date: dateString,
        artistName,
        venueName,
        eventUrl
      });
    });
    
    console.log(`Found ${events.length} upcoming events`);
    return events;
  } catch (error: any) {
    console.error(`Error fetching venue events:`, error.message);
    return [];
  }
}

/**
 * Parse a Songkick date string into a proper DB date format
 * Input: "7 Apr 2025" or similar
 * Output: "2025-04-07"
 */
function parseDateString(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Try more aggressive parsing if the default fails
      const parts = dateString.split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }[parts[1]];
        const year = parseInt(parts[2]);
        
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          const parsedDate = new Date(year, month, day);
          return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      }
      
      console.warn(`Unable to parse date string: ${dateString}`);
      return dateString; // Return original if parsing fails
    }
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (error) {
    console.warn(`Error parsing date string: ${dateString}`, error);
    return dateString; // Return original if parsing fails
  }
}

/**
 * Create or get an artist and associate genres
 */
async function createOrGetArtist(artistName: string) {
  try {
    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (existingArtist.length > 0) {
      console.log(`Artist already exists: ${artistName}`);
      return existingArtist[0];
    }
    
    // Create new artist
    console.log(`Creating new artist: ${artistName}`);
    
    // For new artists, assign "indie rock" as the default genre
    // This is a simplification - in production, you'd want to get real genre data
    const [newArtist] = await db.insert(artists).values({
      name: artistName,
      popularity: Math.floor(Math.random() * 50) + 30, // Random popularity 30-80
      description: `${artistName} is an artist we found through venue events.`
    }).returning();
    
    // Get the indie rock genre
    const indieRockGenre = await db
      .select()
      .from(genres)
      .where(eq(genres.name, 'indie rock'));
    
    if (indieRockGenre.length > 0) {
      // Associate the artist with the indie rock genre
      await db.insert(artistGenres).values({
        artistId: newArtist.id,
        genreId: indieRockGenre[0].id
      });
    }
    
    return newArtist;
  } catch (error) {
    console.error(`Error creating/getting artist ${artistName}:`, error);
    throw error;
  }
}

/**
 * Create event in database
 */
async function createEvent(venueId: number, artistId: number, date: string) {
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
      status: 'confirmed',
      startTime: '20:00', // Default to 8pm
      sourceName: 'songkick'
    }).returning();
    
    return newEvent;
  } catch (error) {
    console.error(`Error creating event:`, error);
    throw error;
  }
}

/**
 * Main function to fetch events for all venues
 */
async function fetchAllVenueEvents() {
  try {
    console.log('Starting venue event fetching...');
    
    // Get all venues from database
    const allVenues = await db.select().from(venues);
    console.log(`Found ${allVenues.length} venues in database`);
    
    let processedVenues = 0;
    let eventsCreated = 0;
    let artistsCreated = 0;
    let existingArtistCount = 0;
    
    // Process venues in batches to avoid overwhelming the scraping target
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < allVenues.length; i += BATCH_SIZE) {
      const venueBatch = allVenues.slice(i, i + BATCH_SIZE);
      
      // Process venues in parallel within the batch
      await Promise.all(venueBatch.map(async (venue) => {
        console.log(`\nProcessing venue ${venue.id}: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
        
        // Search for venue on Songkick
        const songkickVenue = await searchSongkickVenue(venue.name);
        if (!songkickVenue) {
          console.log(`No Songkick data found for venue: ${venue.name}`);
          return;
        }
        
        // Get events for the venue
        const venueEvents = await getVenueEvents(songkickVenue.url);
        if (venueEvents.length === 0) {
          console.log(`No upcoming events found for venue: ${venue.name}`);
          return;
        }
        
        // Process each event
        for (const eventData of venueEvents) {
          try {
            // Create or get artist
            const artist = await createOrGetArtist(eventData.artistName);
            if (!artist.id) {
              console.error(`Failed to create or get artist: ${eventData.artistName}`);
              continue;
            }
            
            // If this was a new artist, increment counter
            if (artist.createdAt && new Date(artist.createdAt).getTime() > Date.now() - 10000) {
              artistsCreated++;
            } else {
              existingArtistCount++;
            }
            
            // Parse date
            const eventDate = parseDateString(eventData.date);
            
            // Create event
            const event = await createEvent(venue.id, artist.id, eventDate);
            if (event) eventsCreated++;
          } catch (error) {
            console.error(`Error processing event: ${eventData.artistName} at ${venue.name}:`, error);
          }
        }
        
        processedVenues++;
        console.log(`Completed processing venue: ${venue.name}`);
        
        // Be nice to the website we're scraping - add a small delay
        await setTimeout(1000);
      }));
      
      // Add a delay between batches
      if (i + BATCH_SIZE < allVenues.length) {
        console.log(`\nCompeting batch ${i/BATCH_SIZE + 1}. Waiting before next batch...`);
        await setTimeout(5000);
      }
    }
    
    // Print summary
    console.log('\nVenue event fetching completed!');
    console.log(`Processed ${processedVenues} venues`);
    console.log(`Created ${eventsCreated} new events`);
    console.log(`Created ${artistsCreated} new artists`);
    console.log(`Used ${existingArtistCount} existing artists`);
    
  } catch (error) {
    console.error('Error in venue event fetching:', error);
  }
}

// Run the main function
// Check for a specific venue name in arguments
const specificVenueName = process.argv[2];

async function run() {
  if (specificVenueName) {
    // Process just one venue for testing
    const venues = await db.select().from(venues).where(eq(venues.name, specificVenueName));
    
    if (venues.length === 0) {
      console.error(`Venue not found: ${specificVenueName}`);
      process.exit(1);
    }
    
    const venue = venues[0];
    console.log(`Testing with single venue: ${venue.name}`);
    
    // Search for venue on Songkick
    const songkickVenue = await searchSongkickVenue(venue.name);
    if (songkickVenue) {
      // Get events for the venue
      const venueEvents = await getVenueEvents(songkickVenue.url);
      console.log('Events:', venueEvents);
    }
  } else {
    // Process all venues
    await fetchAllVenueEvents();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });