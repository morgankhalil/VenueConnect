/**
 * Venue-Artist Matcher
 * 
 * This script creates connections between venues and artists based on:
 * - Geographic proximity (artists are more likely to play venues in the same region)
 * - Genre compatibility (artists play at venues that match their genre)
 * - Venue capacity and artist popularity (matching appropriate size venues to artist popularity)
 */

import { db } from './db';
import { venues, artists, events, artistGenres, venueGenres, genres } from '../shared/schema';
import { eq, and, or, inArray, like, not, isNull, sql, desc, asc } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';
import { setTimeout } from 'timers/promises';

// Initialize logger
const logger = new SyncLogger('VenueArtistMatcher');

// Configuration
const BATCH_SIZE = 10; // Number of venues to process in each batch
const EVENTS_PER_VENUE = 5; // Target number of events per venue
const MAX_ARTIST_REUSE = 3; // Maximum times an artist can be reused across venues
const EVENT_DATE_RANGE_DAYS = 180; // Generate events up to this many days in the future

/**
 * Get artists that match a venue's genre profile
 */
async function getMatchingArtists(venue: any, limit: number = 10) {
  try {
    // Get the venue's genres
    const venueGenreData = await db
      .select({
        genreId: venueGenres.genreId
      })
      .from(venueGenres)
      .where(eq(venueGenres.venueId, venue.id));
    
    const venueGenreIds = venueGenreData.map(g => g.genreId);
    
    // If no genres are specified for the venue, get random artists
    if (venueGenreIds.length === 0) {
      logger.info(`No genres for venue ${venue.name}, using random artists`);
      return db
        .select()
        .from(artists)
        .limit(limit);
    }
    
    // Get artists with matching genres
    const matchingArtists = await db
      .select({
        artist: artists,
        genreMatches: sql`count(${artistGenres.genreId})`
      })
      .from(artists)
      .leftJoin(artistGenres, eq(artists.id, artistGenres.artistId))
      .where(inArray(artistGenres.genreId, venueGenreIds))
      .groupBy(artists.id)
      .orderBy(desc(sql`count(${artistGenres.genreId})`), desc(artists.popularity))
      .limit(limit);
    
    return matchingArtists.map(m => m.artist);
  } catch (error) {
    logger.error(`Error getting matching artists for venue ${venue.name}: ${error}`);
    return [];
  }
}

/**
 * Get venues in the same region as an artist's typical playing area
 */
async function getRegionalVenues(artist: any, limit: number = 10) {
  try {
    // Get the regions where the artist has played before
    const artistEvents = await db
      .select({
        venueId: events.venueId
      })
      .from(events)
      .where(eq(events.artistId, artist.id));
    
    if (artistEvents.length === 0) {
      logger.info(`No event history for artist ${artist.name}, using random venues`);
      return db
        .select()
        .from(venues)
        .limit(limit);
    }
    
    // Get the venues where the artist has played
    const venueIds = artistEvents.map(e => e.venueId);
    const artistVenues = await db
      .select()
      .from(venues)
      .where(inArray(venues.id, venueIds));
    
    // Get the regions where the artist has played
    const regions = [...new Set(artistVenues.map(v => v.region))].filter(Boolean);
    
    // Get venues in the same regions
    if (regions.length > 0) {
      return db
        .select()
        .from(venues)
        .where(inArray(venues.region, regions))
        .limit(limit);
    } else {
      // If no regions found, use cities
      const cities = [...new Set(artistVenues.map(v => v.city))].filter(Boolean);
      if (cities.length > 0) {
        return db
          .select()
          .from(venues)
          .where(inArray(venues.city, cities))
          .limit(limit);
      }
    }
    
    // Fallback to random venues
    return db
      .select()
      .from(venues)
      .limit(limit);
  } catch (error) {
    logger.error(`Error getting regional venues for artist ${artist.name}: ${error}`);
    return [];
  }
}

/**
 * Generate a future date for an event
 */
function generateEventDate() {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * EVENT_DATE_RANGE_DAYS) + 14; // Between 2 weeks and X days in future
  const eventDate = new Date(now);
  eventDate.setDate(now.getDate() + randomDays);
  
  // Format as YYYY-MM-DD
  return eventDate.toISOString().split('T')[0];
}

/**
 * Generate a start time for an event
 */
function generateEventTime() {
  // Most shows start between 7pm-10pm
  const hour = Math.floor(Math.random() * 4) + 19; // 19-22 (7pm-10pm)
  const minute = Math.random() < 0.5 ? '00' : '30'; // Either on the hour or half hour
  
  return `${hour}:${minute}`;
}

/**
 * Generate events for venues based on suitable artists
 */
async function generateEventsForVenue(venue: any, targetCount: number = EVENTS_PER_VENUE) {
  try {
    logger.info(`Generating events for venue: ${venue.name} in ${venue.city}`);
    
    // Check existing events
    const existingEvents = await db
      .select({
        eventId: events.id
      })
      .from(events)
      .where(and(
        eq(events.venueId, venue.id),
        sql`date(${events.date}) >= date('now')`
      ));
    
    const existingCount = existingEvents.length;
    logger.info(`Venue already has ${existingCount} upcoming events`);
    
    // Skip if already has enough events
    if (existingCount >= targetCount) {
      logger.info(`Venue ${venue.name} already has ${existingCount} events, skipping`);
      return {
        venue: venue.name,
        eventsAdded: 0,
        totalEvents: existingCount
      };
    }
    
    // Get matching artists for this venue
    const matchingArtists = await getMatchingArtists(venue, EVENTS_PER_VENUE * 2);
    
    if (matchingArtists.length === 0) {
      logger.warn(`No matching artists found for venue ${venue.name}`);
      return {
        venue: venue.name,
        eventsAdded: 0,
        totalEvents: existingCount
      };
    }
    
    logger.info(`Found ${matchingArtists.length} matching artists for ${venue.name}`);
    
    // Determine how many new events to create
    const eventsToCreate = Math.min(targetCount - existingCount, matchingArtists.length);
    
    // Create events
    let eventsAdded = 0;
    for (let i = 0; i < eventsToCreate; i++) {
      try {
        const artist = matchingArtists[i];
        
        // Generate event date and time
        const eventDate = generateEventDate();
        const startTime = generateEventTime();
        
        // Check if this would be a duplicate event
        const existingEvent = await db
          .select()
          .from(events)
          .where(and(
            eq(events.venueId, venue.id),
            eq(events.artistId, artist.id),
            eq(events.date, eventDate)
          ));
        
        if (existingEvent.length > 0) {
          logger.info(`Event already exists for ${artist.name} at ${venue.name} on ${eventDate}, skipping`);
          continue;
        }
        
        // Create the event
        const [newEvent] = await db
          .insert(events)
          .values({
            artistId: artist.id,
            venueId: venue.id,
            date: eventDate,
            startTime: startTime,
            status: 'confirmed',
            sourceName: 'system'
          })
          .returning();
        
        logger.info(`Created event: ${artist.name} at ${venue.name} on ${eventDate}`);
        eventsAdded++;
      } catch (error) {
        logger.error(`Error creating event: ${error}`);
      }
    }
    
    return {
      venue: venue.name,
      eventsAdded,
      totalEvents: existingCount + eventsAdded
    };
  } catch (error) {
    logger.error(`Error generating events for venue ${venue.name}: ${error}`);
    return {
      venue: venue.name,
      eventsAdded: 0,
      totalEvents: 0,
      error: `${error}`
    };
  }
}

/**
 * Add genres to venues based on the types of artists that play there
 */
async function enrichVenueGenres(venue: any) {
  try {
    // Get existing genres for this venue
    const existingGenres = await db
      .select({
        genreId: venueGenres.genreId
      })
      .from(venueGenres)
      .where(eq(venueGenres.venueId, venue.id));
    
    if (existingGenres.length >= 3) {
      logger.info(`Venue ${venue.name} already has ${existingGenres.length} genres, skipping`);
      return;
    }
    
    // Determine genres based on venue type
    const genresByVenueType: {[key: string]: string[]} = {
      'club': ['rock', 'indie', 'alternative', 'electronic', 'pop'],
      'bar': ['rock', 'indie', 'country', 'folk', 'blues', 'jazz'],
      'theater': ['classical', 'jazz', 'folk', 'indie', 'pop'],
      'arena': ['pop', 'rock', 'hip_hop', 'electronic'],
      'festival_grounds': ['rock', 'indie', 'electronic', 'pop', 'hip_hop', 'folk'],
      'amphitheater': ['rock', 'pop', 'country', 'classical'],
      'stadium': ['pop', 'rock', 'hip_hop', 'country'],
      'diy_space': ['indie', 'punk', 'alternative', 'experimental'],
      'coffeehouse': ['folk', 'indie', 'singer_songwriter', 'acoustic'],
      'art_gallery': ['experimental', 'electronic', 'ambient', 'classical'],
      'community_center': ['folk', 'world', 'jazz', 'classical'],
      'record_store': ['indie', 'rock', 'alternative', 'punk']
    };
    
    // Get default genres based on venue type
    let genresToAdd: string[] = [];
    if (venue.venueType && genresByVenueType[venue.venueType]) {
      // Select 2-3 random genres from the appropriate list
      const possibleGenres = genresByVenueType[venue.venueType];
      const numToAdd = Math.floor(Math.random() * 2) + 2; // 2-3 genres
      
      for (let i = 0; i < numToAdd; i++) {
        const randomIndex = Math.floor(Math.random() * possibleGenres.length);
        genresToAdd.push(possibleGenres[randomIndex]);
        possibleGenres.splice(randomIndex, 1); // Remove to avoid duplicates
        
        if (possibleGenres.length === 0) break;
      }
    } else {
      // Default to random genres
      const defaultGenres = ['rock', 'indie', 'pop', 'electronic', 'folk', 'hip_hop'];
      genresToAdd = defaultGenres.slice(0, 3);
    }
    
    // Get existing genre IDs to avoid duplicates
    const existingGenreIds = existingGenres.map(g => g.genreId);
    
    // Get genre IDs for the selected genres
    for (const genreName of genresToAdd) {
      try {
        // Get genre ID
        const genreResult = await db
          .select()
          .from(genres)
          .where(eq(genres.name, genreName));
        
        let genreId;
        if (genreResult.length > 0) {
          genreId = genreResult[0].id;
        } else {
          // Create genre if it doesn't exist
          const [newGenre] = await db
            .insert(genres)
            .values({
              name: genreName,
              description: `${genreName.charAt(0).toUpperCase() + genreName.slice(1)} music`
            })
            .returning();
          
          genreId = newGenre.id;
        }
        
        // Skip if genre already assigned to venue
        if (existingGenreIds.includes(genreId)) {
          continue;
        }
        
        // Add genre to venue
        await db
          .insert(venueGenres)
          .values({
            venueId: venue.id,
            genreId: genreId
          });
        
        logger.info(`Added genre ${genreName} to venue ${venue.name}`);
      } catch (error) {
        logger.error(`Error adding genre ${genreName} to venue ${venue.name}: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Error enriching venue genres for ${venue.name}: ${error}`);
  }
}

/**
 * Create and populate genres for selected artists
 */
async function enrichArtistGenres(artist: any) {
  try {
    // Get existing genres for this artist
    const existingGenres = await db
      .select({
        genreId: artistGenres.genreId
      })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, artist.id));
    
    if (existingGenres.length >= 2) {
      logger.info(`Artist ${artist.name} already has ${existingGenres.length} genres, skipping`);
      return;
    }
    
    // For now, assign random genres
    // In a real system, this would use the artist's bio, description, or API data
    const genresList = ['rock', 'indie', 'pop', 'electronic', 'folk', 'hip_hop', 
                       'alternative', 'punk', 'metal', 'jazz', 'blues', 'country', 
                       'r_and_b', 'soul', 'funk', 'reggae', 'world', 'classical', 
                       'experimental', 'ambient', 'techno', 'house', 'edm'];
    
    // Select 2-3 random genres
    const numGenres = Math.floor(Math.random() * 2) + 2; // 2-3 genres
    const genresToAdd: string[] = [];
    
    for (let i = 0; i < numGenres; i++) {
      const randomIndex = Math.floor(Math.random() * genresList.length);
      genresToAdd.push(genresList[randomIndex]);
      genresList.splice(randomIndex, 1); // Remove to avoid duplicates
    }
    
    // Get existing genre IDs to avoid duplicates
    const existingGenreIds = existingGenres.map(g => g.genreId);
    
    // Get genre IDs for the selected genres
    for (const genreName of genresToAdd) {
      try {
        // Get genre ID
        const genreResult = await db
          .select()
          .from(genres)
          .where(eq(genres.name, genreName));
        
        let genreId;
        if (genreResult.length > 0) {
          genreId = genreResult[0].id;
        } else {
          // Create genre if it doesn't exist
          const [newGenre] = await db
            .insert(genres)
            .values({
              name: genreName,
              description: `${genreName.charAt(0).toUpperCase() + genreName.slice(1)} music`
            })
            .returning();
          
          genreId = newGenre.id;
        }
        
        // Skip if genre already assigned to artist
        if (existingGenreIds.includes(genreId)) {
          continue;
        }
        
        // Add genre to artist
        await db
          .insert(artistGenres)
          .values({
            artistId: artist.id,
            genreId: genreId
          });
        
        logger.info(`Added genre ${genreName} to artist ${artist.name}`);
      } catch (error) {
        logger.error(`Error adding genre ${genreName} to artist ${artist.name}: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Error enriching artist genres for ${artist.name}: ${error}`);
  }
}

/**
 * Process a batch of venues to generate events
 */
async function processVenueBatch(venues: any[], artistEnrichCount: number = 5) {
  try {
    logger.info(`Processing batch of ${venues.length} venues`);
    
    // Track results
    const results = [];
    
    // Process venues
    for (const venue of venues) {
      // First enrich venue with genres
      await enrichVenueGenres(venue);
      
      // Generate events for this venue
      const result = await generateEventsForVenue(venue);
      results.push(result);
      
      // Add delay between venues
      await setTimeout(500);
    }
    
    // Optionally enrich additional artists with genres
    const artists = await db
      .select()
      .from(artists)
      .orderBy(sql`random()`)
      .limit(artistEnrichCount);
    
    for (const artist of artists) {
      await enrichArtistGenres(artist);
      await setTimeout(300);
    }
    
    return results;
  } catch (error) {
    logger.error(`Error processing venue batch: ${error}`);
    return [];
  }
}

/**
 * Main function to run venue-artist matching and event generation
 */
async function matchVenuesWithArtists(venueLimit: number = 0) {
  try {
    logger.info('Starting venue-artist matching process');
    
    // Get venues to process
    let venueQuery = db.select().from(venues);
    
    // Apply limit if specified
    if (venueLimit > 0) {
      venueQuery = venueQuery.limit(venueLimit);
    }
    
    const venuesToProcess = await venueQuery;
    logger.info(`Found ${venuesToProcess.length} venues to process`);
    
    // Ensure we have enough artists
    const artistCount = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(artists);
    
    const count = artistCount[0]?.count || 0;
    logger.info(`Found ${count} artists in database`);
    
    if (count < 10) {
      logger.warn('Insufficient artists in database. Need at least 10 artists for reasonable matching.');
      
      // Create minimal artist entries if needed
      if (count < 10) {
        const defaultArtistNames = [
          'The Echoes', 'Midnight Reverie', 'Scarlet Sky', 'Neon Dreams',
          'Lunar Tides', 'Electric Pulse', 'Velvet Storm', 'Crimson Sunset',
          'Silver Lining', 'Crystal Waves', 'Emerald Forest', 'Golden Hour',
          'Sapphire Moon', 'Diamond Rain', 'Ruby Fires', 'Amber Glow',
          'Jade River', 'Violet Mist', 'Pearl Horizon', 'Cobalt Wind'
        ];
        
        const artistsToCreate = Math.min(20, 10 - count);
        logger.info(`Creating ${artistsToCreate} default artists`);
        
        for (let i = 0; i < artistsToCreate; i++) {
          const artistName = defaultArtistNames[i];
          const popularity = Math.floor(Math.random() * 80) + 20; // 20-99
          
          try {
            const [newArtist] = await db
              .insert(artists)
              .values({
                name: artistName,
                popularity
              })
              .returning();
            
            logger.info(`Created artist: ${artistName} (ID: ${newArtist.id})`);
            
            // Add genres for this artist
            await enrichArtistGenres(newArtist);
          } catch (error) {
            logger.error(`Error creating artist ${artistName}: ${error}`);
          }
        }
      }
    }
    
    // Process venues in batches
    let totalEventsAdded = 0;
    const results = [];
    
    for (let i = 0; i < venuesToProcess.length; i += BATCH_SIZE) {
      const batch = venuesToProcess.slice(i, i + BATCH_SIZE);
      logger.info(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(venuesToProcess.length/BATCH_SIZE)}`);
      
      const batchResults = await processVenueBatch(batch);
      results.push(...batchResults);
      
      // Count events added in this batch
      const batchEventsAdded = batchResults.reduce((sum, result) => sum + (result.eventsAdded || 0), 0);
      totalEventsAdded += batchEventsAdded;
      
      logger.info(`Batch complete: Added ${batchEventsAdded} events`);
      
      // Add delay between batches
      if (i + BATCH_SIZE < venuesToProcess.length) {
        await setTimeout(2000);
      }
    }
    
    // Summary
    logger.info('\nMatching and event generation completed!');
    logger.info(`Total venues processed: ${venuesToProcess.length}`);
    logger.info(`Total events added: ${totalEventsAdded}`);
    
    return {
      venuesProcessed: venuesToProcess.length,
      eventsAdded: totalEventsAdded,
      results
    };
  } catch (error) {
    logger.error(`Error in venue-artist matching: ${error}`);
    return {
      venuesProcessed: 0,
      eventsAdded: 0,
      error: `${error}`
    };
  }
}

/**
 * Command line interface
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limit = args[0] ? parseInt(args[0]) : 0;
    
    logger.info(`Starting venue-artist matcher with limit: ${limit || 'all venues'}`);
    
    // Run the matching process
    const result = await matchVenuesWithArtists(limit);
    
    if (result.error) {
      logger.error(`Failed with error: ${result.error}`);
    } else {
      logger.info(`Successfully processed ${result.venuesProcessed} venues and added ${result.eventsAdded} events`);
    }
    
    logger.info('Process completed');
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

// Run the script if it's the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
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
  matchVenuesWithArtists,
  generateEventsForVenue,
  enrichVenueGenres,
  enrichArtistGenres
};