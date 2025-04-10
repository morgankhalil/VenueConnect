import { db } from './db';
import { venues, events } from '../shared/schema';
import { syncVenuesFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Get all venues to find events
    const venueList = await db.select().from(venues);
    console.log(`Found ${venueList.length} venues to sync events for`);

    // For each venue, sync its events using BandsInTown API
    for (const venue of venueList) {
      console.log(`Syncing events for venue: ${venue.name}`);
      try {
        await syncVenuesFromBandsInTown(venue.id, 0, 100); // Radius 0 to only get events at this venue
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