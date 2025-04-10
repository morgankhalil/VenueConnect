import dotenv from 'dotenv';
import { db } from './db';
import { venues, venueNetwork } from '../shared/schema';
import { syncVenuesFromBandsInTown } from './data-sync/bands-in-town-sync';

// Load environment variables
dotenv.config();

/**
 * Seed venues from Bandsintown API
 * 
 * This script pulls venue data from Bandsintown and creates venue records
 * in our database that match the Bandsintown data exactly.
 * 
 * Usage:
 * - npx tsx server/seed-venues-from-bandsintown.ts [sourceVenueId] [radius] [limit]
 * 
 * Parameters:
 * - sourceVenueId: ID of a venue in our database to use as a starting point
 * - radius: Search radius in miles (default: 250)
 * - limit: Maximum number of venues to add (default: 100)
 */
async function seedVenuesFromBandsintown() {
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY before running this script.');
      process.exit(1);
    }

    // Parse command line arguments
    const sourceVenueId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
    const radius = process.argv[3] ? parseInt(process.argv[3]) : 250;
    const limit = process.argv[4] ? parseInt(process.argv[4]) : 100;

    // If no source venue ID specified, find the first venue in our database
    let targetVenueId = sourceVenueId;
    if (!targetVenueId) {
      console.log('No source venue ID provided, finding first venue in database...');
      const firstVenue = await db.select().from(venues).limit(1);
      if (firstVenue.length === 0) {
        console.error('ERROR: No venues found in database. Please create at least one venue first.');
        process.exit(1);
      }
      targetVenueId = firstVenue[0].id;
      console.log(`Using venue ID ${targetVenueId} (${firstVenue[0].name}) as source venue`);
    }

    console.log(`Starting Bandsintown venue seed...`);
    console.log(`Source Venue ID: ${targetVenueId}`);
    console.log(`Search Radius: ${radius} miles`);
    console.log(`Venue Limit: ${limit}`);
    
    // Run the sync function to fetch and populate venues
    const addedVenues = await syncVenuesFromBandsInTown(targetVenueId, radius, limit);
    
    console.log(`Seed completed successfully!`);
    console.log(`Added ${addedVenues.length} venues to the database`);
    
    // Display the added venues
    if (addedVenues.length > 0) {
      console.log('\nVenues added:');
      for (const venue of addedVenues) {
        console.log(`- ${venue.name} (${venue.city}, ${venue.state || venue.country})`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding venues from Bandsintown:', error);
    process.exit(1);
  }
}

// Run the script
seedVenuesFromBandsintown();