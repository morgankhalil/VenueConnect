/**
 * Test script for Bandsintown Artist Info API
 * 
 * This script tests the Bandsintown API's artist info endpoint:
 * GET /artists/{artistname}
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for API key
const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;
if (!BANDSINTOWN_API_KEY) {
  console.error('Error: BANDSINTOWN_API_KEY environment variable is not set');
  process.exit(1);
}

// Base URL for Bandsintown API
const BANDSINTOWN_API_BASE_URL = 'https://rest.bandsintown.com';

/**
 * Fetch artist information from Bandsintown
 */
async function getArtistInfo(artistName: string) {
  try {
    console.log(`Testing artist info endpoint for: ${artistName}`);

    // URL encode the artist name
    const encodedArtistName = encodeURIComponent(artistName);

    // Construct the API URL
    const url = `${BANDSINTOWN_API_BASE_URL}/artists/${encodedArtistName}?app_id=${BANDSINTOWN_API_KEY}`;
    
    console.log(`Request URL: ${url}`);
    
    // Make the API request
    const response = await axios.get(url);
    
    // Log the response status and data
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching artist info: ${error}`);
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response data:`, error.response?.data);
    }
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get artist name from command line
    const artistName = process.argv[2] || 'Coldplay';
    
    // Get artist info
    await getArtistInfo(artistName);
  } catch (error) {
    console.error(`Error in main function: ${error}`);
  }
}

// Run the script if it's the main module
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}