import dotenv from 'dotenv';
import axios from 'axios';
import { db } from './db';
import { venues } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

interface VenueSearchParams {
  query?: string;
  city?: string;
  location?: [number, number]; // [latitude, longitude]
  radius?: number;
  limit?: number;
}

async function searchVenues(params: VenueSearchParams) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Build query parameters
  const queryParams: Record<string, any> = {
    limit: params.limit || 50,
    app_id: apiKey  // Using app_id as a query parameter instead of x-api-key in headers
  };

  if (params.query) {
    queryParams.query = params.query;
  }

  if (params.city) {
    queryParams.city = params.city;
  }

  if (params.location && params.location.length === 2) {
    queryParams.location = `${params.location[0]},${params.location[1]}`;
    queryParams.radius = params.radius || 25; // Default radius in miles
  }

  console.log(`Using API endpoint: https://rest.bandsintown.com/venues/search with app_id authentication`);
  console.log(`Search parameters:`, JSON.stringify(queryParams, null, 2));

  try {
    const response = await axios.get(`https://rest.bandsintown.com/venues/search`, {
      headers: {
        'Accept': 'application/json'
      },
      params: queryParams
    });

    return response.data;
  } catch (error) {
    console.error('Error searching venues:', error);
    throw error;
  }
}

async function addVenuesToDatabase(venueList: any[]) {
  const results = {
    added: 0,
    skipped: 0,
    errors: 0
  };

  for (const venueData of venueList) {
    try {
      // Check if venue already exists
      const existingVenue = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, venueData.name),
            eq(venues.city, venueData.city || '')
          )
        )
        .limit(1);

      if (existingVenue.length > 0) {
        console.log(`Venue '${venueData.name}' in ${venueData.city || 'unknown city'} already exists, skipping`);
        results.skipped++;
        continue;
      }

      // Add new venue to database
      await db.insert(venues).values({
        name: venueData.name,
        city: venueData.city || '',
        region: venueData.region || null,
        country: venueData.country || 'US',
        latitude: venueData.latitude || null,
        longitude: venueData.longitude || null,
        capacity: venueData.capacity || Math.floor(Math.random() * 800) + 200, // Estimate if not provided
        bandsintownId: venueData.id || null,
        address: venueData.address || `${venueData.name}, ${venueData.city || ''}`,
        zipCode: venueData.postal_code || null,
        description: `Music venue located in ${venueData.city || ''}, ${venueData.region || ''}`.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`Added venue: ${venueData.name} in ${venueData.city || 'unknown city'}`);
      results.added++;
    } catch (error) {
      console.error(`Error adding venue ${venueData.name}:`, error);
      results.errors++;
    }
  }

  return results;
}

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const searchParams: VenueSearchParams = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--query' && nextArg) {
      searchParams.query = nextArg;
      i++;
    } else if (arg === '--city' && nextArg) {
      searchParams.city = nextArg;
      i++;
    } else if (arg === '--location' && nextArg) {
      const [lat, lng] = nextArg.split(',').map(Number);
      if (lat && lng) {
        searchParams.location = [lat, lng];
      }
      i++;
    } else if (arg === '--radius' && nextArg) {
      searchParams.radius = parseInt(nextArg);
      i++;
    } else if (arg === '--limit' && nextArg) {
      searchParams.limit = parseInt(nextArg);
      i++;
    }
  }

  // Validate search parameters
  if (!searchParams.query && !searchParams.city && !searchParams.location) {
    console.log('Usage: ts-node search-and-add-venues.ts [options]');
    console.log('Options:');
    console.log('  --query <name>         Search venues by name');
    console.log('  --city <city>          Search venues in a specific city');
    console.log('  --location <lat,lng>   Search venues near coordinates');
    console.log('  --radius <miles>       Radius in miles (default: 25)');
    console.log('  --limit <number>       Maximum results to return (default: 50)');
    console.log('\nExamples:');
    console.log('  ts-node search-and-add-venues.ts --query "The Fillmore"');
    console.log('  ts-node search-and-add-venues.ts --city "Chicago"');
    console.log('  ts-node search-and-add-venues.ts --location 40.730610,-73.935242 --radius 10');
    process.exit(1);
  }

  console.log('Searching for venues with parameters:', searchParams);

  try {
    // Search for venues
    const venueResults = await searchVenues(searchParams);
    console.log(`Found ${venueResults.length} venues matching search criteria`);

    if (venueResults.length === 0) {
      console.log('No venues found matching the search criteria.');
      process.exit(0);
    }

    // Display venues
    console.log('\nVenues found:');
    venueResults.forEach((venue: any, index: number) => {
      console.log(`${index + 1}. ${venue.name} (${venue.city || ''}, ${venue.region || ''}, ${venue.country || ''})`);
    });

    // Add venues to database
    console.log('\nAdding venues to database...');
    const results = await addVenuesToDatabase(venueResults);

    // Display results
    console.log('\nResults:');
    console.log(`Venues added: ${results.added}`);
    console.log(`Venues skipped (already exist): ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();