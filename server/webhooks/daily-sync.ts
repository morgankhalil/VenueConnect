
import { syncArtistEventsFromBandsInTown, syncVenuesFromBandsInTown } from '../data-sync/bands-in-town-sync';
import { db } from '../db';
import { venues, artists } from '../../shared/schema';

export async function runDailySync() {
  try {
    // Get all venues
    const venueList = await db.select().from(venues);
    
    // Get all artists
    const artistList = await db.select().from(artists);
    
    // Sync events for each artist
    for (const artist of artistList) {
      try {
        await syncArtistEventsFromBandsInTown(artist.name);
        console.log(`Synced events for artist: ${artist.name}`);
      } catch (error) {
        console.error(`Error syncing events for artist ${artist.name}:`, error);
      }
    }
    
    // Sync venue network data for each venue
    for (const venue of venueList) {
      try {
        await syncVenuesFromBandsInTown(venue.id);
        console.log(`Synced network data for venue: ${venue.name}`);
      } catch (error) {
        console.error(`Error syncing venue network data for ${venue.name}:`, error);
      }
    }
    
    console.log('Daily sync completed successfully');
  } catch (error) {
    console.error('Error during daily sync:', error);
  }
}
