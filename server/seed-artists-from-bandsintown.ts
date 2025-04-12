import dotenv from 'dotenv';
import { db } from './db';
import { artists, events } from '../shared/schema';
import { PredictHQProvider } from './data-sync/predict-hq-provider';
import { eq } from 'drizzle-orm';

dotenv.config();

async function seedArtistsFromPredictHQ(artistNames: string[]) {
  const apiKey = process.env.PREDICTHQ_API_KEY;
  if (!apiKey) {
    throw new Error('PredictHQ API key is not configured');
  }

  const provider = new PredictHQProvider(apiKey);

  console.log('Database connection initialized');
  console.log(`Using provided artist names: ${artistNames.join(', ')}`);
  console.log('Starting PredictHQ artist and event sync...');

  for (const artistName of artistNames) {
    try {
      console.log(`Syncing artist: ${artistName}`);
      const events = await provider.getArtistEvents(artistName);

      // Add artist if not exists
      const existingArtist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);

      if (!existingArtist.length) {
        await db.insert(artists).values({
          name: artistName,
          genres: ['rock'], // Default genre
          popularity: 50,
          description: `Artist synced from PredictHQ: ${artistName}`
        });
      }

      console.log(`Successfully synced ${events.length} events for ${artistName}`);
    } catch (error) {
      console.error(`Error syncing artist ${artistName}:`, error);
    }
  }

  console.log('\nSync Completed!');
}

// Get artist names from command line args or use defaults
const artistNames = process.argv.slice(2);
if (artistNames.length === 0) {
  console.error('Please provide at least one artist name');
  process.exit(1);
}

seedArtistsFromPredictHQ(artistNames);