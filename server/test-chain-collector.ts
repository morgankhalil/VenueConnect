/**
 * Test script for the chained data collector
 * This allows testing the data collection process with a specific venue or artist
 */

import { processVenueEvents, processArtistEvents } from './chain-data-collector';
import { db } from './db';
import { venues, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';

const logger = new SyncLogger('TestChainCollector');

// Check for API key before starting
if (!process.env.BANDSINTOWN_API_KEY) {
  logger.error('BANDSINTOWN_API_KEY environment variable is not set. This script requires a valid API key.');
  process.exit(1);
}

async function testWithVenue(venueName: string) {
  try {
    logger.info(`Testing with venue: ${venueName}`);
    
    // Get venue from database
    const venueResults = await db
      .select()
      .from(venues)
      .where(eq(venues.name, venueName));
    
    if (venueResults.length === 0) {
      logger.error(`Venue not found: ${venueName}`);
      return;
    }
    
    const venue = venueResults[0];
    logger.info(`Found venue: ${venue.name} (ID: ${venue.id})`);
    
    // Process events for this venue
    const results = await processVenueEvents(venue, 0);
    
    logger.info(`\nResults for venue ${venue.name}:`);
    logger.info(`Events processed: ${results.eventsProcessed}`);
    logger.info(`Artists discovered: ${results.artistsDiscovered}`);
    logger.info(`Venues discovered: ${results.venuesDiscovered}`);
  } catch (error) {
    logger.error(`Error testing with venue: ${error}`);
  }
}

async function testWithArtist(artistName: string) {
  try {
    logger.info(`Testing with artist: ${artistName}`);
    
    // Get artist from database
    const artistResults = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (artistResults.length === 0) {
      logger.error(`Artist not found: ${artistName}`);
      return;
    }
    
    const artist = artistResults[0];
    logger.info(`Found artist: ${artist.name} (ID: ${artist.id})`);
    
    // Process events for this artist
    const results = await processArtistEvents(artist, 0);
    
    logger.info(`\nResults for artist ${artist.name}:`);
    logger.info(`Events processed: ${results.eventsProcessed}`);
    logger.info(`Venues discovered: ${results.venuesDiscovered}`);
  } catch (error) {
    logger.error(`Error testing with artist: ${error}`);
  }
}

async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const entityType = args[0]?.toLowerCase() || 'venue';
    const entityName = args[1] || (entityType === 'venue' ? 'The Fillmore' : 'La Luz');
    
    logger.info(`Starting test with ${entityType}: ${entityName}`);
    
    // Run the appropriate test based on entity type
    if (entityType === 'venue') {
      await testWithVenue(entityName);
    } else if (entityType === 'artist') {
      await testWithArtist(entityName);
    } else {
      logger.error(`Unknown entity type: ${entityType}. Use 'venue' or 'artist'.`);
    }
    
    logger.info('Test completed');
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });