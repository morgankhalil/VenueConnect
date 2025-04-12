/**
 * City-based event scraping approach
 * 
 * This script scrapes event data from public websites by:
 * 1. Searching for events by city (rather than specific venue)
 * 2. Matching venue names from search results to our database
 * 3. Creating appropriate artist and event records
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { venues, artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, like, ilike } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Configuration
const MAX_CITIES = 5; // Maximum number of cities to process in one run
const EVENTS_PER_CITY = 50; // Maximum events to process per city

// -- Utility functions --

// Format name for better matching
function formatName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '') // Remove "The" prefix
    .replace(/&/g, 'and')    // Replace & with and
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
}

// Calculate similarity score between two strings (0-1)
function similarityScore(str1: string, str2: string): number {
  const a = formatName(str1);
  const b = formatName(str2);
  
  // Exact match
  if (a === b) return 1;
  
  // Contains check
  if (a.includes(b) || b.includes(a)) {
    const longerLength = Math.max(a.length, b.length);
    const shorterLength = Math.min(a.length, b.length);
    return shorterLength / longerLength * 0.9; // 90% for partial contains
  }
  
  // Word-by-word matching
  const words1 = a.split(/\s+/);
  const words2 = b.split(/\s+/);
  let matchedWords = 0;
  
  for (const word1 of words1) {
    if (word1.length <= 2) continue; // Skip very short words
    for (const word2 of words2) {
      if (word2.length <= 2) continue;
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchedWords++;
        break;
      }
    }
  }
  
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  return totalUniqueWords > 0 ? matchedWords / totalUniqueWords * 0.8 : 0;
}

// Parse a date string into a proper DB date format (YYYY-MM-DD)
function parseDate(dateString: string): string {
  try {
    // First try direct parsing
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Check for common date formats (e.g., "Tuesday, Apr 16, 2025")
    const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    // Remove day of week and try to parse
    const cleanedDate = dateString.replace(/^[a-z]+,\s+/i, '');
    const parts = cleanedDate.split(/[,\s]+/);
    
    if (parts.length >= 3) {
      // Try to find month, day, year pattern
      let monthIdx = -1;
      let dayIdx = -1;
      let yearIdx = -1;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].toLowerCase();
        // Check if it's a month
        const monthKey = part.substring(0, 3);
        if (monthMap[monthKey] !== undefined) {
          monthIdx = i;
          continue;
        }
        
        // Check if it's a day (1-31)
        const dayNum = parseInt(part);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          dayIdx = i;
          continue;
        }
        
        // Check if it's a year (2023-2030)
        const yearNum = parseInt(part);
        if (!isNaN(yearNum) && yearNum >= 2023 && yearNum <= 2030) {
          yearIdx = i;
          continue;
        }
      }
      
      // If we found all components, construct date
      if (monthIdx >= 0 && dayIdx >= 0 && yearIdx >= 0) {
        const month = monthMap[parts[monthIdx].substring(0, 3).toLowerCase()];
        const day = parseInt(parts[dayIdx]);
        const year = parseInt(parts[yearIdx]);
        
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

// -- Event scraping from Songkick --

async function scrapeCityEvents(city: string, region: string) {
  try {
    console.log(`Searching for events in ${city}, ${region}`);
    const formattedCity = encodeURIComponent(city.toLowerCase());
    const url = `https://www.songkick.com/metro-areas/search?query=${formattedCity}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find the first metro area result
    const metroLinks = $('.metro-areas .metro-area a.url');
    if (metroLinks.length === 0) {
      console.log(`No metro area found for ${city}, ${region}`);
      return [];
    }
    
    // Select the first result
    const metroUrl = 'https://www.songkick.com' + $(metroLinks[0]).attr('href');
    console.log(`Found metro area URL: ${metroUrl}`);
    
    // Get the calendar page for this metro area
    const calendarUrl = `${metroUrl}/calendar`;
    console.log(`Fetching events from: ${calendarUrl}`);
    
    const calendarResponse = await axios.get(calendarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const calendar$ = cheerio.load(calendarResponse.data);
    
    // Parse event listings
    const eventsList = [];
    const eventElements = calendar$('.event-listings .event-listing');
    console.log(`Found ${eventElements.length} events in ${city}`);
    
    eventElements.each((i, el) => {
      if (i >= EVENTS_PER_CITY) return false; // Limit number of events
      
      // Get event date
      const dateEl = calendar$(el).find('.event-listing-date');
      const dateText = calendar$(dateEl).text().trim();
      
      // Get artist name
      const artistName = calendar$(el).find('.event-listing-title').text().trim();
      
      // Get venue details
      const venueDetailsEl = calendar$(el).find('.event-listing-venue-location');
      const venueName = venueDetailsEl.find('.event-listing-venue').text().trim();
      const venueLocation = venueDetailsEl.find('.event-listing-location').text().trim();
      
      // Get event URL
      const eventUrl = 'https://www.songkick.com' + calendar$(el).find('a.event-link').attr('href');
      
      eventsList.push({
        date: dateText,
        artistName,
        venueName,
        venueLocation,
        eventUrl
      });
    });
    
    console.log(`Processed ${eventsList.length} events in ${city}`);
    return eventsList;
  } catch (error: any) {
    console.error(`Error scraping events for ${city}, ${region}:`, error.message);
    return [];
  }
}

// -- Database operations --

// Find the best matching venue in our database
async function findMatchingVenue(scrapedVenueName: string, scrapedLocation: string, city: string, region: string) {
  try {
    // Query venues in this city
    const cityVenues = await db
      .select()
      .from(venues)
      .where(and(
        eq(venues.city, city),
        region ? eq(venues.region, region) : undefined
      ));
    
    if (cityVenues.length === 0) {
      console.log(`No venues found in database for ${city}, ${region}`);
      return null;
    }
    
    // Calculate similarity scores for each venue
    const scoredVenues = cityVenues.map(venue => {
      const nameScore = similarityScore(venue.name, scrapedVenueName);
      return {
        venue,
        score: nameScore
      };
    });
    
    // Sort by score (descending)
    scoredVenues.sort((a, b) => b.score - a.score);
    
    // If the best score is good enough, return that venue
    if (scoredVenues[0] && scoredVenues[0].score > 0.5) {
      console.log(`Found venue match: "${scrapedVenueName}" -> "${scoredVenues[0].venue.name}" (score: ${scoredVenues[0].score.toFixed(2)})`);
      return scoredVenues[0].venue;
    }
    
    console.log(`No good venue match found for "${scrapedVenueName}" in ${city}. Best match: "${scoredVenues[0]?.venue.name}" (score: ${scoredVenues[0]?.score.toFixed(2)})`);
    return null;
  } catch (error) {
    console.error(`Error finding matching venue for ${scrapedVenueName}:`, error);
    return null;
  }
}

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
      description: `${artistName} is an artist we found through city event listings.`
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

// Process a batch of events for a city
async function processCityEvents(city: string, region: string) {
  console.log(`\nProcessing events for ${city}, ${region || 'N/A'}`);
  
  // Scrape events for this city
  const cityEvents = await scrapeCityEvents(city, region || '');
  
  if (cityEvents.length === 0) {
    console.log(`No events found for ${city}`);
    return {
      eventsCreated: 0,
      artistsCreated: 0,
      existingArtistsUsed: 0,
      venuesMatched: 0,
      venuesNotMatched: 0
    };
  }
  
  let eventsCreated = 0;
  let artistsCreated = 0;
  let existingArtistsUsed = 0;
  let venuesMatched = 0;
  let venuesNotMatched = 0;
  
  // Process each event
  for (const eventData of cityEvents) {
    try {
      // Find matching venue in our database
      const matchedVenue = await findMatchingVenue(
        eventData.venueName,
        eventData.venueLocation,
        city, 
        region || ''
      );
      
      // Skip if no matching venue
      if (!matchedVenue) {
        venuesNotMatched++;
        continue;
      }
      
      venuesMatched++;
      
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
      const event = await createEvent(matchedVenue.id, artist.id, eventDate);
      if (event) eventsCreated++;
      
      // Add a small delay to avoid overloading the database
      await setTimeout(50);
    } catch (error) {
      console.error(`Error processing event: ${eventData.artistName} at ${eventData.venueName}:`, error);
    }
  }
  
  return {
    eventsCreated,
    artistsCreated,
    existingArtistsUsed,
    venuesMatched,
    venuesNotMatched
  };
}

// Main function to fetch events for all cities
async function scrapeEventsByCity() {
  try {
    console.log('Starting city-based event scraping...');
    
    // Get unique cities from venues
    const citiesResult = await db
      .select({ 
        city: venues.city, 
        region: venues.region 
      })
      .from(venues)
      .groupBy(venues.city, venues.region);
    
    const cities = citiesResult.filter(c => c.city && c.city.trim() !== '');
    console.log(`Found ${cities.length} unique cities with venues`);
    
    // Limit to MAX_CITIES
    const citiesToProcess = cities.slice(0, MAX_CITIES);
    console.log(`Processing ${citiesToProcess.length} cities: ${citiesToProcess.map(c => `${c.city}, ${c.region || 'N/A'}`).join('; ')}`);
    
    let totalEventsCreated = 0;
    let totalArtistsCreated = 0;
    let totalExistingArtistsUsed = 0;
    let totalVenuesMatched = 0;
    let totalVenuesNotMatched = 0;
    
    // Process each city
    for (const cityData of citiesToProcess) {
      const result = await processCityEvents(cityData.city, cityData.region || '');
      
      totalEventsCreated += result.eventsCreated;
      totalArtistsCreated += result.artistsCreated;
      totalExistingArtistsUsed += result.existingArtistsUsed;
      totalVenuesMatched += result.venuesMatched;
      totalVenuesNotMatched += result.venuesNotMatched;
      
      // Add delay between cities
      console.log(`Pausing before next city...`);
      await setTimeout(3000);
    }
    
    // Print summary
    console.log('\nCity event scraping completed!');
    console.log(`Processed ${citiesToProcess.length} cities`);
    console.log(`Venues matched: ${totalVenuesMatched}`);
    console.log(`Venues not matched: ${totalVenuesNotMatched}`);
    console.log(`Created ${totalEventsCreated} new events`);
    console.log(`Created ${totalArtistsCreated} new artists`);
    console.log(`Used ${totalExistingArtistsUsed} existing artists`);
    
  } catch (error) {
    console.error('Error in city event scraping:', error);
  }
}

// -- Run the script --

// Check for a specific city in arguments (for testing)
const specificCity = process.argv[2];
const specificRegion = process.argv[3];

async function run() {
  if (specificCity) {
    // Process just one city for testing
    console.log(`Testing with single city: ${specificCity}, ${specificRegion || 'N/A'}`);
    await processCityEvents(specificCity, specificRegion || '');
  } else {
    // Process all cities (up to MAX_CITIES)
    await scrapeEventsByCity();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });