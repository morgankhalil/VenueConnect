/**
 * Test script for Indie on the Move integration
 * 
 * This script tests the newly added endpoint for scraping data from Indie on the Move
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testIndieOnTheMoveIntegration() {
  console.log('Testing Indie on the Move integration...');

  try {
    // Test the seed-from-indie endpoint
    const response = await axios.post('http://localhost:5000/api/events/seed-from-indie', {
      states: ['MA', 'NY'] // Just test with a couple of states for faster results
    });

    console.log('Response status:', response.status);
    console.log('Response data:', response.data);

    if (response.data.success) {
      console.log(`Successfully seeded data from Indie on the Move:`);
      console.log(`- Venues added: ${response.data.totalVenues}`);
      console.log(`- Events added: ${response.data.totalEvents}`);
      console.log(`- Artists added: ${response.data.totalArtists}`);
    } else {
      console.error('Failed to seed data:', response.data.message);
    }
  } catch (error) {
    console.error('Error during testing:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testIndieOnTheMoveIntegration().catch(console.error);