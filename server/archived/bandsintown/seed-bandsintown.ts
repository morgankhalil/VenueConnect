import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events, venueNetwork } from '../shared/schema';
import { 
  syncVenuesFromBandsInTown,
  syncArtistEventsFromBandsInTown,
  syncVenueFromBandsInTown
} from './data-sync/bands-in-town-sync';

// Load environment variables
dotenv.config();

/**
 * Comprehensive seed script for Bandsintown data
 * 
 * This script provides a complete seeding solution for Bandsintown data:
 * 1. Venues - Fetch venue data based on a source venue
 * 2. Artists - Fetch artist data either from specified names or based on venue events
 * 3. Events - Fetch events for all artists and venues
 * 
 * Usage:
 * - npx tsx server/seed-bandsintown.ts [operation] [options]
 * 
 * Operations:
 * - all: Run all seed operations (default)
 * - venues: Only seed venues
 * - artists: Only seed artists
 * - events: Only seed events for existing artists and venues
 * 
 * Options:
 * - --source-venue=ID: ID of source venue for venue network (default: first venue in DB)
 * - --artists="name1,name2": Comma-separated list of artist names
 * - --radius=250: Search radius in miles for venues (default: 250)
 * - --limit=100: Maximum venues to add (default: 100)
 * - --reset: Delete existing data before seeding (USE WITH CAUTION)
 * 
 * Examples:
 * - npx tsx server/seed-bandsintown.ts all --reset --artists="The Black Keys,Tame Impala"
 * - npx tsx server/seed-bandsintown.ts venues --source-venue=5 --radius=300
 * - npx tsx server/seed-bandsintown.ts artists --artists="Coldplay,Radiohead"
 */

// Parse command line args
interface Options {
  operation: 'all' | 'venues' | 'artists' | 'events';
  sourceVenue?: number;
  artists?: string[];
  radius: number;
  limit: number;
  reset: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);

  // Default options
  const options: Options = {
    operation: 'all',
    radius: 250,
    limit: 100,
    reset: false
  };

  // Parse operation
  if (args[0] && ['all', 'venues', 'artists', 'events'].includes(args[0])) {
    options.operation = args[0] as Options['operation'];
  }

  // Parse named options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--reset') {
      options.reset = true;
      continue;
    }

    // Parse --option=value style args
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      const [_, key, value] = match;

      switch (key) {
        case 'source-venue':
          options.sourceVenue = parseInt(value);
          break;
        case 'artists':
          options.artists = value.split(',').map(a => a.trim());
          break;
        case 'radius':
          options.radius = parseInt(value);
          break;
        case 'limit':
          options.limit = parseInt(value);
          break;
      }
    }
  }

  return options;
}

/**
 * Reset the database tables
 */
async function resetData(tables: string[]) {
  console.log('Resetting database tables:', tables.join(', '));

  // Clear tours first to remove foreign key constraints
  await db.delete(tours);
  console.log('Tours table cleared');

  if (tables.includes('events')) {
    await db.delete(events);
    console.log('Events table cleared');
  }

  if (tables.includes('artists')) {
    await db.delete(artists);
    console.log('Artists table cleared');
  }

  if (tables.includes('venueNetwork')) {
    await db.delete(venueNetwork);
    console.log('Venue network table cleared');
  }

  if (tables.includes('venues')) {
    // Keep at least one venue as a starting point
    const firstVenue = await db.select().from(venues).limit(1);
    if (firstVenue.length > 0) {
      await db.delete(venues).where(venues.id, '!=', firstVenue[0].id);
      console.log(`Venues cleared (kept source venue ID: ${firstVenue[0].id})`);
    } else {
      console.log('No venues to clear');
    }
  }
}

/**
 * Seed venues from Bandsintown
 */
async function seedVenues(sourceVenueId: number, radius: number, limit: number) {
  console.log(`\nSeeding venues from Bandsintown...`);
  console.log(`Source Venue ID: ${sourceVenueId}`);
  console.log(`Search Radius: ${radius} miles`);
  console.log(`Venue Limit: ${limit}`);

  try {
    const addedVenues = await syncVenuesFromBandsInTown(sourceVenueId, radius, limit);
    console.log(`Added ${addedVenues.length} venues from Bandsintown`);
    return addedVenues;
  } catch (error) {
    console.error('Error seeding venues:', error);
    return [];
  }
}

/**
 * Seed artists from Bandsintown
 */
async function seedArtists(artistNames: string[]) {
  console.log(`\nSeeding artists from Bandsintown...`);
  console.log(`Artists to sync: ${artistNames.join(', ')}`);

  const results = {
    successful: [] as string[],
    failed: [] as {name: string, error: string}[]
  };

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

  console.log(`\nArtist sync results:`);
  console.log(`- Successful: ${results.successful.length}`);
  console.log(`- Failed: ${results.failed.length}`);

  return results;
}

/**
 * Seed events for existing venues
 */
async function seedEvents() {
  console.log(`\nSeeding events for existing venues from Bandsintown...`);

  // Get all venues with Bandsintown IDs
  const allVenues = await db.select().from(venues);
  console.log(`Found ${allVenues.length} venues to check for events`);

  // Known Bandsintown venue IDs (could be expanded)
  const venueIds: Record<string, string> = {
    'The Bug Jar': '10068739-the-bug-jar',
    'The Bowery Ballroom': '1847-the-bowery-ballroom',
    'The 9:30 Club': '209-9-30-club',
    'The Troubadour': '1941-the-troubadour',
    'The Fillmore': '1941-the-fillmore',
    'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
    'The Ryman Auditorium': '1941-ryman-auditorium',
    'House of Blues': '1941-house-of-blues-chicago'
  };

  let totalEventsCreated = 0;
  const processedVenues: Record<string, number> = {};

  // Process each venue
  for (const venue of allVenues) {
    // Try to find a Bandsintown ID for this venue
    const venueId = venueIds[venue.name];

    if (!venueId) {
      console.log(`No Bandsintown ID found for venue: ${venue.name}`);
      continue;
    }

    console.log(`Processing venue: ${venue.name} (${venueId})`);

    try {
      const venueData = await syncVenueFromBandsInTown(venueId, venue.name);
      const eventCount = venueData ? venueData.events.length : 0;
      console.log(`Created ${eventCount} events for ${venue.name}`);
      totalEventsCreated += eventCount;
      processedVenues[venue.name] = eventCount;
    } catch (error) {
      console.error(`Error syncing events for ${venue.name}:`, error);
    }
  }

  console.log(`\nEvent seeding completed`);
  console.log(`- Total events created: ${totalEventsCreated}`);
  console.log(`- Venues processed: ${Object.keys(processedVenues).length}`);

  return {
    totalEvents: totalEventsCreated,
    venueResults: processedVenues
  };
}

/**
 * Main function to run the seed script
 */
async function main() {
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY before running this script.');
      process.exit(1);
    }

    // Parse command line options
    const options = parseArgs();
    console.log('Bandsintown Data Seed Tool');
    console.log('========================');
    console.log('Options:', JSON.stringify(options, null, 2));

    // Reset data if requested
    if (options.reset) {
      const tablesToReset = [];
      if (['all', 'events'].includes(options.operation)) tablesToReset.push('events');
      if (['all', 'artists'].includes(options.operation)) tablesToReset.push('artists');
      if (['all', 'venues'].includes(options.operation)) {
        tablesToReset.push('venueNetwork');
        tablesToReset.push('venues');
      }

      await resetData(tablesToReset);
    }

    // Find a source venue if not specified
    let sourceVenueId = options.sourceVenue;
    if (!sourceVenueId) {
      const firstVenue = await db.select().from(venues).limit(1);
      if (firstVenue.length === 0) {
        throw new Error('No source venue found in database. Please create at least one venue first.');
      }
      sourceVenueId = firstVenue[0].id;
      console.log(`Using venue ID ${sourceVenueId} (${firstVenue[0].name}) as source venue`);
    }

    // Find artists to seed if none specified
    let artistsToSync = options.artists || [];
    if (!artistsToSync.length && ['all', 'artists'].includes(options.operation)) {
      // Try to get artists from the database
      const existingArtists = await db.select().from(artists);
      if (existingArtists.length > 0) {
        artistsToSync = existingArtists.map(a => a.name);
        console.log(`Using ${artistsToSync.length} existing artists from database`);
      } else {
        // Default artist list if none in DB and none specified
        artistsToSync = ['The Black Keys', 'Tame Impala', 'Arctic Monkeys', 'Vampire Weekend', 'The Strokes'];
        console.log(`No artists found. Using default artist list: ${artistsToSync.join(', ')}`);
      }
    }

    // Run seed operations based on selected operation
    if (['all', 'venues'].includes(options.operation)) {
      await seedVenues(sourceVenueId, options.radius, options.limit);
    }

    if (['all', 'artists'].includes(options.operation)) {
      await seedArtists(artistsToSync);
    }

    if (['all', 'events'].includes(options.operation)) {
      await seedEvents();
    }

    console.log('\nBandsintown seed process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in Bandsintown seed process:', error);
    process.exit(1);
  }
}

// Run the script
main();