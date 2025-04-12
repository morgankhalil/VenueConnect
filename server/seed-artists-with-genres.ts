/**
 * Seed artists with proper genre relationships using the new genre tables
 * 
 * This script:
 * 1. Looks up artist genres in the flexible genre tables
 * 2. Creates artist entries with appropriate genre relationships
 * 3. Uses a smarter genre mapping approach that handles hierarchical relationships
 */

import { db } from './db';
import { artists, genres, artistGenres } from '../shared/schema';
import { eq, and, or, inArray, like } from 'drizzle-orm';

// Map of artist names to their genre(s)
const ARTIST_GENRES: Record<string, string[]> = {
  "La Luz": ["indie rock", "surf rock", "psychedelic rock"],
  "Snail Mail": ["indie rock", "lo-fi", "alternative"],
  "Japanese Breakfast": ["indie pop", "experimental", "dream pop"],
  "The Beths": ["indie rock", "power pop", "alternative"],
  "Alvvays": ["indie pop", "dream pop", "jangle pop"],
  "Lucy Dacus": ["indie rock", "folk rock", "alternative"],
  "Courtney Barnett": ["indie rock", "garage rock", "folk rock"],
  "Big Thief": ["indie folk", "indie rock", "alternative"],
  "HAIM": ["pop rock", "indie pop", "soft rock"],
  "Mitski": ["indie rock", "art pop", "experimental"],
  "Soccer Mommy": ["indie rock", "bedroom pop", "lo-fi"],
  "Waxahatchee": ["indie folk", "indie rock", "alternative country"],
  "Angel Olsen": ["indie folk", "art pop", "alternative country"],
  "Sharon Van Etten": ["indie folk", "indie rock", "alternative"],
  "Phoebe Bridgers": ["indie folk", "indie rock", "emo"]
};

/**
 * Find genre IDs by name or slug
 * This function looks up genres in the new genre table
 */
async function findGenreIds(genreNames: string[]): Promise<number[]> {
  if (!genreNames || genreNames.length === 0) {
    return [];
  }
  
  // Create an array of clauses to search by name or slug
  const searchConditions = genreNames.map(name => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    return or(
      eq(genres.name, name),
      eq(genres.slug, slug)
    );
  });
  
  // Search for matching genres
  const matchedGenres = await db
    .select({ id: genres.id, name: genres.name })
    .from(genres)
    .where(or(...searchConditions));
  
  return matchedGenres.map(g => g.id);
}

/**
 * Seed an artist with proper genre relationships
 */
async function seedArtistWithGenres(
  name: string, 
  genreNames: string[], 
  popularity = Math.floor(Math.random() * 80) + 20,
  imageUrl: string | null = null,
  description: string | null = null
) {
  console.log(`Processing artist: ${name}`);
  
  // Check if artist already exists
  const existingArtist = await db.select().from(artists).where(eq(artists.name, name));
  
  let artistId;
  if (existingArtist.length === 0) {
    console.log(`Creating artist: ${name}`);
    
    // For backward compatibility, keeping the genres array
    // But we'll also use the new genre relationship tables
    const [newArtist] = await db.insert(artists).values({
      name,
      genres: ["other"], // Placeholder to satisfy schema requirements
      popularity,
      imageUrl,
      description: description || `${name} is an artist known for ${genreNames.join(", ")}.`,
      websiteUrl: `https://www.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/`
    }).returning();
    
    artistId = newArtist.id;
    console.log(`Created artist: ${name} with ID ${artistId}`);
  } else {
    artistId = existingArtist[0].id;
    console.log(`Artist ${name} already exists with ID ${artistId}`);
  }
  
  // Find genre IDs
  const genreIds = await findGenreIds(genreNames);
  console.log(`Found ${genreIds.length} matching genres for ${name}`);
  
  // Clear existing genre relationships for this artist
  await db.delete(artistGenres).where(eq(artistGenres.artistId, artistId));
  
  // Create genre relationships
  if (genreIds.length > 0) {
    for (const genreId of genreIds) {
      await db.insert(artistGenres).values({
        artistId,
        genreId
      }).onConflictDoNothing();
    }
    console.log(`Added ${genreIds.length} genre relationships for ${name}`);
  }
  
  return artistId;
}

/**
 * Main function to seed all artists with proper genre relationships
 */
async function seedAllArtistsWithGenres() {
  try {
    console.log('Starting artist seeding with new genre system...');
    
    // Seed each artist in our mapping
    for (const [artistName, artistGenres] of Object.entries(ARTIST_GENRES)) {
      await seedArtistWithGenres(artistName, artistGenres);
    }
    
    console.log('Artist seeding with genre relationships completed!');
  } catch (error) {
    console.error('Error seeding artists with genres:', error);
    process.exit(1);
  }
}

// Execute the script
seedAllArtistsWithGenres();