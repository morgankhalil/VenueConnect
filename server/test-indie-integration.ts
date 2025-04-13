/**
 * Test script for Indie on the Move integration
 * 
 * This script tests the newly added endpoint for scraping data from Indie on the Move
 * and provides detailed logging for debugging
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Test scraping from specific states
async function testIndieOnTheMoveIntegration() {
  console.log('Testing Indie on the Move integration...');

  try {
    console.log('Sending request to seed from Indie on the Move...');
    // Note: Using one state (MA) to minimize load during testing
    const response = await axios.post('http://localhost:5000/api/events/seed-from-indie', {
      states: ['MA'] 
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status}`);
    
    if (response.data.success) {
      console.log('✅ Successfully seeded data from Indie on the Move:');
      console.log(`- Venues added: ${response.data.totalVenues}`);
      console.log(`- Events added: ${response.data.totalEvents}`);
      console.log(`- Artists added: ${response.data.totalArtists}`);
    } else {
      console.error('❌ Failed to seed data:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    }
  }
}

// Test the events stats endpoint to verify data was inserted
async function testEventStats() {
  try {
    console.log('\nChecking event statistics...');
    const response = await axios.get('http://localhost:5000/api/events/event-stats');
    
    console.log('Current event statistics:');
    console.log(`- Total events: ${response.data.totalEvents}`);
    console.log(`- Venues with events: ${response.data.venuesWithEvents}`);
    console.log(`- Artists with events: ${response.data.artistsWithEvents}`);
  } catch (error) {
    console.error('❌ Error fetching event stats:', error);
  }
}

// Run the tests
async function runTests() {
  try {
    await testIndieOnTheMoveIntegration();
    await testEventStats();
    
    console.log('\n✅ Tests completed');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  }
}

runTests().catch(console.error);