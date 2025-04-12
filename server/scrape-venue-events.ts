/**
 * Enhanced venue-centric event data collection script using web scraping
 * 
 * This script fetches events for our existing venues by:
 * 1. Retrieving all venues from our database
 * 2. Searching for each venue on public websites (Songkick, etc.)
 * 3. Scraping upcoming events for each venue
 * 4. Creating artists and events in our database
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { venues, artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, gt, sql, or, like, ilike } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Maximum number of venues to process in one run (for testing)
const MAX_VENUES = 10;

// -- Utility functions --

// Format venue name for better searching and matching
function formatVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '') // Remove "The" prefix
    .replace(/&/g, 'and')    // Replace & with and
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
}

// Parse a date string into a proper DB date format (YYYY-MM-DD)
function parseDate(dateString: string): string {
  try {
    // First try direct parsing
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Check for common date formats (e.g., "7 Apr 2025" from Songkick)
    const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    // Try parsing parts
    const parts = dateString.toLowerCase().split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1].substring(0, 3);
      const month = monthMap[monthStr];
      const year = parseInt(parts[2]);
      
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const parsedDate = new Date(year, month, day);
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    // Return original if parsing fails
    console.warn(`Unable to parse date string: ${dateString}`);
    return dateString;
  } catch (error) {
    console.warn(`Error parsing date string: ${dateString}`, error);
    return dateString;
  }
}

// -- Songkick venue event scraping --

async function searchSongkickVenue(venue: any) {
  try {
    console.log(`Searching Songkick for venue: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
    
    // Try a more specific search with venue name AND city
    const searchName = formatVenueName(venue.name);
    const searchCity = venue.city.toLowerCase();
    const encodedSearch = encodeURIComponent(`${searchName} ${searchCity}`);
    
    // Try this search URL first
    const url = `https://www.songkick.com/search?query=${encodedSearch}&type=venues`;
    
    console.log(`Using search URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find venue listings
    const venueResults = [];
    $('.venues .venue').each((i, el) => {
      const name = $(el).find('.summary strong.primary-detail').text().trim();
      const location = $(el).find('.summary .secondary-detail').text().trim();
      const url = 'https://www.songkick.com' + $(el).find('a.url').attr('href');
      
      // Calculate match score (simple version)
      let matchScore = 0;
      
      // Check if names are similar
      if (formatVenueName(name).includes(formatVenueName(venue.name)) || 
          formatVenueName(venue.name).includes(formatVenueName(name))) {
        matchScore += 3;
      }
      
      // Check if the city is mentioned in the location
      if (location.toLowerCase().includes(venue.city.toLowerCase())) {
        matchScore += 2;
      }
      
      // Check if region/state is mentioned
      if (venue.region && location.toLowerCase().includes(venue.region.toLowerCase())) {
        matchScore += 1;
      }
      
      venueResults.push({
        name,
        location,
        url,
        matchScore
      });
    });
    
    if (venueResults.length === 0) {
      console.log(`No Songkick results found for venue: ${venue.name}`);
      return null;
    }
    
    // Sort by match score
    venueResults.sort((a, b) => b.matchScore - a.matchScore);
    
    // Select best match
    const bestMatch = venueResults[0];
    console.log(`Found Songkick venue: ${bestMatch.name} in ${bestMatch.location} (score: ${bestMatch.matchScore})`);
    
    return bestMatch;
  } catch (error: any) {
    console.error(`Error searching Songkick for venue ${venue.name}:`, error.message);
    return null;
  }
}

async function getSongkickVenueEvents(venueUrl: string) {
  try {
    console.log(`Fetching events from: ${venueUrl}`);
    const calendarUrl = `${venueUrl}/calendar`;
    
    const response = await axios.get(calendarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
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

// -- Database operations --

// Create or get artist and associate genres
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

// Create event in database
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
      sourceName: 'web_scraping'
    }).returning();
    
    return newEvent;
  } catch (error) {
    console.error(`Error creating event:`, error);
    throw error;
  }
}

// -- Main functions --

// Process events for a single venue
async function processVenueEvents(venue: any) {
  console.log(`\nProcessing venue ${venue.id}: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
  
  // Search for venue on Songkick
  const songkickVenue = await searchSongkickVenue(venue);
  if (!songkickVenue) {
    console.log(`No Songkick data found for venue: ${venue.name}`);
    return {
      success: false,
      eventsCreated: 0,
      artistsCreated: 0,
      existingArtistsUsed: 0
    };
  }
  
  // Get events for the venue
  const venueEvents = await getSongkickVenueEvents(songkickVenue.url);
  if (venueEvents.length === 0) {
    console.log(`No upcoming events found for venue: ${venue.name}`);
    return {
      success: false,
      eventsCreated: 0,
      artistsCreated: 0,
      existingArtistsUsed: 0
    };
  }
  
  let eventsCreated = 0;
  let artistsCreated = 0;
  let existingArtistsUsed = 0;
  
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
        existingArtistsUsed++;
      }
      
      // Parse date
      const eventDate = parseDate(eventData.date);
      
      // Create event
      const event = await createEvent(venue.id, artist.id, eventDate);
      if (event) eventsCreated++;
    } catch (error) {
      console.error(`Error processing event: ${eventData.artistName} at ${venue.name}:`, error);
    }
  }
  
  return {
    success: true,
    eventsCreated,
    artistsCreated,
    existingArtistsUsed
  };
}

// Main function to fetch events for all venues
async function scrapeAllVenueEvents() {
  try {
    console.log('Starting venue event scraping...');
    
    // Get all venues from database
    const allVenues = await db.select().from(venues).limit(MAX_VENUES);
    console.log(`Found ${allVenues.length} venues in database (limited to ${MAX_VENUES})`);
    
    let processedVenues = 0;
    let eventsCreated = 0;
    let artistsCreated = 0;
    let existingArtistCount = 0;
    
    // Process venues in batches to avoid overwhelming the scraping target
    const BATCH_SIZE = 2;
    
    for (let i = 0; i < allVenues.length; i += BATCH_SIZE) {
      const venueBatch = allVenues.slice(i, i + BATCH_SIZE);
      
      // Process venues sequentially within the batch to be nice to the target site
      for (const venue of venueBatch) {
        const result = await processVenueEvents(venue);
        if (result.success) {
          processedVenues++;
          eventsCreated += result.eventsCreated;
          artistsCreated += result.artistsCreated;
          existingArtistCount += result.existingArtistsUsed;
        }
        
        // Be nice to the site - add delay between requests
        await setTimeout(2000);
      }
      
      // Add a delay between batches
      if (i + BATCH_SIZE < allVenues.length) {
        console.log(`\nCompleting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allVenues.length/BATCH_SIZE)}. Waiting before next batch...`);
        await setTimeout(5000);
      }
    }
    
    // Print summary
    console.log('\nVenue event scraping completed!');
    console.log(`Successfully processed ${processedVenues}/${allVenues.length} venues`);
    console.log(`Created ${eventsCreated} new events`);
    console.log(`Created ${artistsCreated} new artists`);
    console.log(`Used ${existingArtistCount} existing artists`);
    
  } catch (error) {
    console.error('Error in venue event scraping:', error);
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
    await processVenueEvents(venue);
  } else {
    // Process all venues (up to MAX_VENUES)
    await scrapeAllVenueEvents();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });