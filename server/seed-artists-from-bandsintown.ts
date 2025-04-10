import dotenv from 'dotenv';
import { db } from './db';
import { artists } from '../shared/schema';
import { syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

// Load environment variables
dotenv.config();

/**
 * Seed artists and their events from Bandsintown API
 * 
 * This script fetches artist data and their upcoming events from Bandsintown
 * and adds them to our database, preserving all the original data.
 * 
 * Usage:
 * - npx tsx server/seed-artists-from-bandsintown.ts [artist1,artist2,...]
 * 
 * Parameters:
 * - Comma-separated list of artist names (no spaces after commas)
 * - If no artists are provided, the script will try to sync events for artists already in the database
 * 
 * Examples:
 * - npx tsx server/seed-artists-from-bandsintown.ts "The Black Keys,Tame Impala,Vampire Weekend" 
 * - npx tsx server/seed-artists-from-bandsintown.ts
 */
async function seedArtistsFromBandsintown() {
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY before running this script.');
      process.exit(1);
    }

    // Parse command line arguments for artist names
    const artistArg = process.argv[2];
    let artistNames: string[] = [];
    
    if (artistArg) {
      // Parse comma-separated artist names
      artistNames = artistArg.split(',').map(name => name.trim());
      console.log(`Using provided artist names: ${artistNames.join(', ')}`);
    } else {
      // No artists provided, get existing artists from database
      console.log('No artist names provided, using artists from database...');
      const existingArtists = await db.select().from(artists);
      
      if (existingArtists.length === 0) {
        console.error('ERROR: No artists found in database and no artist names provided.');
        console.error('Please provide at least one artist name or add artists to the database first.');
        process.exit(1);
      }
      
      artistNames = existingArtists.map(artist => artist.name);
      console.log(`Found ${artistNames.length} artists in database`);
    }

    console.log(`Starting Bandsintown artist and event sync...`);
    
    // Track results
    const results = {
      successful: [] as string[],
      failed: [] as {name: string, error: string}[]
    };
    
    // Process each artist
    for (const artistName of artistNames) {
      try {
        console.log(`Syncing artist: ${artistName}`);
        const events = await syncArtistEventsFromBandsInTown(artistName);
        console.log(`Successfully synced ${events.length} events for ${artistName}`);
        results.successful.push(artistName);
      } catch (error) {
        console.error(`Error syncing artist ${artistName}:`, error);
        results.failed.push({
          name: artistName, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Print summary
    console.log('\nSync Completed!');
    console.log(`Successfully synced ${results.successful.length} artists`);
    if (results.failed.length > 0) {
      console.log(`Failed to sync ${results.failed.length} artists`);
      console.log('Failed artists:');
      for (const fail of results.failed) {
        console.log(`- ${fail.name}: ${fail.error}`);
      }
    }
    
    if (results.successful.length > 0) {
      console.log('\nSuccessfully synced artists:');
      for (const name of results.successful) {
        console.log(`- ${name}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding artists from Bandsintown:', error);
    process.exit(1);
  }
}

// Run the script
seedArtistsFromBandsintown();