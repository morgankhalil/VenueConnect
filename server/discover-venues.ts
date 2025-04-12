import dotenv from 'dotenv';
import axios from 'axios';
import { db } from './db';
import { venues } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Search venues directly by name, city, etc.
async function searchVenuesByParameters(params: any) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }
  
  // Use API key as app_id parameter as well
  const searchParams = {
    ...params,
    app_id: apiKey
  };

  try {
    const response = await axios.get(`https://rest.bandsintown.com/venues/search`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      params: searchParams
    });

    return response.data;
  } catch (error) {
    console.error('Error searching venues:', error);
    throw error;
  }
}

// Get venues by artist
async function getVenuesByArtist(artistName: string, dateRange?: string) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }
  
  // Sanitize artist name for URL
  const encodedArtistName = encodeURIComponent(artistName.trim());
  
  try {
    // Build query parameters - use API key for app_id as well
    const queryParams: Record<string, any> = {
      app_id: apiKey  // Use the API key for the app_id parameter as well
    };
    
    if (dateRange) {
      queryParams.date = dateRange;
    } else {
      // Default to events from today and next 2 years
      const today = new Date();
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(today.getFullYear() + 2);
      queryParams.date = `${today.toISOString().split('T')[0]},${twoYearsFromNow.toISOString().split('T')[0]}`;
    }
    
    const response = await axios.get(
      `https://rest.bandsintown.com/artists/${encodedArtistName}/events`, 
      { 
        params: queryParams,
        headers: { 
          'Accept': 'application/json',
          'x-api-key': apiKey  // Use the API key in the headers
        }
      }
    );
    
    if (response.data && Array.isArray(response.data)) {
      // Extract unique venues
      const uniqueVenues = new Map();
      
      response.data.forEach((event: any) => {
        if (event.venue) {
          const venueKey = `${event.venue.name}:${event.venue.city || ''}`;
          if (!uniqueVenues.has(venueKey)) {
            uniqueVenues.set(venueKey, event.venue);
          }
        }
      });
      
      return Array.from(uniqueVenues.values());
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching events for artist '${artistName}':`, error);
    return [];
  }
}

// Add venues to database
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

      // Prepare venue data, ensuring all required fields are present
      const formattedVenueData = {
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
      };

      // Add venue to database
      await db.insert(venues).values(formattedVenueData);

      console.log(`Added venue: ${venueData.name} in ${venueData.city || 'unknown city'}`);
      results.added++;
    } catch (error) {
      console.error(`Error adding venue ${venueData.name}:`, error);
      results.errors++;
    }
  }

  return results;
}

// Main function
async function main() {
  console.log('🎵 Venue Discovery Tool 🎵');
  console.log('=========================');
  
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set this environment variable before running the script.');
      process.exit(1);
    }
    
    console.log('\nHow would you like to search for venues?');
    console.log('1. Search by venue name');
    console.log('2. Search by city');
    console.log('3. Search by artist (find venues where an artist has played)');
    console.log('4. Search by location (latitude/longitude)');
    
    const choice = await prompt('\nEnter your choice (1-4): ');
    
    let searchResults: any[] = [];
    
    switch (choice) {
      case '1': {
        const query = await prompt('Enter venue name to search for: ');
        console.log(`\nSearching for venues with name containing "${query}"...`);
        searchResults = await searchVenuesByParameters({ query });
        break;
      }
      
      case '2': {
        const city = await prompt('Enter city name: ');
        console.log(`\nSearching for venues in "${city}"...`);
        searchResults = await searchVenuesByParameters({ city });
        break;
      }
      
      case '3': {
        const artist = await prompt('Enter artist name: ');
        console.log(`\nSearching for venues where "${artist}" has played...`);
        searchResults = await getVenuesByArtist(artist);
        break;
      }
      
      case '4': {
        const latitude = await prompt('Enter latitude: ');
        const longitude = await prompt('Enter longitude: ');
        const radius = await prompt('Enter search radius in miles (default: 25): ');
        
        const location = `${latitude},${longitude}`;
        const radiusValue = radius ? parseInt(radius) : 25;
        
        console.log(`\nSearching for venues near (${latitude}, ${longitude}) within ${radiusValue} miles...`);
        searchResults = await searchVenuesByParameters({ 
          location, 
          radius: radiusValue
        });
        break;
      }
      
      default:
        console.log('Invalid choice.');
        process.exit(1);
    }
    
    // Display search results
    if (searchResults.length === 0) {
      console.log('\nNo venues found matching your search criteria.');
      process.exit(0);
    }
    
    console.log(`\nFound ${searchResults.length} venues matching your search criteria:`);
    searchResults.forEach((venue, index) => {
      console.log(`${index + 1}. ${venue.name} (${venue.city || ''}, ${venue.region || ''}, ${venue.country || ''})`);
    });
    
    // Ask user if they want to add these venues
    const addConfirmation = await prompt('\nWould you like to add these venues to your database? (y/n): ');
    
    if (addConfirmation.toLowerCase() === 'y') {
      console.log('\nAdding venues to database...');
      const results = await addVenuesToDatabase(searchResults);
      
      // Display results
      console.log('\nResults:');
      console.log(`Venues added: ${results.added}`);
      console.log(`Venues skipped (already exist): ${results.skipped}`);
      console.log(`Errors: ${results.errors}`);
    } else {
      console.log('\nNo venues were added to the database.');
    }
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    rl.close();
  }
}

// Run the script
main();