/**
 * Migration to fix missing genre relationships
 * 
 * This script:
 * 1. Identifies artists with array genres but no junction table entries
 * 2. Creates the appropriate junction table entries for these artists
 * 3. Ensures all genres are properly represented in both storage methods
 */

import { db } from '../server/db';
import { artists, genres, artistGenres } from '../shared/schema';
import { sql, eq, inArray } from 'drizzle-orm';

// Helper function to convert genre enum values to match genre names in the genres table
function normalizeGenreName(enumGenre: string): string {
  return enumGenre.replace(/_/g, ' ');
}

// Helper function to convert a string to a slug
function toSlug(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}

async function getGenreIdByName(genreName: string): Promise<number | null> {
  const normalizedName = normalizeGenreName(genreName);
  const slug = toSlug(normalizedName);
  
  const result = await db
    .select({ id: genres.id })
    .from(genres)
    .where(
      sql`LOWER(${genres.name}) = LOWER(${normalizedName}) OR ${genres.slug} = ${slug}`
    )
    .limit(1);
  
  return result.length > 0 ? result[0].id : null;
}

async function main() {
  console.log('Running migration to fix missing genre relationships...');
  
  // Get all artists with array genres but no junction table entries
  const artistsWithArrayGenresNoJunction = await db.execute(sql`
    SELECT a.id, a.name, a.genres
    FROM artists a
    WHERE array_length(a.genres, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM "artistGenres" ag WHERE ag."artistId" = a.id
    )
  `);
  
  const artistCount = artistsWithArrayGenresNoJunction.rows.length;
  console.log(`Found ${artistCount} artists with array genres but no junction table entries`);
  
  // Process each artist
  let successCount = 0;
  let errorCount = 0;
  
  for (const artistRow of artistsWithArrayGenresNoJunction.rows) {
    // Parse genres from the PostgreSQL array format (comes as a string like '{rock,indie}')
    let genreArray: string[] = [];
    if (typeof artistRow.genres === 'string') {
      // Remove braces and split by comma
      const genresStr = artistRow.genres.replace(/^\{|\}$/g, '');
      genreArray = genresStr.split(',').map(g => g.trim());
    } else if (Array.isArray(artistRow.genres)) {
      genreArray = artistRow.genres;
    }
    
    const artist = {
      id: artistRow.id,
      name: artistRow.name,
      genres: genreArray
    };
    
    console.log(`\nProcessing artist: ${artist.name} (${artist.id})`);
    console.log(`  Array genres: ${artist.genres.join(', ')}`);
    
    // Find genre IDs
    const genreEntries = [];
    
    for (const genreEnum of artist.genres) {
      const genreId = await getGenreIdByName(genreEnum);
      
      if (genreId) {
        genreEntries.push({
          artistId: artist.id,
          genreId
        });
      } else {
        console.log(`  ⚠️ Could not find genre ID for "${genreEnum}"`);
      }
    }
    
    if (genreEntries.length > 0) {
      try {
        // Insert genre relationships
        await db
          .insert(artistGenres)
          .values(genreEntries);
        
        console.log(`  ✅ Added ${genreEntries.length} genre relationships`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error adding genre relationships:`, error);
        errorCount++;
      }
    } else {
      console.log(`  ❌ No valid genres found to add`);
      errorCount++;
    }
  }
  
  // Check for venues with primary/secondary genres but no junction entries
  const venuesWithColumnsNoJunction = await db.execute(sql`
    SELECT v.id, v.name, v."primaryGenre", v."secondaryGenres"
    FROM venues v
    WHERE v."primaryGenre" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "venueGenres" vg WHERE vg."venueId" = v.id
    )
  `);
  
  const venueCount = venuesWithColumnsNoJunction.rows.length;
  console.log(`\nFound ${venueCount} venues with column genres but no junction table entries`);
  
  // Process each venue
  let venueSuccessCount = 0;
  let venueErrorCount = 0;
  
  for (const venueRow of venuesWithColumnsNoJunction.rows) {
    // Parse primary genre
    let primaryGenre = venueRow.primaryGenre;
    
    // Parse secondary genres from the PostgreSQL array format
    let secondaryGenres: string[] = [];
    if (typeof venueRow.secondaryGenres === 'string') {
      // Remove braces and split by comma
      const genresStr = venueRow.secondaryGenres.replace(/^\{|\}$/g, '');
      secondaryGenres = genresStr.split(',').map((g: string) => g.trim());
    } else if (Array.isArray(venueRow.secondaryGenres)) {
      secondaryGenres = venueRow.secondaryGenres;
    }
    
    console.log(`\nProcessing venue: ${venueRow.name} (${venueRow.id})`);
    console.log(`  Primary genre: ${primaryGenre}`);
    console.log(`  Secondary genres: ${secondaryGenres.join(', ')}`);
    
    // Find primary genre ID
    const primaryGenreId = primaryGenre ? await getGenreIdByName(primaryGenre) : null;
    if (!primaryGenreId && primaryGenre) {
      console.log(`  ⚠️ Could not find genre ID for primary genre "${primaryGenre}"`);
    }
    
    // Find secondary genre IDs
    const secondaryGenreIds: number[] = [];
    for (const genreEnum of secondaryGenres) {
      const genreId = await getGenreIdByName(genreEnum);
      if (genreId) {
        secondaryGenreIds.push(genreId);
      } else {
        console.log(`  ⚠️ Could not find genre ID for secondary genre "${genreEnum}"`);
      }
    }
    
    // Generate venue genre entries
    const venueGenreEntries = [];
    
    if (primaryGenreId) {
      venueGenreEntries.push({
        venueId: venueRow.id,
        genreId: primaryGenreId,
        isPrimary: true
      });
    }
    
    secondaryGenreIds.forEach((genreId) => {
      venueGenreEntries.push({
        venueId: venueRow.id,
        genreId,
        isPrimary: false
      });
    });
    
    if (venueGenreEntries.length > 0) {
      try {
        // Insert genre relationships
        await db
          .insert(venueGenres)
          .values(venueGenreEntries);
        
        console.log(`  ✅ Added ${venueGenreEntries.length} genre relationships`);
        venueSuccessCount++;
      } catch (error) {
        console.error(`  ❌ Error adding venue genre relationships:`, error);
        venueErrorCount++;
      }
    } else {
      console.log(`  ❌ No valid genres found to add for this venue`);
      venueErrorCount++;
    }
  }
  
  console.log('\nMigration complete!');
  console.log(`Summary:`);
  console.log(`- ${artistCount} artists needed fixing`);
  console.log(`- ${successCount} artists fixed successfully`);
  console.log(`- ${errorCount} artists had errors`);
  console.log(`- ${venueCount} venues need fixing (not addressed in this migration)`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });