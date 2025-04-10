
import { db } from './db';
import { venues, artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Get all venues to find nearby artists
    const venueList = await db.select().from(venues);
    console.log(`Found ${venueList.length} venues to sync events for`);

    // Get some popular artists to sync (you can modify this list)
    const popularArtists = [
      'Taylor Swift',
      'Ed Sheeran',
      'The Weeknd',
      'Coldplay',
      'Bad Bunny',
      'Post Malone',
      'Imagine Dragons',
      'Bruno Mars',
      'Harry Styles',
      'Beyoncé'
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
