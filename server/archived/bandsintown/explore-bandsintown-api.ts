import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function exploreApiEndpoints() {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Exploring Bandsintown API Endpoints...');
  console.log(`API Key in use: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

  const baseUrl = 'https://rest.bandsintown.com';
  
  // List of endpoints to test
  const endpoints = [
    // Artist endpoints
    { name: 'Artist Info', url: `${baseUrl}/artists/coldplay`, params: { app_id: apiKey } },
    { name: 'Artist Events', url: `${baseUrl}/artists/coldplay/events`, params: { app_id: apiKey } },
    { name: 'Artist Events (upcoming)', url: `${baseUrl}/artists/coldplay/events`, params: { app_id: apiKey, date: 'upcoming' } },
    { name: 'Artist Events (all)', url: `${baseUrl}/artists/coldplay/events`, params: { app_id: apiKey, date: 'all' } },
    
    // Test with different artists
    { name: 'Taylor Swift Info', url: `${baseUrl}/artists/taylor%20swift`, params: { app_id: apiKey } },
    { name: 'Taylor Swift Events', url: `${baseUrl}/artists/taylor%20swift/events`, params: { app_id: apiKey } },
    
    // Alternative endpoints that might exist
    { name: 'Recommended Artists', url: `${baseUrl}/artists/recommended`, params: { app_id: apiKey, artistId: '99' } },
    { name: 'Search Artists', url: `${baseUrl}/artists/search`, params: { app_id: apiKey, query: 'rock' } },
    
    // Venue endpoints
    { name: 'Venue Search', url: `${baseUrl}/venues/search`, params: { app_id: apiKey, query: 'madison square garden' } },
    { name: 'Venue Info', url: `${baseUrl}/venues/123`, params: { app_id: apiKey } }, // Random venue ID
    { name: 'Venue Events', url: `${baseUrl}/venues/123/events`, params: { app_id: apiKey } }, // Random venue ID
    
    // City endpoints
    { name: 'City Events', url: `${baseUrl}/events/search`, params: { app_id: apiKey, location: 'new york' } },
    
    // Potential discovery endpoints
    { name: 'Concerts Nearby', url: `${baseUrl}/events/nearby`, params: { app_id: apiKey, location: '40.7128,-74.0060', radius: 25 } },
    { name: 'Popular Events', url: `${baseUrl}/events/popular`, params: { app_id: apiKey, location: 'new york' } },
    { name: 'Genre Events', url: `${baseUrl}/events/genre`, params: { app_id: apiKey, genre: 'rock' } },
  ];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    console.log(`\n--- Testing: ${endpoint.name} ---`);
    console.log(`URL: ${endpoint.url}`);
    console.log(`Params: ${JSON.stringify(endpoint.params)}`);
    
    try {
      const response = await axios.get(endpoint.url, { params: endpoint.params });
      console.log(`Status: ${response.status}`);
      
      if (Array.isArray(response.data)) {
        console.log(`Result: Array with ${response.data.length} items`);
        if (response.data.length > 0) {
          console.log(`Sample data: ${JSON.stringify(response.data[0]).substring(0, 200)}...`);
        }
      } else if (typeof response.data === 'object') {
        console.log(`Result: Object with ${Object.keys(response.data).length} keys`);
        console.log(`Sample data: ${JSON.stringify(response.data).substring(0, 200)}...`);
      } else {
        console.log(`Result: ${typeof response.data}`);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

exploreApiEndpoints();