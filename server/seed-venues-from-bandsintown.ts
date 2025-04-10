import dotenv from 'dotenv';
import { db } from './db';
import { venues } from '../shared/schema';
import { syncVenueFromBandsInTown } from './data-sync/bands-in-town-sync';

dotenv.config();

const KNOWN_VENUE_IDS = {
  'The Bowery Ballroom': '1847-the-bowery-ballroom',
  'The 9:30 Club': '209-9-30-club',
  'The Troubadour': '1941-the-troubadour',
  'The Fillmore': '1941-the-fillmore'
};

async function seedVenues() {
  console.log('Starting Bandsintown venue seeding...');

  try {
    // Get existing venues
    const existingVenues = await db.select().from(venues);
    console.log(`Found ${existingVenues.length} venues in database`);

    let syncedCount = 0;

    for (const venue of existingVenues) {
      const venueId = KNOWN_VENUE_IDS[venue.name];

      if (!venueId) {
        console.log(`No Bandsintown ID found for venue: ${venue.name}`);
        continue;
      }

      console.log(`Syncing venue: ${venue.name}`);
      await syncVenueFromBandsInTown(venueId, venue.name);
      syncedCount++;
    }

    console.log(`Successfully synced ${syncedCount} venues`);
  } catch (error) {
    console.error('Error seeding venues:', error);
  }
}

seedVenues();