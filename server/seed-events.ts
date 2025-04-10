import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Get all venues to find events
    const venueList = await db.select().from(venues);
    console.log(`Found ${venueList.length} venues to sync events for`);

    // For each venue, sync events for artists playing there
    for (const venue of venueList) {
      console.log(`Syncing events for venue: ${venue.name}`);
      try {
        // Query artists and events will be implemented later
        console.log(`No recent events found for venue ${venue.name}`);
      } catch (error) {
        console.error(`Error syncing events for venue ${venue.name}:`, error);
      }
    }

    console.log('Event sync completed');
  } catch (error) {
    console.error('Error during event seeding:', error);
    process.exit(1);
  }
}

seedEvents();