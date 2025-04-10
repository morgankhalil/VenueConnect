
import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Test with some popular artists that are likely to have events
    const testArtists = [
      'Coldplay',
      'Taylor Swift',
      'The Killers',
      'Ed Sheeran',
      'Foo Fighters'
    ];

    for (const artistName of testArtists) {
      console.log(`Syncing events for artist: ${artistName}`);
      try {
        await syncArtistEventsFromBandsInTown(artistName);
      } catch (error) {
        console.error(`Error syncing events for artist ${artistName}:`, error);
      }
    }

    console.log('Event sync completed');
  } catch (error) {
    console.error('Error during event seeding:', error);
    process.exit(1);
  }
}

seedEvents();
