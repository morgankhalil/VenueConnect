
import { db } from './db';
import { venues, artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Get all venues to find nearby artists
    const venueList = await db.select().from(venues);
    console.log(`Found ${venueList.length} venues to sync events for`);

    // Common artists that tour at venues of this size
    const popularArtists = [
      'Modest Mouse',
      'The National',
      'Spoon',
      'Future Islands',
      'Japanese Breakfast',
      'Car Seat Headrest',
      'Kurt Vile',
      'Angel Olsen',
      'Big Thief',
      'Parquet Courts'
    ];

    // Sync events for each artist
    for (const artistName of popularArtists) {
      console.log(`Syncing events for artist: ${artistName}`);
      try {
        await syncArtistEventsFromBandsInTown(artistName);
      } catch (error) {
        console.error(`Error syncing events for ${artistName}:`, error);
      }
    }

    console.log('Event sync completed');
  } catch (error) {
    console.error('Error during event seeding:', error);
    process.exit(1);
  }
}

seedEvents();
