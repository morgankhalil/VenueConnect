/**
 * Chained Data Collection System using Web Scraping
 * 
 * This script implements an organic data collection approach that:
 * 1. Starts with existing venues in our database
 * 2. Scrapes their websites for upcoming events and artists
 * 3. Adds discovered artists to our database
 * 4. Uses Bandsintown API to find where else these artists play
 * 5. Adds those new venues to our database and continues the chain
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { venues, artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, gt, sql, or, like, not, isNull } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';
import { setTimeout } from 'timers/promises';

// Initialize logger
const logger = new SyncLogger('ChainScraper');

// Configuration
const BATCH_SIZE = 5; // Number of items to process in each batch
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between API requests to avoid rate limits
const DELAY_BETWEEN_BATCHES = 5000; // 5 second delay between batches
const MAX_CHAIN_DEPTH = 2; // Maximum depth for venue-artist-venue chain exploration

// API configuration for Bandsintown (for artist data only)
const BANDSINTOWN_BASE_URL = 'https://rest.bandsintown.com';
const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_API_KEY || 'venueconnect';

// Venue scraping helpers
const VENUE_WEBSITES = {
  // Sample mapping of venue IDs to their websites and selectors
  // We'll populate this dynamically from the database
};

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
    logger.warn(`Unable to parse date string: ${dateString}`);
    return dateString;
  } catch (error) {
    logger.warn(`Error parsing date string: ${dateString}`);
    return dateString;
  }
}

/**
 * Get all venues from the database or a subset based on parameters
 */
async function getSourceVenues(limit: number = 0, offset: number = 0) {
  try {
    let query = db.select().from(venues);
    
    // Filter for venues with website URLs 
    query = query.where(not(isNull(venues.websiteUrl)));
    
    // Apply limit if specified
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    // Apply offset if specified
    if (offset > 0) {
      query = query.offset(offset);
    }
    
    const venuesList = await query;
    logger.info(`Retrieved ${venuesList.length} venues with websites from database`);
    return venuesList;
  } catch (error) {
    logger.error(`Error retrieving venues: ${error}`);
    return [];
  }
}

/**
 * Try to determine the appropriate scraping strategy for a venue's website
 */
function determineScrapingStrategy(venue: any) {
  // If we don't have a website URL, can't scrape
  if (!venue.websiteUrl) {
    return null;
  }
  
  const url = venue.websiteUrl.toLowerCase();
  
  // Common platforms and their selectors
  if (url.includes('songkick.com')) {
    return {
      type: 'songkick',
      eventSelector: '.event-listings .event-listing',
      dateSelector: '.event-listing-date',
      artistSelector: '.event-listing-title'
    };
  } else if (url.includes('bandsintown.com')) {
    return {
      type: 'bandsintown',
      eventSelector: '.event-row',
      dateSelector: '.event-date',
      artistSelector: '.event-artist'
    };
  } else if (url.includes('ticketmaster.com')) {
    return {
      type: 'ticketmaster',
      eventSelector: '.event-listing',
      dateSelector: '.event-date',
      artistSelector: '.event-name'
    };
  } else {
    // Generic strategy - we'll try some common selectors
    return {
      type: 'generic',
      eventSelector: '.event, .events-list .event, .event-item, .calendar-event',
      dateSelector: '.date, .event-date, .calendar-date',
      artistSelector: '.artist, .event-title, .title, h3'
    };
  }
}

/**
 * Scrape events from a venue's website
 */
async function scrapeVenueEvents(venue: any) {
  try {
    // Skip if no website
    if (!venue.websiteUrl) {
      logger.warn(`No website URL for venue: ${venue.name}`);
      return [];
    }
    
    logger.info(`Scraping events for venue: ${venue.name} from ${venue.websiteUrl}`);
    
    // Determine scraping strategy
    const strategy = determineScrapingStrategy(venue);
    
    if (!strategy) {
      logger.warn(`No scraping strategy for venue: ${venue.name}`);
      return [];
    }
    
    // Try to find a calendar or events page
    let url = venue.websiteUrl;
    
    // If the URL doesn't end with a slash and doesn't have a file extension, add a slash
    if (!url.endsWith('/') && !url.match(/\.[a-z]{2,4}$/i)) {
      url += '/';
    }
    
    // Common events page paths
    const eventPaths = ['events', 'calendar', 'schedule', 'shows', 'concerts', 'live'];
    
    // Try the main URL first
    let response;
    try {
      response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    } catch (error) {
      logger.warn(`Error fetching main URL for ${venue.name}: ${error.message}`);
      
      // Try event paths
      let foundEvents = false;
      for (const path of eventPaths) {
        try {
          const eventUrl = url + path;
          logger.info(`Trying alternate URL: ${eventUrl}`);
          response = await axios.get(eventUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          foundEvents = true;
          break;
        } catch (err) {
          // Continue to next path
          continue;
        }
      }
      
      if (!foundEvents) {
        logger.error(`Could not find events page for venue: ${venue.name}`);
        return [];
      }
    }
    
    // Parse the page
    const $ = cheerio.load(response.data);
    
    // Find events
    const events = [];
    
    // Using our strategy selectors
    $(strategy.eventSelector).each((i, el) => {
      try {
        // Extract date
        let dateText = '';
        if ($(el).find(strategy.dateSelector).length > 0) {
          dateText = $(el).find(strategy.dateSelector).text().trim();
        }
        
        // Extract artist
        let artistName = '';
        if ($(el).find(strategy.artistSelector).length > 0) {
          artistName = $(el).find(strategy.artistSelector).text().trim();
        }
        
        // Skip if we don't have both pieces of information
        if (!dateText || !artistName) {
          return;
        }
        
        // Add to events
        events.push({
          date: dateText,
          artistName,
          venueName: venue.name
        });
      } catch (error) {
        logger.warn(`Error parsing event: ${error.message}`);
      }
    });
    
    logger.info(`Found ${events.length} events for venue: ${venue.name}`);
    return events;
  } catch (error) {
    logger.error(`Error scraping venue events: ${error.message}`);
    return [];
  }
}

/**
 * Try to search for a venue's events on Songkick (fallback option)
 */
async function searchSongkickVenue(venue: any) {
  try {
    logger.info(`Searching Songkick for venue: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
    
    // Try a more specific search with venue name AND city
    const searchName = formatVenueName(venue.name);
    const searchCity = venue.city.toLowerCase();
    const encodedSearch = encodeURIComponent(`${searchName} ${searchCity}`);
    
    // Try this search URL first
    const url = `https://www.songkick.com/search?query=${encodedSearch}&type=venues`;
    
    logger.info(`Using search URL: ${url}`);
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
      logger.info(`No Songkick results found for venue: ${venue.name}`);
      return null;
    }
    
    // Sort by match score
    venueResults.sort((a, b) => b.matchScore - a.matchScore);
    
    // Select best match
    const bestMatch = venueResults[0];
    logger.info(`Found Songkick venue: ${bestMatch.name} in ${bestMatch.location} (score: ${bestMatch.matchScore})`);
    
    return bestMatch;
  } catch (error) {
    logger.error(`Error searching Songkick for venue ${venue.name}: ${error.message}`);
    return null;
  }
}

/**
 * Get events from a venue's Songkick page
 */
async function getSongkickVenueEvents(venueUrl: string) {
  try {
    logger.info(`Fetching events from: ${venueUrl}`);
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
    
    logger.info(`Found ${events.length} upcoming events`);
    return events;
  } catch (error) {
    logger.error(`Error fetching venue events: ${error.message}`);
    return [];
  }
}

/**
 * Create or get an artist in our database
 */
async function createOrGetArtist(artistName: string) {
  try {
    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (existingArtist.length > 0) {
      logger.info(`Artist already exists: ${artistName}`);
      return existingArtist[0];
    }
    
    // Create new artist
    logger.info(`Creating new artist: ${artistName}`);
    
    // Try to get additional info from Bandsintown
    let bandsintownId = null;
    let imageUrl = null;
    let popularity = 50; // Default popularity
    
    try {
      // Look up artist on Bandsintown
      const encodedName = encodeURIComponent(artistName);
      const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}?app_id=${BANDSINTOWN_APP_ID}`;
      
      const response = await axios.get(url);
      
      if (response.data && response.data.id) {
        bandsintownId = response.data.id;
        imageUrl = response.data.image_url || response.data.thumb_url;
        
        // Calculate popularity based on tracker_count if available
        if (response.data.tracker_count) {
          popularity = Math.min(100, Math.max(1, Math.floor(Math.log10(response.data.tracker_count) * 20)));
        }
      }
    } catch (error) {
      logger.warn(`Could not fetch Bandsintown info for ${artistName}: ${error.message}`);
      // Continue without Bandsintown data
    }
    
    // Insert artist
    const [newArtist] = await db.insert(artists).values({
      name: artistName,
      bandsintownId,
      imageUrl,
      popularity
    }).returning();
    
    // Try to find an appropriate genre
    // This is a placeholder - in a real system, we'd analyze artist info to determine genre
    try {
      // Get the indie rock genre for now
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
    } catch (error) {
      logger.warn(`Error setting genre for artist ${artistName}: ${error}`);
    }
    
    return newArtist;
  } catch (error) {
    logger.error(`Error creating/getting artist ${artistName}: ${error}`);
    throw error;
  }
}

/**
 * Create or get a venue in our database
 */
async function createOrGetVenue(venueName: string, venueCity: string, venueRegion?: string, venueCountry?: string) {
  try {
    // Check if venue already exists
    const existingVenue = await db
      .select()
      .from(venues)
      .where(and(
        eq(venues.name, venueName),
        eq(venues.city, venueCity)
      ));
    
    if (existingVenue.length > 0) {
      logger.info(`Venue already exists: ${venueName} in ${venueCity}`);
      return existingVenue[0];
    }
    
    // Create new venue
    logger.info(`Creating new venue: ${venueName} in ${venueCity}`);
    
    const [newVenue] = await db.insert(venues).values({
      name: venueName,
      city: venueCity,
      region: venueRegion || null,
      country: venueCountry || 'US'
    }).returning();
    
    return newVenue;
  } catch (error) {
    logger.error(`Error creating/getting venue ${venueName}: ${error}`);
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
      logger.info(`Event already exists: ${date}`);
      return existingEvent[0];
    }
    
    // Create new event
    logger.info(`Creating new event on ${date}`);
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
    logger.error(`Error creating event: ${error}`);
    throw error;
  }
}

/**
 * Get artist events from Bandsintown API
 */
async function getArtistEvents(artist: any) {
  try {
    if (!artist.name) {
      logger.warn('Cannot fetch events for artist with no name');
      return [];
    }
    
    logger.info(`Fetching events for artist: ${artist.name}`);
    const encodedName = encodeURIComponent(artist.name);
    const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}/events?app_id=${BANDSINTOWN_APP_ID}`;
    
    const response = await axios.get(url);
    
    if (!response.data || !Array.isArray(response.data)) {
      logger.warn(`No valid event data returned for artist: ${artist.name}`);
      return [];
    }
    
    logger.info(`Found ${response.data.length} events for artist ${artist.name}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      logger.warn(`Rate limited when fetching events for artist ${artist.name}. Pausing...`);
      await setTimeout(10000); // Wait 10 seconds before continuing
      return [];
    } else if (error.response && error.response.status === 404) {
      logger.warn(`Artist not found on Bandsintown: ${artist.name}`);
      return [];
    } else {
      logger.error(`Error fetching events for artist ${artist.name}: ${error.message}`);
      return [];
    }
  }
}

/**
 * Process a venue's events from web scraping
 */
async function processVenueEventsScraping(venue: any, chainDepth: number = 0) {
  try {
    logger.info(`Processing events for venue: ${venue.name} (depth: ${chainDepth})`);
    
    // Skip if we're too deep in the chain
    if (chainDepth >= MAX_CHAIN_DEPTH) {
      logger.info(`Reached maximum chain depth (${MAX_CHAIN_DEPTH}) for venue ${venue.name}`);
      return {
        eventsProcessed: 0,
        artistsDiscovered: 0
      };
    }
    
    // Try direct website scraping first
    let venueEvents = await scrapeVenueEvents(venue);
    
    // If we can't get events directly, try Songkick as a fallback
    if (venueEvents.length === 0) {
      logger.info(`No events found from direct scraping for ${venue.name}, trying Songkick`);
      const songkickVenue = await searchSongkickVenue(venue);
      
      if (songkickVenue) {
        venueEvents = await getSongkickVenueEvents(songkickVenue.url);
      }
    }
    
    if (venueEvents.length === 0) {
      logger.info(`No events found for venue: ${venue.name}`);
      return {
        eventsProcessed: 0,
        artistsDiscovered: 0
      };
    }
    
    let eventsProcessed = 0;
    let artistsDiscovered = 0;
    
    // Process each event
    for (const eventData of venueEvents) {
      try {
        // Parse the date
        const eventDate = parseDate(eventData.date);
        
        // Create or get artist
        const artist = await createOrGetArtist(eventData.artistName);
        
        // If this was a new artist, increment counter
        if (artist.createdAt && new Date(artist.createdAt).getTime() > Date.now() - 10000) {
          artistsDiscovered++;
        }
        
        // Create event
        const event = await createEvent(venue.id, artist.id, eventDate);
        if (event) eventsProcessed++;
      } catch (error) {
        logger.error(`Error processing event: ${eventData.artistName} at ${venue.name}: ${error}`);
      }
    }
    
    return {
      eventsProcessed,
      artistsDiscovered
    };
  } catch (error) {
    logger.error(`Error processing venue events: ${error}`);
    return {
      eventsProcessed: 0,
      artistsDiscovered: 0
    };
  }
}

/**
 * Process an artist's events from Bandsintown
 */
async function processArtistEvents(artist: any, chainDepth: number = 0) {
  try {
    logger.info(`Processing events for artist: ${artist.name} (depth: ${chainDepth})`);
    
    // Skip if we're too deep in the chain
    if (chainDepth >= MAX_CHAIN_DEPTH) {
      logger.info(`Reached maximum chain depth (${MAX_CHAIN_DEPTH}) for artist ${artist.name}`);
      return {
        eventsProcessed: 0,
        venuesDiscovered: 0
      };
    }
    
    // Get artist events from Bandsintown
    const artistEvents = await getArtistEvents(artist);
    
    if (artistEvents.length === 0) {
      logger.info(`No events found for artist: ${artist.name}`);
      return {
        eventsProcessed: 0,
        venuesDiscovered: 0
      };
    }
    
    let eventsProcessed = 0;
    let venuesDiscovered = 0;
    
    // Process each event
    for (const eventData of artistEvents) {
      try {
        if (!eventData.venue) {
          logger.warn(`Skipping event with missing venue information`);
          continue;
        }
        
        // Parse the date
        const eventDate = parseDate(eventData.datetime || eventData.date);
        
        // Get or create venue
        const venue = await createOrGetVenue(
          eventData.venue.name,
          eventData.venue.city,
          eventData.venue.region,
          eventData.venue.country
        );
        
        // If this was a new venue, increment counter
        if (venue.createdAt && new Date(venue.createdAt).getTime() > Date.now() - 10000) {
          venuesDiscovered++;
        }
        
        // Create event
        const event = await createEvent(venue.id, artist.id, eventDate);
        if (event) eventsProcessed++;
      } catch (error) {
        logger.error(`Error processing artist event: ${error}`);
      }
    }
    
    return {
      eventsProcessed,
      venuesDiscovered
    };
  } catch (error) {
    logger.error(`Error processing artist events: ${error}`);
    return {
      eventsProcessed: 0,
      venuesDiscovered: 0
    };
  }
}

/**
 * Run the chained collection process
 */
async function runChainedCollection(startingVenueLimit: number = 5) {
  try {
    logger.info('Starting chained data collection process');
    
    // Start with venues from our database
    const initialVenues = await getSourceVenues(startingVenueLimit);
    
    if (initialVenues.length === 0) {
      logger.error('No venues with websites found in database to start collection process');
      return;
    }
    
    // Track total statistics
    let totalEventsProcessed = 0;
    let totalArtistsDiscovered = 0;
    let totalVenuesDiscovered = 0;
    
    // Process each venue in batches
    logger.info(`Processing ${initialVenues.length} venues in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < initialVenues.length; i += BATCH_SIZE) {
      const venueBatch = initialVenues.slice(i, i + BATCH_SIZE);
      
      logger.info(`Processing venue batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(initialVenues.length/BATCH_SIZE)}`);
      
      // Process venues sequentially within the batch
      for (const venue of venueBatch) {
        // Step 1: Scrape events for this venue (depth 0)
        const venueResults = await processVenueEventsScraping(venue, 0);
        
        totalEventsProcessed += venueResults.eventsProcessed;
        totalArtistsDiscovered += venueResults.artistsDiscovered;
        
        // Step 2: If we discovered artists, get their events
        if (venueResults.artistsDiscovered > 0) {
          // Get newly discovered artists
          const recentEvents = await db
            .select({ artistId: events.artistId })
            .from(events)
            .where(eq(events.venueId, venue.id))
            .groupBy(events.artistId)
            .limit(3); // Limit to 3 artists per venue for chaining
          
          const artistIds = recentEvents.map(e => e.artistId);
          const artistsToProcess = await db
            .select()
            .from(artists)
            .where(inArray(artists.id, artistIds));
          
          logger.info(`Processing ${artistsToProcess.length} artists discovered from venue ${venue.name}`);
          
          // Process each artist events (depth 1)
          for (const artist of artistsToProcess) {
            // Add delay between artists
            await setTimeout(DELAY_BETWEEN_REQUESTS);
            
            const artistResults = await processArtistEvents(artist, 1);
            
            totalEventsProcessed += artistResults.eventsProcessed;
            totalVenuesDiscovered += artistResults.venuesDiscovered;
            
            // Step 3: If we found new venues, process those
            if (artistResults.venuesDiscovered > 0) {
              // Find venues we've discovered through this artist
              const newVenues = await db
                .select({ venueId: events.venueId })
                .from(events)
                .where(eq(events.artistId, artist.id))
                .groupBy(events.venueId)
                .limit(2); // Limit to 2 venues per artist
              
              const venueIds = newVenues.map(v => v.venueId);
              const venuesToProcess = await db
                .select()
                .from(venues)
                .where(inArray(venues.id, venueIds));
              
              logger.info(`Processing ${venuesToProcess.length} venues discovered from artist ${artist.name}`);
              
              // Process each new venue (depth 2)
              for (const newVenue of venuesToProcess) {
                // Only process venues that are not our original venue
                if (newVenue.id !== venue.id) {
                  await setTimeout(DELAY_BETWEEN_REQUESTS);
                  
                  const newVenueResults = await processVenueEventsScraping(newVenue, 2);
                  
                  totalEventsProcessed += newVenueResults.eventsProcessed;
                  totalArtistsDiscovered += newVenueResults.artistsDiscovered;
                }
              }
            }
          }
        }
        
        // Add delay between venues in the batch
        await setTimeout(DELAY_BETWEEN_REQUESTS);
      }
      
      // Add delay between batches
      if (i + BATCH_SIZE < initialVenues.length) {
        logger.info(`Batch complete. Waiting before next batch...`);
        await setTimeout(DELAY_BETWEEN_BATCHES);
      }
    }
    
    // Print summary
    logger.info('\nChained data collection completed!');
    logger.info(`Total events processed: ${totalEventsProcessed}`);
    logger.info(`Total artists discovered: ${totalArtistsDiscovered}`);
    logger.info(`Total venues discovered: ${totalVenuesDiscovered}`);
    
  } catch (error) {
    logger.error(`Error in chained collection process: ${error}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const venueLimit = args[0] ? parseInt(args[0]) : 5;
    
    // Run the chained collection process
    await runChainedCollection(venueLimit);
    
    logger.info('Data collection process completed successfully');
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

// Run the script if it's the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main()
    .then(() => {
      logger.info('Script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Script failed: ${error}`);
      process.exit(1);
    });
}

// Export functions for use in other scripts
export {
  runChainedCollection,
  processVenueEventsScraping,
  processArtistEvents,
  scrapeVenueEvents,
  searchSongkickVenue,
  getSongkickVenueEvents
};