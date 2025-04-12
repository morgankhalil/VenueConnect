/**
 * Test script for Bandsintown API integration
 * This script tests fetching artist events from Bandsintown
 */

import axios from 'axios';
import { db } from './db';
import { artists, genres, artistGenres } from '../shared/schema';
import { eq, sql, or } from 'drizzle-orm';

// The Bandsintown app_id - this is a public identifier required by Bandsintown API
const APP_ID = 'venueconnect';

// Test fetching artist events from Bandsintown
async function testArtistEvents(artistName: string) {
  try {
    console.log(`Testing artist events for: ${artistName}`);
    const encodedName = encodeURIComponent(artistName);
    const url = `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${APP_ID}`;
    
    console.log(`Requesting URL: ${url}`);
    const response = await axios.get(url);
    
    console.log(`Response status: ${response.status}`);
    console.log(`Events count: ${response.data.length}`);
    
    // Log a sample of the first event if available
    if (response.data.length > 0) {
      const firstEvent = response.data[0];
      console.log('\nSample event data:');
      console.log(JSON.stringify(firstEvent, null, 2));
    }
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching artist events: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// Test artist information from Bandsintown
async function testArtistInfo(artistName: string) {
  try {
    console.log(`Testing artist info for: ${artistName}`);
    const encodedName = encodeURIComponent(artistName);
    const url = `https://rest.bandsintown.com/artists/${encodedName}?app_id=${APP_ID}`;
    
    console.log(`Requesting URL: ${url}`);
    const response = await axios.get(url);
    
    console.log(`Response status: ${response.status}`);
    console.log('\nArtist data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching artist info: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Test search endpoint for an artist's events
async function testSearchEndpoint(artistName: string) {
  try {
    console.log(`Testing search endpoint for ${artistName} events`);
    
    // First get the artist ID from our database
    const artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (artistResult.length === 0) {
      console.log(`Artist ${artistName} not found in database`);
      return;
    }
    
    const artistId = artistResult[0].id;
    console.log(`Found artist ID: ${artistId}`);
    
    // Test our search endpoint
    const url = `http://localhost:5000/api/search/events?artistId=${artistId}`;
    console.log(`Requesting URL: ${url}`);
    
    const response = await axios.get(url);
    console.log(`Response status: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error: any) {
    console.error(`Error testing search endpoint: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Get artist genres
async function getArtistGenres(artistName: string) {
  try {
    console.log(`\nGetting genres for artist: ${artistName}`);
    
    // Get artist ID
    const artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (artistResult.length === 0) {
      console.log(`Artist ${artistName} not found in database`);
      return [];
    }
    
    const artistId = artistResult[0].id;
    
    // Get genres for this artist
    const artistGenresResult = await db
      .select({
        genreId: artistGenres.genreId
      })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, artistId));
    
    if (artistGenresResult.length === 0) {
      console.log(`No genres found for artist ${artistName}`);
      return [];
    }
    
    // Get genre details
    const genreIds = artistGenresResult.map(ag => ag.genreId);
    
    // Use multiple OR conditions for each genreId
    let query = db.select().from(genres);
    
    if (genreIds.length > 0) {
      const conditions = genreIds.map(id => eq(genres.id, id));
      query = query.where(or(...conditions));
    }
    
    const genreDetails = await query;
    
    console.log(`Found ${genreDetails.length} genres for ${artistName}:`);
    genreDetails.forEach(g => console.log(`- ${g.name} (ID: ${g.id})`));
    
    return genreDetails;
  } catch (error) {
    console.error(`Error getting artist genres: ${error}`);
    return [];
  }
}

// Main function
async function main() {
  // Check if artistName was provided
  const artistName = process.argv[2] || 'La Luz';
  
  console.log(`Running tests for artist: ${artistName}`);
  
  // Get artist genres first
  await getArtistGenres(artistName);
  
  // Test artist information
  console.log('\n--- Testing Artist Info ---');
  await testArtistInfo(artistName);
  
  // Test artist events
  console.log('\n--- Testing Artist Events ---');
  await testArtistEvents(artistName);
  
  // Test search endpoint
  console.log('\n--- Testing Search Endpoint ---');
  await testSearchEndpoint(artistName);
}

// Run the main function
main()
  .then(() => {
    console.log('\nAll tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });