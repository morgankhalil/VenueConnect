
import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    console.log('Starting event sync from Bandsintown...');

    // Get our existing venues
    const venueResults = await db.select().from(venues);
    console.log(`Found ${venueResults.length} venues to sync events for`);

    // Artists that commonly play at indie/rock venues like our seeded ones
    const venueAppropriateArtists = [
      'The National',
      'Japanese Breakfast', 
      'Mitski',
      'Big Thief',
      'Lucy Dacus',
      'Parquet Courts',
      'Kurt Vile',
      'Real Estate',
      'Beach House',
      'Angel Olsen'
    ];

    for (const artistName of venueAppropriateArtists) {
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
