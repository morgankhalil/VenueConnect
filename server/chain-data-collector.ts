/**
 * Chained Data Collection System
 * 
 * This script implements an organic data collection approach that:
 * 1. Starts with existing venues in our database
 * 2. Fetches real events for these venues (from Bandsintown API)
 * 3. Discovers new artists from these events and adds them to our database
 * 4. Finds other venues where these artists play (expanding our venue database)
 * 5. Repeats the cycle to create an authentic, interconnected dataset
 */

import axios from 'axios';
import { db } from './db';
import { venues, artists, events, artistGenres, genres, venueGenres } from '../shared/schema';
import { eq, and, or, sql, inArray, like, not, isNull } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';
import { setTimeout } from 'timers/promises';

// Initialize logger
const logger = new SyncLogger('ChainDataCollector');

// Configuration
const BATCH_SIZE = 5; // Number of items to process in each batch
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between API requests to avoid rate limits
const DELAY_BETWEEN_BATCHES = 5000; // 5 second delay between batches
const MAX_CHAIN_DEPTH = 3; // Maximum depth for venue-artist-venue chain exploration

// API configuration
const BANDSINTOWN_BASE_URL = 'https://rest.bandsintown.com';

// Check for API key
if (!process.env.BANDSINTOWN_API_KEY) {
  logger.error('BANDSINTOWN_API_KEY environment variable is not set. This script requires a valid API key.');
  process.exit(1);
}

const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;

/**
 * Get all venues from the database or a subset based on parameters
 */
async function getSourceVenues(limit: number = 0, offset: number = 0) {
  try {
    let query = db.select().from(venues);
    
    // Apply limit if specified
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    // Apply offset if specified
    if (offset > 0) {
      query = query.offset(offset);
    }
    
    const venuesList = await query;
    logger.info(`Retrieved ${venuesList.length} venues from database`);
    return venuesList;
  } catch (error) {
    logger.error(`Error retrieving venues: ${error}`);
    return [];
  }
}

/**
 * Get all events for a venue from Bandsintown
 */
async function getVenueEvents(venue: any) {
  try {
    // Bandsintown doesn't have a direct venue events endpoint, so we'll work around this limitation
    // by searching for the venue in our local database and then finding artists who have played there
    
    logger.info(`Getting events for venue: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
    
    // First approach: If we have existing venue events in our database, use those artists to find the venue's upcoming events
    const existingEvents = await db
      .select({
        artistId: events.artistId
      })
      .from(events)
      .where(eq(events.venueId, venue.id));
    
    if (existingEvents.length === 0) {
      logger.info(`No existing events found for venue ${venue.name} in database`);
      return [];
    }
    
    // Get unique artist IDs
    const artistIds = [...new Set(existingEvents.map(e => e.artistId))];
    
    // Get artist details
    const venueArtists = await db
      .select()
      .from(artists)
      .where(inArray(artists.id, artistIds));
    
    logger.info(`Found ${venueArtists.length} artists who have previously played at ${venue.name}`);
    
    // For each artist, get their upcoming events from Bandsintown
    const allEvents: any[] = [];
    
    for (const artist of venueArtists) {
      // Skip artists without a name
      if (!artist.name) continue;
      
      // Check if we should perform API request or we already have this artist's events
      const existingArtistEvents = await db
        .select()
        .from(events)
        .where(and(
          eq(events.artistId, artist.id),
          eq(events.sourceName, 'bandsintown'),
          sql`date(${events.date}) >= date('now')`
        ));
      
      if (existingArtistEvents.length > 0) {
        logger.info(`Using ${existingArtistEvents.length} existing events for artist ${artist.name}`);
        
        // Filter for events at this venue
        const venueEvents = existingArtistEvents.filter(e => e.venueId === venue.id);
        allEvents.push(...venueEvents);
        continue;
      }
      
      // Get artist events from Bandsintown
      try {
        logger.info(`Fetching events for artist: ${artist.name}`);
        const encodedName = encodeURIComponent(artist.name);
        const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}/events?app_id=${BANDSINTOWN_API_KEY}`;
        
        const response = await axios.get(url);
        
        if (response.data && Array.isArray(response.data)) {
          // Filter events for this specific venue
          const venueEvents = response.data.filter(event => {
            // Direct match by name and city
            const eventVenueName = event.venue.name.toLowerCase();
            const eventVenueCity = event.venue.city.toLowerCase();
            const ourVenueName = venue.name.toLowerCase();
            const ourVenueCity = venue.city.toLowerCase();
            
            // Check for match
            return (
              eventVenueName.includes(ourVenueName) || ourVenueName.includes(eventVenueName)
            ) && (
              eventVenueCity.includes(ourVenueCity) || ourVenueCity.includes(eventVenueCity)
            );
          });
          
          logger.info(`Found ${venueEvents.length} events at ${venue.name} for artist ${artist.name}`);
          allEvents.push(...venueEvents.map(e => ({
            ...e,
            artistId: artist.id, // Add our database artist ID
            venueId: venue.id // Add our database venue ID
          })));
        }
      } catch (error: any) {
        if (error.response && error.response.status === 429) {
          logger.warn(`Rate limited when fetching events for artist ${artist.name}. Pausing...`);
          await setTimeout(10000); // Wait 10 seconds before continuing
        } else if (error.response && error.response.status === 404) {
          logger.warn(`Artist not found on Bandsintown: ${artist.name}`);
        } else {
          logger.error(`Error fetching events for artist ${artist.name}: ${error.message}`);
        }
      }
      
      // Add delay between requests to be nice to the API
      await setTimeout(DELAY_BETWEEN_REQUESTS);
    }
    
    logger.info(`Total events found for venue ${venue.name}: ${allEvents.length}`);
    return allEvents;
  } catch (error: any) {
    logger.error(`Error getting venue events: ${error.message}`);
    return [];
  }
}

/**
 * Create or get an artist in our database
 */
async function createOrGetArtist(artistData: any) {
  try {
    const artistName = artistData.name;
    
    // Check if artist already exists by name
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (existingArtist.length > 0) {
      logger.info(`Artist already exists: ${artistName}`);
      return existingArtist[0];
    }
    
    // If we have a Bandsintown ID, also check for that
    if (artistData.id) {
      const existingByBandsintownId = await db
        .select()
        .from(artists)
        .where(eq(artists.bandsintownId, artistData.id));
      
      if (existingByBandsintownId.length > 0) {
        logger.info(`Artist exists with Bandsintown ID: ${artistData.id}`);
        return existingByBandsintownId[0];
      }
    }
    
    // Create new artist with all available data
    logger.info(`Creating new artist: ${artistName}`);
    
    // Get additional artist info from Bandsintown if not already provided
    let artistInfo = artistData;
    
    if (!artistData.thumb_url && !artistData.image_url && !artistData.facebook_page_url) {
      try {
        logger.info(`Fetching additional info for artist: ${artistName}`);
        const encodedName = encodeURIComponent(artistName);
        const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}?app_id=${BANDSINTOWN_API_KEY}`;
        
        const response = await axios.get(url);
        artistInfo = { ...artistData, ...response.data };
        
        // Add delay between requests
        await setTimeout(DELAY_BETWEEN_REQUESTS);
      } catch (error: any) {
        logger.warn(`Could not fetch additional artist info for ${artistName}: ${error.message}`);
      }
    }
    
    // Calculate popularity based on tracker_count if available, or default to 50
    const popularity = artistInfo.tracker_count 
      ? Math.min(100, Math.max(1, Math.floor(Math.log10(artistInfo.tracker_count) * 20)))
      : 50;
    
    // Insert artist into database
    const [newArtist] = await db.insert(artists).values({
      name: artistName,
      bandsintownId: artistInfo.id || null,
      popularity: popularity,
      imageUrl: artistInfo.image_url || artistInfo.thumb_url || null,
      website: artistInfo.facebook_page_url || artistInfo.url || null,
    }).returning();
    
    // If we have additional artist info, try to determine genres
    // For now, we'll leave this open for future enhancement
    // You could implement genre detection based on artist tags, similar artists, etc.
    
    return newArtist;
  } catch (error) {
    logger.error(`Error creating/getting artist: ${error}`);
    throw error;
  }
}

/**
 * Create or get a venue in our database
 */
async function createOrGetVenue(venueData: any) {
  try {
    // First check if venue exists by name and city
    const venueName = venueData.name;
    const venueCity = venueData.city;
    
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
    
    // If we have a venue ID, also check for that
    if (venueData.id) {
      const existingByBandsintownId = await db
        .select()
        .from(venues)
        .where(eq(venues.bandsintownId, venueData.id));
      
      if (existingByBandsintownId.length > 0) {
        logger.info(`Venue exists with Bandsintown ID: ${venueData.id}`);
        return existingByBandsintownId[0];
      }
    }
    
    // Create new venue
    logger.info(`Creating new venue: ${venueName} in ${venueCity}, ${venueData.country}`);
    
    const [newVenue] = await db.insert(venues).values({
      name: venueName,
      city: venueCity,
      region: venueData.region || null,
      country: venueData.country || 'US',
      address: venueData.address || null,
      latitude: venueData.latitude || null,
      longitude: venueData.longitude || null,
      capacity: venueData.capacity || null,
      bandsintownId: venueData.id || null,
      // Additional fields can be set later in the process
    }).returning();
    
    return newVenue;
  } catch (error) {
    logger.error(`Error creating/getting venue: ${error}`);
    throw error;
  }
}

/**
 * Create or update an event in our database
 */
async function createOrUpdateEvent(eventData: any, artistId: number, venueId: number) {
  try {
    // Parse date
    const eventDate = new Date(eventData.datetime || eventData.date);
    const dateString = eventDate.toISOString().split('T')[0];
    const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);
    
    // First check if event already exists
    const existingEvent = await db
      .select()
      .from(events)
      .where(and(
        eq(events.venueId, venueId),
        eq(events.artistId, artistId),
        eq(events.date, dateString)
      ));
    
    // If event exists, update it with any new information
    if (existingEvent.length > 0) {
      logger.info(`Event already exists: ${dateString}`);
      
      // Update the event with any new information
      await db
        .update(events)
        .set({
          status: eventData.status || 'confirmed',
          ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
          sourceId: eventData.id || existingEvent[0].sourceId,
          sourceName: 'bandsintown'
        })
        .where(eq(events.id, existingEvent[0].id));
      
      return existingEvent[0];
    }
    
    // Create new event
    logger.info(`Creating new event on ${dateString}`);
    const [newEvent] = await db.insert(events).values({
      artistId,
      venueId,
      date: dateString,
      startTime: timeString || '20:00',
      status: eventData.status || 'confirmed',
      ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
      sourceId: eventData.id || null,
      sourceName: 'bandsintown'
    }).returning();
    
    return newEvent;
  } catch (error) {
    logger.error(`Error creating/updating event: ${error}`);
    throw error;
  }
}

/**
 * Get artist events from Bandsintown
 */
async function getArtistEvents(artist: any) {
  try {
    if (!artist.name) {
      logger.warn('Cannot fetch events for artist with no name');
      return [];
    }
    
    logger.info(`Fetching events for artist: ${artist.name}`);
    const encodedName = encodeURIComponent(artist.name);
    const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}/events?app_id=${BANDSINTOWN_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (!response.data || !Array.isArray(response.data)) {
      logger.warn(`No valid event data returned for artist: ${artist.name}`);
      return [];
    }
    
    logger.info(`Found ${response.data.length} events for artist ${artist.name}`);
    return response.data;
  } catch (error: any) {
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
 * Process a venue's events, extracting artists and creating database records
 */
async function processVenueEvents(venue: any, chainDepth: number = 0) {
  try {
    logger.info(`Processing events for venue: ${venue.name} (depth: ${chainDepth})`);
    
    // Skip if we're too deep in the chain
    if (chainDepth >= MAX_CHAIN_DEPTH) {
      logger.info(`Reached maximum chain depth (${MAX_CHAIN_DEPTH}) for venue ${venue.name}`);
      return {
        eventsProcessed: 0,
        artistsDiscovered: 0,
        venuesDiscovered: 0
      };
    }
    
    // Get venue events
    const venueEvents = await getVenueEvents(venue);
    
    if (venueEvents.length === 0) {
      logger.info(`No events found for venue: ${venue.name}`);
      return {
        eventsProcessed: 0,
        artistsDiscovered: 0,
        venuesDiscovered: 0
      };
    }
    
    let artistsDiscovered = 0;
    let eventsProcessed = 0;
    let venuesDiscovered = 0;
    
    // Process each event
    for (const eventData of venueEvents) {
      try {
        // Get or create artist
        const artistData = eventData.artist || { name: eventData.artistName || eventData.lineup?.[0] };
        if (!artistData || !artistData.name) {
          logger.warn(`Skipping event with missing artist information`);
          continue;
        }
        
        const artist = await createOrGetArtist(artistData);
        
        // Check if this is a newly discovered artist
        if (artist.createdAt && new Date(artist.createdAt).getTime() > Date.now() - 10000) {
          artistsDiscovered++;
        }
        
        // Get or create venue (this should usually be our current venue, but might be different)
        const venueData = eventData.venue || {
          name: venue.name,
          city: venue.city,
          region: venue.region,
          country: venue.country
        };
        
        const eventVenue = await createOrGetVenue(venueData);
        
        // Check if this is a newly discovered venue
        if (eventVenue.id !== venue.id && eventVenue.createdAt && 
            new Date(eventVenue.createdAt).getTime() > Date.now() - 10000) {
          venuesDiscovered++;
        }
        
        // Create or update event
        await createOrUpdateEvent(eventData, artist.id, eventVenue.id);
        eventsProcessed++;
        
      } catch (error) {
        logger.error(`Error processing event: ${error}`);
        continue;
      }
    }
    
    return {
      eventsProcessed,
      artistsDiscovered,
      venuesDiscovered
    };
  } catch (error) {
    logger.error(`Error processing venue events: ${error}`);
    return {
      eventsProcessed: 0,
      artistsDiscovered: 0,
      venuesDiscovered: 0
    };
  }
}

/**
 * Process an artist's events, discovering new venues
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
    
    // Get artist events
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
        
        // Get or create venue
        const venueData = eventData.venue;
        const venue = await createOrGetVenue(venueData);
        
        // Check if this is a newly discovered venue
        if (venue.createdAt && new Date(venue.createdAt).getTime() > Date.now() - 10000) {
          venuesDiscovered++;
        }
        
        // Create or update event
        await createOrUpdateEvent(eventData, artist.id, venue.id);
        eventsProcessed++;
        
      } catch (error) {
        logger.error(`Error processing artist event: ${error}`);
        continue;
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
 * Find undiscovered artists (artists with no events)
 */
async function findUndiscoveredArtists(limit: number = 10) {
  try {
    const undiscoveredArtists = await db
      .select()
      .from(artists)
      .where(not(inArray(
        artists.id, 
        db.select({ id: events.artistId }).from(events)
      )))
      .limit(limit);
    
    logger.info(`Found ${undiscoveredArtists.length} artists with no events`);
    return undiscoveredArtists;
  } catch (error) {
    logger.error(`Error finding undiscovered artists: ${error}`);
    return [];
  }
}

/**
 * Find undiscovered venues (venues with no events)
 */
async function findUndiscoveredVenues(limit: number = 10) {
  try {
    const undiscoveredVenues = await db
      .select()
      .from(venues)
      .where(not(inArray(
        venues.id, 
        db.select({ id: events.venueId }).from(events)
      )))
      .limit(limit);
    
    logger.info(`Found ${undiscoveredVenues.length} venues with no events`);
    return undiscoveredVenues;
  } catch (error) {
    logger.error(`Error finding undiscovered venues: ${error}`);
    return [];
  }
}

/**
 * Run the chained collection process, starting from venues
 */
async function runChainedCollection(
  startingVenueLimit: number = 5, 
  maxVenueDepth: number = MAX_CHAIN_DEPTH,
  maxArtistDepth: number = MAX_CHAIN_DEPTH
) {
  try {
    logger.info('Starting chained data collection process');
    
    // Start with a limited set of venues from our database
    const initialVenues = await getSourceVenues(startingVenueLimit);
    
    if (initialVenues.length === 0) {
      logger.error('No venues found in database to start collection process');
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
        // Step 1: Process events for this venue (depth 0)
        const venueResults = await processVenueEvents(venue, 0);
        
        totalEventsProcessed += venueResults.eventsProcessed;
        totalArtistsDiscovered += venueResults.artistsDiscovered;
        totalVenuesDiscovered += venueResults.venuesDiscovered;
        
        // Step 2: Get recently discovered artists from this venue
        // We'll process artists that have events at this venue
        const recentArtists = await db
          .select({ artistId: events.artistId })
          .from(events)
          .where(eq(events.venueId, venue.id))
          .groupBy(events.artistId)
          .limit(5); // Limit to 5 artists per venue
        
        if (recentArtists.length > 0) {
          logger.info(`Found ${recentArtists.length} artists to chain from venue ${venue.name}`);
          
          // Get artist details
          const artistIds = recentArtists.map(a => a.artistId);
          const artistsToProcess = await db
            .select()
            .from(artists)
            .where(inArray(artists.id, artistIds));
          
          // Process each artist to discover new venues
          for (const artist of artistsToProcess) {
            // Add delay between artists
            await setTimeout(DELAY_BETWEEN_REQUESTS);
            
            // Process artist events (depth 1)
            const artistResults = await processArtistEvents(artist, 1);
            
            totalEventsProcessed += artistResults.eventsProcessed;
            totalVenuesDiscovered += artistResults.venuesDiscovered;
            
            // Step 3: If we discovered new venues, process those venues
            if (artistResults.venuesDiscovered > 0 && maxVenueDepth > 1) {
              // Get recently discovered venues for this artist
              const newVenues = await db
                .select({ venueId: events.venueId })
                .from(events)
                .where(eq(events.artistId, artist.id))
                .groupBy(events.venueId)
                .limit(3); // Limit to 3 venues per artist
              
              const venueIds = newVenues.map(v => v.venueId);
              const venuesToProcess = await db
                .select()
                .from(venues)
                .where(inArray(venues.id, venueIds));
              
              // Process each new venue to depth 2
              for (const newVenue of venuesToProcess) {
                // Only process venues that are not our original venue
                if (newVenue.id !== venue.id) {
                  await setTimeout(DELAY_BETWEEN_REQUESTS);
                  
                  // Process venue events (depth 2)
                  const newVenueResults = await processVenueEvents(newVenue, 2);
                  
                  totalEventsProcessed += newVenueResults.eventsProcessed;
                  totalArtistsDiscovered += newVenueResults.artistsDiscovered;
                  totalVenuesDiscovered += newVenueResults.venuesDiscovered;
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
    
    // Process any undiscovered venues
    const undiscoveredVenues = await findUndiscoveredVenues(3);
    if (undiscoveredVenues.length > 0) {
      logger.info(`Processing ${undiscoveredVenues.length} venues with no events`);
      
      for (const venue of undiscoveredVenues) {
        const venueResults = await processVenueEvents(venue, 0);
        
        totalEventsProcessed += venueResults.eventsProcessed;
        totalArtistsDiscovered += venueResults.artistsDiscovered;
        totalVenuesDiscovered += venueResults.venuesDiscovered;
        
        await setTimeout(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    // Process any undiscovered artists
    const undiscoveredArtists = await findUndiscoveredArtists(3);
    if (undiscoveredArtists.length > 0) {
      logger.info(`Processing ${undiscoveredArtists.length} artists with no events`);
      
      for (const artist of undiscoveredArtists) {
        const artistResults = await processArtistEvents(artist, 0);
        
        totalEventsProcessed += artistResults.eventsProcessed;
        totalVenuesDiscovered += artistResults.venuesDiscovered;
        
        await setTimeout(DELAY_BETWEEN_REQUESTS);
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
 * Main function to run the script
 */
async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const venueLimit = args[0] ? parseInt(args[0]) : 5;
    const maxDepth = args[1] ? parseInt(args[1]) : MAX_CHAIN_DEPTH;
    
    // Verify API key before starting
    logger.info(`Using Bandsintown API key: ${BANDSINTOWN_API_KEY.substring(0, 4)}...${BANDSINTOWN_API_KEY.substring(BANDSINTOWN_API_KEY.length - 4)}`);
    
    // Run the chained collection process
    await runChainedCollection(venueLimit, maxDepth, maxDepth);
    
    logger.info('Data collection process completed successfully');
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

// Run the script if called directly
if (require.main === module) {
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
  processVenueEvents,
  processArtistEvents,
  findUndiscoveredVenues,
  findUndiscoveredArtists
};