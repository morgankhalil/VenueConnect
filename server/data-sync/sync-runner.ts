import dotenv from 'dotenv';
import { syncVenuesFromBandsInTown, syncArtistEventsFromBandsInTown } from './bands-in-town-sync';

// Load environment variables
dotenv.config();

/**
 * Sync data from BandsInTown API
 * This script can be run manually or scheduled (e.g., with cron)
 * 
 * Usage for venue sync:
 * - Manual: npx tsx server/data-sync/sync-runner.ts venues [venueId] [radius] [limit]
 * 
 * Usage for artist events sync:
 * - Manual: npx tsx server/data-sync/sync-runner.ts artist "Artist Name"
 * 
 * Scheduled examples:
 * - npx tsx server/data-sync/sync-runner.ts artist "The Black Keys"
 * - npx tsx server/data-sync/sync-runner.ts artist "Tame Impala"
 */
async function run() {
  try {
    const command = process.argv[2];
    
    if (!command) {
      console.error('Command required: Use "venues" or "artist"');
      process.exit(1);
    }
    
    if (command === 'venues') {
      // Venue sync
      const venueId = process.argv[3] ? parseInt(process.argv[3]) : 18; // Default to Bug Jar venue ID
      const radius = process.argv[4] ? parseInt(process.argv[4]) : 250; // Default 250 miles
      const limit = process.argv[5] ? parseInt(process.argv[5]) : 10; // Default 10 results

      console.log(`Starting venue sync from BandsInTown for venue ID ${venueId} (radius: ${radius} miles, limit: ${limit})`);
      
      // Run the sync
      const addedVenues = await syncVenuesFromBandsInTown(venueId, radius, limit);
      
      console.log(`Sync complete. Added ${addedVenues.length} new venues to the network.`);
    } 
    else if (command === 'artist') {
      // Artist events sync
      const artistName = process.argv[3];
      
      if (!artistName) {
        console.error('Artist name is required');
        process.exit(1);
      }
      
      console.log(`Starting artist events sync from BandsInTown for "${artistName}"`);
      
      // Run the sync
      const syncedEvents = await syncArtistEventsFromBandsInTown(artistName);
      
      console.log(`Sync complete. Added/updated ${syncedEvents.length} events for "${artistName}".`);
    }
    else {
      console.error(`Unknown command: ${command}`);
      console.error('Use "venues" or "artist"');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error running sync:', error);
    process.exit(1);
  }
}

// Run the script
run();