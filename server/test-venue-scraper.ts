/**
 * Test script for venue event scraping
 * This allows testing the scraping functionality with a specific venue
 */

import { scrapeVenueEvents, searchSongkickVenue, getSongkickVenueEvents, processVenueEventsScraping } from './chain-scraper';
import { db } from './db';
import { venues } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';

const logger = new SyncLogger('TestVenueScraper');

/**
 * Test scraping with a specific venue
 */
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
    
    // Check if venue has a website URL
    if (!venue.websiteUrl) {
      logger.warn(`Venue ${venue.name} has no website URL. Trying to find one via Songkick...`);
      
      // Try to find venue on Songkick
      const songkickVenue = await searchSongkickVenue(venue);
      
      if (songkickVenue) {
        logger.info(`Found Songkick page for venue: ${songkickVenue.url}`);
        
        // Update venue with Songkick URL if we found it
        await db
          .update(venues)
          .set({ websiteUrl: songkickVenue.url })
          .where(eq(venues.id, venue.id));
        
        venue.websiteUrl = songkickVenue.url;
        logger.info(`Updated venue ${venue.name} with website URL: ${venue.websiteUrl}`);
        
        // Get events from Songkick
        const songkickEvents = await getSongkickVenueEvents(songkickVenue.url);
        logger.info(`Found ${songkickEvents.length} events on Songkick for venue ${venue.name}`);
        
        if (songkickEvents.length > 0) {
          logger.info(`Sample event: ${songkickEvents[0].artistName} on ${songkickEvents[0].date}`);
        }
      } else {
        logger.error(`Could not find venue on Songkick: ${venue.name}`);
        return;
      }
    }
    
    // Try direct scraping
    logger.info(`Attempting to scrape events from ${venue.websiteUrl}`);
    const scrapedEvents = await scrapeVenueEvents(venue);
    
    logger.info(`Scraped ${scrapedEvents.length} events for venue ${venue.name}`);
    
    if (scrapedEvents.length > 0) {
      logger.info(`Sample events:`);
      scrapedEvents.slice(0, 3).forEach((event, i) => {
        logger.info(`${i+1}. ${event.artistName} on ${event.date}`);
      });
    }
    
    // Process venue events (add to database)
    logger.info(`\nProcessing events for venue ${venue.name} (adding to database)...`);
    const results = await processVenueEventsScraping(venue, 0);
    
    logger.info(`Results for venue ${venue.name}:`);
    logger.info(`Events added: ${results.eventsProcessed}`);
    logger.info(`Artists discovered: ${results.artistsDiscovered}`);
  } catch (error) {
    logger.error(`Error testing with venue: ${error}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get venue name from command line
    const venueName = process.argv[2];
    
    if (!venueName) {
      logger.error('Please provide a venue name as a command line argument');
      logger.info('Usage: npx tsx server/test-venue-scraper.ts "Venue Name"');
      return;
    }
    
    await testWithVenue(venueName);
    
    logger.info('Test completed');
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