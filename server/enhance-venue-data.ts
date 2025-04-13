import { db } from './db';
import { venues } from '../shared/schema';
import { aiDataEnhancer } from './services/ai-data-enhancer';
import { askKey } from './helpers/ask-key';

/**
 * Venue Data Enhancement Script
 * 
 * This script uses AI to enhance venue data in the database:
 * 1. Normalizes inconsistent venue data formats
 * 2. Generates descriptions for venues with minimal information
 * 3. Adds contextual data like market category, venue type, etc.
 * 
 * Usage:
 * - Run with no arguments to process all venues without descriptions
 * - Run with venue IDs as arguments to process specific venues
 * 
 * Example:
 * ```
 * tsx server/enhance-venue-data.ts
 * tsx server/enhance-venue-data.ts 1 2 3
 * ```
 */
async function main() {
  console.log('Starting venue data enhancement process...');
  
  // Get OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY || await askKey('OpenAI API Key');

  if (!openaiKey) {
    console.error('OpenAI API key is required for data enhancement. Please set OPENAI_API_KEY environment variable or provide it when prompted.');
    process.exit(1);
  }

  // Initialize the AI data enhancer
  const initialized = aiDataEnhancer.initializeOpenAI(openaiKey);
  if (!initialized) {
    console.error('Failed to initialize OpenAI client. Check your API key and try again.');
    process.exit(1);
  }

  // Determine which venues to enhance
  let venueIds: number[] = [];
  
  // If venue IDs are provided as arguments, use those
  if (process.argv.length > 2) {
    venueIds = process.argv.slice(2).map(id => parseInt(id, 10));
    console.log(`Processing ${venueIds.length} specified venues: ${venueIds.join(', ')}`);
  } else {
    // Otherwise, find venues that need enhancement (those without descriptions or with minimal ones)
    const allVenues = await db.select({
      id: venues.id,
      name: venues.name,
      description: venues.description
    }).from(venues);
    
    // Filter for venues with no description or very short descriptions
    venueIds = allVenues
      .filter(venue => !venue.description || venue.description.length < 50)
      .map(venue => venue.id);
      
    console.log(`Found ${venueIds.length} venues that need description enhancement.`);
  }
  
  if (venueIds.length === 0) {
    console.log('No venues found that need enhancement. Exiting.');
    process.exit(0);
  }
  
  // Process venues in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const batches = [];
  
  for (let i = 0; i < venueIds.length; i += BATCH_SIZE) {
    batches.push(venueIds.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Processing venues in ${batches.length} batches of up to ${BATCH_SIZE} venues each.`);
  
  let totalEnhanced = 0;
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}...`);
    const batch = batches[i];
    
    try {
      const enhancedCount = await aiDataEnhancer.enhanceVenueBatch(batch);
      totalEnhanced += enhancedCount;
      console.log(`Successfully enhanced ${enhancedCount}/${batch.length} venues in batch ${i + 1}.`);
    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
    }
    
    // Add a delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      console.log('Waiting before processing next batch...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`Venue enhancement complete. Enhanced ${totalEnhanced}/${venueIds.length} venues.`);
}

// Helper to check if a venue needs enhancement
async function venueNeedsEnhancement(venueId: number): Promise<boolean> {
  const [venue] = await db.select({
    description: venues.description
  }).from(venues).where(({ id }) => id.equals(venueId));
  
  return !venue || !venue.description || venue.description.length < 50;
}

// Run the main function
main().catch(error => {
  console.error('Error in venue data enhancement script:', error);
  process.exit(1);
});