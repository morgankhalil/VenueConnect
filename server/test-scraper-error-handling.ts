/**
 * Test script for error handling in the Indie on the Move scraper
 * 
 * This script tests the improved error handling in our scraper functions:
 * 1. Tests getAvailableStates with proper defaults
 * 2. Tests venue scraping with intentional errors
 * 3. Tests venue details scraping with invalid URLs
 */

import { 
  getAvailableStates, 
  scrapeIndieVenuesByState, 
  scrapeVenueDetails, 
  scrapeUpcomingShows
} from './services/indie-on-the-move-scraper';

/**
 * Main test function
 */
async function testErrorHandling() {
  console.log('Starting scraper error handling tests');
  
  try {
    // Test 1: Get available states
    console.log('\n--- Test 1: Get Available States ---');
    const states = await getAvailableStates();
    console.log(`Found ${states.length} states: ${states.join(', ')}`);
    
    // Test 2: Get venues for a valid state
    console.log('\n--- Test 2: Get Venues for Valid State ---');
    const maVenues = await scrapeIndieVenuesByState('MA');
    console.log(`Found ${maVenues.length} venues in MA`);
    
    // Test 3: Get venues for an invalid state
    console.log('\n--- Test 3: Get Venues for Invalid State ---');
    const invalidVenues = await scrapeIndieVenuesByState('XX');
    console.log(`Found ${invalidVenues.length} venues in XX (should be 0)`);
    
    // Test 4: Get venue details for a valid venue
    console.log('\n--- Test 4: Get Venue Details for Valid Venue ---');
    if (maVenues.length > 0 && maVenues[0].venueUrl) {
      const details = await scrapeVenueDetails(maVenues[0].venueUrl);
      console.log(`Got details for ${details.name}:`, {
        hasAddress: !!details.address,
        hasCapacity: !!details.capacity,
        hasBookingEmail: !!details.bookingEmail,
        hasWebsite: !!details.websiteUrl
      });
    } else {
      console.log('No venues found to test details');
    }
    
    // Test 5: Get venue details for an invalid URL
    console.log('\n--- Test 5: Get Venue Details for Invalid URL ---');
    const invalidDetails = await scrapeVenueDetails('https://www.indieonthemove.com/venues/view/999999');
    console.log(`Got details for invalid venue:`, invalidDetails);
    
    // Test 6: Get upcoming shows
    console.log('\n--- Test 6: Get Upcoming Shows ---');
    const shows = await scrapeUpcomingShows();
    console.log(`Found ${shows.length} upcoming shows`);
    
    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run tests
testErrorHandling().catch(console.error);