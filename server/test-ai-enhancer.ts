import { db } from './db';
import { venues, artists } from '../shared/schema';
import { aiDataEnhancer } from './services/ai-data-enhancer';
import { eq } from 'drizzle-orm';

/**
 * Test script for AI Data Enhancement Service
 * 
 * This script tests the AI-powered venue and artist data enhancement:
 * 1. Gets a venue and artist from the database
 * 2. Tries to enhance their descriptions
 * 3. Logs the results
 * 
 * Usage:
 * ```
 * tsx server/test-ai-enhancer.ts
 * ```
 */
async function main() {
  console.log('Starting AI data enhancer test...');
  
  // Get OpenAI API key from environment
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.error('OpenAI API key is required. Please set the OPENAI_API_KEY environment variable.');
    process.exit(1);
  }

  // Initialize the AI data enhancer
  const initialized = aiDataEnhancer.initializeOpenAI(openaiKey);
  if (!initialized) {
    console.error('Failed to initialize OpenAI client. Check your API key and try again.');
    process.exit(1);
  }
  
  console.log('OpenAI client initialized successfully.');

  // Get a venue to test with
  const venues = await db.query.venues.findMany({
    limit: 1,
  });

  if (venues.length === 0) {
    console.error('No venues found in the database.');
    process.exit(1);
  }

  const venue = venues[0];
  console.log(`Testing with venue: ${venue.name} (ID: ${venue.id})`);
  console.log('Original venue data:', JSON.stringify(venue, null, 2));

  // Generate a description for the venue
  try {
    console.log('Generating enhanced description...');
    const enhancedDescription = await aiDataEnhancer.enhanceVenueDescription(venue);
    console.log('Enhanced description:', enhancedDescription);

    // Normalize venue data
    console.log('Normalizing venue data...');
    const normalizedVenue = await aiDataEnhancer.normalizeVenueData(venue);
    console.log('Normalized venue data:', JSON.stringify(normalizedVenue, null, 2));

    // Enhance venue context
    console.log('Enhancing venue context...');
    const enhancedVenue = await aiDataEnhancer.enhanceVenueContext(normalizedVenue);
    console.log('Enhanced venue context:', JSON.stringify(enhancedVenue, null, 2));
  } catch (error) {
    console.error('Error enhancing venue:', error);
  }

  // Get an artist to test with
  const artists = await db.query.artists.findMany({
    limit: 1,
  });

  if (artists.length === 0) {
    console.log('No artists found in the database.');
  } else {
    const artist = artists[0];
    console.log(`\nTesting with artist: ${artist.name} (ID: ${artist.id})`);
    console.log('Original artist data:', JSON.stringify(artist, null, 2));

    // Generate a description for the artist
    try {
      console.log('Generating enhanced description...');
      const enhancedDescription = await aiDataEnhancer.enhanceArtistDescription(artist);
      console.log('Enhanced description:', enhancedDescription);

      // Normalize artist data
      console.log('Normalizing artist data...');
      const normalizedArtist = await aiDataEnhancer.normalizeArtistData(artist);
      console.log('Normalized artist data:', JSON.stringify(normalizedArtist, null, 2));
    } catch (error) {
      console.error('Error enhancing artist:', error);
    }
  }

  console.log('\nAI data enhancer test complete.');
}

// Run the main function
main().catch(error => {
  console.error('Error in AI data enhancer test:', error);
  process.exit(1);
});