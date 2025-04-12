import dotenv from 'dotenv';
import axios from 'axios';
import { ConcertsTrackerProvider } from './data-sync/concerts-tracker-provider';

dotenv.config();

async function testApi() {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.error('RAPIDAPI_KEY not found in environment variables');
    process.exit(1);
  }

  try {
    console.log('Testing search endpoint for Metallica events...');
    const response = await axios.get('https://concerts-artists-events-tracker.p.rapidapi.com/search', {
      params: {
        keyword: 'metallica',
        types: 'event'
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApi();