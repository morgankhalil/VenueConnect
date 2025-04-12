import dotenv from 'dotenv';
import axios from 'axios';
import { db } from './db';
import { venues, artists } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

interface ArtistSearchParams {
  name: string;
  limit?: number;
  date_range?: string; // YYYY-MM-DD,YYYY-MM-DD
}

async function getArtistEvents(params: ArtistSearchParams) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Sanitize artist name for URL
  const encodedArtistName = encodeURIComponent(params.name.trim());
  const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}/events`;
  
  console.log(`Fetching events for artist '${params.name}'...`);
  
  // Build query parameters
  const queryParams: Record<string, any> = {
    app_id: apiKey
  };
  
  if (params.date_range) {
    queryParams.date = params.date_range;
  } else {
    // Default to events from today and next 2 years
    const today = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
    queryParams.date = `${today.toISOString().split('T')[0]},${twoYearsFromNow.toISOString().split('T')[0]}`;
  }
  
  try {
    const response = await axios.get(apiEndpoint, { 
      params: queryParams,
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Successfully retrieved ${response.data.length} events for ${params.name}`);
      return response.data;
    }
    
    console.log(`No events found for artist ${params.name}`);
    return [];
  } catch (error) {
    console.error(`Error fetching events for artist '${params.name}':`, error);
    return [];
  }
}

async function extractVenuesFromEvents(events: any[]) {
  // Extract unique venues from events
  const uniqueVenues = new Map();
  
  events.forEach(event => {
    if (event.venue) {
      const venueKey = `${event.venue.name}:${event.venue.city || ''}`;
      if (!uniqueVenues.has(venueKey)) {
        uniqueVenues.set(venueKey, event.venue);
      }
    }
  });
  
  return Array.from(uniqueVenues.values());
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
  const searchParams: ArtistSearchParams = { name: '' };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--artist' && nextArg) {
      searchParams.name = nextArg;
      i++;
    } else if (arg === '--date-range' && nextArg) {
      searchParams.date_range = nextArg;
      i++;
    } else if (arg === '--limit' && nextArg) {
      searchParams.limit = parseInt(nextArg);
      i++;
    }
  }

  // Validate search parameters
  if (!searchParams.name) {
    console.log('Usage: ts-node search-venues-by-artist.ts [options]');
    console.log('Options:');
    console.log('  --artist <name>           Artist name to search for');
    console.log('  --date-range <start,end>  Date range for events (YYYY-MM-DD,YYYY-MM-DD)');
    console.log('  --limit <number>          Maximum results to return');
    console.log('\nExamples:');
    console.log('  ts-node search-venues-by-artist.ts --artist "The National"');
    console.log('  ts-node search-venues-by-artist.ts --artist "Radiohead" --date-range 2023-01-01,2025-12-31');
    process.exit(1);
  }

  console.log(`Searching for venues where '${searchParams.name}' has played or will play...`);

  try {
    // Get artist events
    const events = await getArtistEvents(searchParams);
    
    if (events.length === 0) {
      console.log('No events found for this artist. Try a different artist or date range.');
      process.exit(0);
    }
    
    // Extract venues from events
    const venueList = await extractVenuesFromEvents(events);
    console.log(`Found ${venueList.length} unique venues where ${searchParams.name} has played/will play`);

    if (venueList.length === 0) {
      console.log('No venues could be extracted from the events.');
      process.exit(0);
    }

    // Display venues
    console.log('\nVenues found:');
    venueList.forEach((venue: any, index: number) => {
      console.log(`${index + 1}. ${venue.name} (${venue.city || ''}, ${venue.region || ''}, ${venue.country || ''})`);
    });

    // Add venues to database
    console.log('\nAdding venues to database...');
    const results = await addVenuesToDatabase(venueList);

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