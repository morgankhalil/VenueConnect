
import dotenv from 'dotenv';
import { ConcertsTrackerProvider } from './data-sync/concerts-tracker-provider';

dotenv.config();

async function testApi() {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.error('RAPIDAPI_KEY not found in environment variables');
    process.exit(1);
  }

  const provider = new ConcertsTrackerProvider(apiKey);

  try {
    console.log('Testing artist events...');
    const events = await provider.getArtistEvents('La Luz');
    console.log('Events found:', events.length);
    console.log('Sample event:', events[0]);

    console.log('\nTesting venue search...');
    const venues = await provider.searchVenues('Seattle');
    console.log('Venues found:', venues.length);
    console.log('Sample venue:', venues[0]);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApi();
