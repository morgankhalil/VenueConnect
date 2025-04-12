import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testVenueSearch() {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Testing Bandsintown API venue search...');
  console.log(`API Key in use: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  try {
    // Test with different venues
    const venues = [
      'Madison Square Garden',
      'O2 Arena',
      'Forum'
    ];
    
    for (const venueName of venues) {
      console.log(`\nSearching for venue: ${venueName}`);
      const response = await axios.get('https://rest.bandsintown.com/venues/search', {
        params: {
          app_id: apiKey,
          query: venueName
        }
      });
      
      console.log('Response status:', response.status);
      
      if (Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} venues`);
        if (response.data.length > 0) {
          console.log('First venue:', JSON.stringify(response.data[0], null, 2));
        }
      } else {
        console.log('Response is not an array:', response.data);
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
}

testVenueSearch();