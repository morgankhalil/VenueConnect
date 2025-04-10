
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
      'The Black Keys',
      'Tame Impala',
      'Arctic Monkeys',
      'The Strokes',
      'LCD Soundsystem',
      'Vampire Weekend',
      'MGMT',
      'Beach House',
      'The War on Drugs',
      'Fleet Foxes'
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
