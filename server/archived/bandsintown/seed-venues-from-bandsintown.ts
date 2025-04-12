
import dotenv from 'dotenv';
import { db } from './db';
import { venues } from '../shared/schema';
import { syncVenueFromBandsInTown } from './data-sync/bands-in-town-sync';

dotenv.config();

const KNOWN_VENUE_IDS = {
  'The Bug Jar': '10068739-the-bug-jar',
  'The Bowery Ballroom': '1847-the-bowery-ballroom',
  'The 9:30 Club': '209-9-30-club',
  'The Troubadour': '1941-the-troubadour',
  'The Fillmore': '1941-the-fillmore',
  'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
  'The Ryman Auditorium': '1941-ryman-auditorium',
  'House of Blues': '1941-house-of-blues-chicago'
};

async function seedVenues() {
  console.log('Starting Bandsintown venue sync...');

  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      process.exit(1);
    }

    // Get existing venues
    const existingVenues = await db.select().from(venues);
    console.log(`Found ${existingVenues.length} venues in database`);

    let syncedCount = 0;
    let errorCount = 0;

    // Process each venue
    for (const venue of existingVenues) {
      const bandsintownId = KNOWN_VENUE_IDS[venue.name];

      if (!bandsintownId) {
        console.log(`No Bandsintown ID found for venue: ${venue.name} - skipping`);
        continue;
      }

      try {
        console.log(`\nSyncing venue: ${venue.name}`);
        const venueData = await syncVenueFromBandsInTown(bandsintownId, venue.name);
        
        if (venueData) {
          console.log(`Successfully synced ${venue.name}`);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing venue ${venue.name}:`, error);
        errorCount++;
      }

      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nSync Summary:');
    console.log(`Total venues processed: ${existingVenues.length}`);
    console.log(`Successfully synced: ${syncedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during venue sync:', error);
    process.exit(1);
  }
}

// Run the script
seedVenues();
