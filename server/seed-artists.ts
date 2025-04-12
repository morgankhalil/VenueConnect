import { db } from './db';
import { artists } from '../shared/schema';

/**
 * Seed the database with sample artist data
 */
async function seedArtists() {
  console.log('Seeding artists data...');

  try {
    // Check if we already have artists
    const existingArtists = await db.select().from(artists);
    
    if (existingArtists.length > 0) {
      console.log(`Found ${existingArtists.length} existing artists, skipping seed.`);
      return;
    }
    
    // Sample artist data
    const artistData = [
      {
        name: 'The Midnight Echo',
        imageUrl: null,
        websiteUrl: 'https://themidnightecho.com',
        genres: ['rock', 'indie'],
        popularity: 78
      },
      {
        name: 'Lunar Wave',
        imageUrl: null,
        websiteUrl: 'https://lunarwave.music',
        genres: ['electronic', 'ambient'],
        popularity: 65
      },
      {
        name: 'Crimson Heights',
        imageUrl: null,
        websiteUrl: 'https://crimsonheights.band',
        genres: ['rock', 'alternative'],
        popularity: 82
      },
      {
        name: 'Velvet Skies',
        imageUrl: null,
        websiteUrl: 'https://velvetskies.com',
        genres: ['indie', 'pop'],
        popularity: 75
      },
      {
        name: 'Electric Pulse',
        imageUrl: null,
        websiteUrl: 'https://electricpulse.io',
        genres: ['electronic', 'techno'],
        popularity: 88
      }
    ];
    
    console.log(`Adding ${artistData.length} artists...`);
    
    // Insert artists
    for (const artist of artistData) {
      const [newArtist] = await db.insert(artists).values(artist).returning();
      console.log(`Added artist: ${newArtist.name}`);
    }
    
    console.log('Artist seeding completed successfully.');

  } catch (error) {
    console.error('Error seeding artists:', error);
  }
}

// Run the seed function
seedArtists()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed artists:', error);
    process.exit(1);
  });