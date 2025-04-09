import dotenv from 'dotenv';
import { syncVenuesFromBandsInTown } from './bands-in-town-sync';

// Load environment variables
dotenv.config();

/**
 * Sync venues from BandsInTown API
 * This script can be run manually or scheduled (e.g., with cron)
 * 
 * Usage:
 * - Manual: npx tsx server/data-sync/sync-runner.ts [venueId] [radius] [limit]
 * - Scheduled: Use a service like cron to run this periodically
 */
async function run() {
  try {
    // Parse arguments - venueId is required, radius and limit are optional
    const venueId = process.argv[2] ? parseInt(process.argv[2]) : 14; // Default to venue ID 14
    const radius = process.argv[3] ? parseInt(process.argv[3]) : 250; // Default 250 miles
    const limit = process.argv[4] ? parseInt(process.argv[4]) : 10; // Default 10 results

    console.log(`Starting venue sync from BandsInTown for venue ID ${venueId} (radius: ${radius} miles, limit: ${limit})`);
    
    // Run the sync
    const addedVenues = await syncVenuesFromBandsInTown(venueId, radius, limit);
    
    console.log(`Sync complete. Added ${addedVenues.length} new venues to the network.`);
    process.exit(0);
  } catch (error) {
    console.error('Error running venue sync:', error);
    process.exit(1);
  }
}

// Run the script
run();