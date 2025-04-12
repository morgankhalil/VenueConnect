import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEventsEndpoint() {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Testing Bandsintown API events endpoint for Coldplay...');
  console.log(`API Key in use: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  try {
    // Try different date ranges
    const dateRanges = [
      'upcoming',
      'all',
      '2024-04-01,2024-12-31'
    ];
    
    for (const dateRange of dateRanges) {
      console.log(`\nTesting with date range: ${dateRange}`);
      const response = await axios.get('https://rest.bandsintown.com/artists/Coldplay/events', {
        params: {
          app_id: apiKey,
          date: dateRange
        }
      });
      
      console.log('Response status:', response.status);
      console.log(`Found ${response.data.length} events`);
      
      if (response.data.length > 0) {
        console.log('First event:', JSON.stringify(response.data[0], null, 2));
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

testEventsEndpoint();