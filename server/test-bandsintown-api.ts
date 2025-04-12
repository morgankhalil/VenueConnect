import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testVenueSearch() {
  // Get API key
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Testing Bandsintown API venue search...');
  console.log(`API Key in use: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Test venues search endpoint
  try {
    console.log('\n1. Testing venue search by name:');
    const venueResponse = await axios.get('https://rest.bandsintown.com/venues/search', {
      params: {
        query: 'Madison Square Garden',
        app_id: apiKey
      },
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', venueResponse.status);
    console.log('Response data type:', typeof venueResponse.data);
    
    if (Array.isArray(venueResponse.data)) {
      console.log(`Found ${venueResponse.data.length} venues`);
      if (venueResponse.data.length > 0) {
        console.log('First venue:', JSON.stringify(venueResponse.data[0], null, 2));
      }
    } else {
      console.log('Response data:', venueResponse.data);
    }
    
    // Test artists endpoint
    console.log('\n2. Testing artist search:');
    const artistResponse = await axios.get('https://rest.bandsintown.com/artists/coldplay', {
      params: {
        app_id: apiKey
      },
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', artistResponse.status);
    console.log('Response data:', JSON.stringify(artistResponse.data, null, 2));
    
    // Test events endpoint
    console.log('\n3. Testing artist events:');
    const eventsResponse = await axios.get('https://rest.bandsintown.com/artists/coldplay/events', {
      params: {
        app_id: apiKey,
        date: '2022-01-01,2025-12-31'
      },
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    
    console.log('Response status:', eventsResponse.status);
    console.log('Response data type:', typeof eventsResponse.data);
    
    if (Array.isArray(eventsResponse.data)) {
      console.log(`Found ${eventsResponse.data.length} events`);
      if (eventsResponse.data.length > 0) {
        console.log('First event:', JSON.stringify(eventsResponse.data[0], null, 2));
      }
    } else {
      console.log('Response data:', eventsResponse.data);
    }
    
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
      console.error('Error data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

// Run the test
testVenueSearch();