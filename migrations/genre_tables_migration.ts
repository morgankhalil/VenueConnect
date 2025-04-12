/**
 * Migration to replace genre enum with flexible genre tables
 * 
 * This migration:
 * 1. Creates a new genres table
 * 2. Creates an artist_genres junction table
 * 3. Creates a venue_genres junction table
 * 4. Seeds initial genres based on existing enum values
 * 5. Migrates existing relationships
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { and, eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting genre tables migration...');
    
    // Step 1: Create the genres table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        parent_id INTEGER REFERENCES genres(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created genres table');
    
    // Step 2: Create the artist_genres junction table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS artist_genres (
        artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
        genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (artist_id, genre_id)
      )
    `);
    console.log('Created artist_genres junction table');
    
    // Step 3: Create the venue_genres junction table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS venue_genres (
        venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
        genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (venue_id, genre_id)
      )
    `);
    console.log('Created venue_genres junction table');
    
    // Step 4: Seed initial genres based on existing enum values
    const baseGenres = [
      "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", 
      "world", "classical", "country", "punk", "experimental", "alternative", "rnb", "soul",
      "reggae", "ambient", "techno", "house", "disco", "funk", "other"
    ];
    
    // Insert base genres
    for (const genre of baseGenres) {
      const slug = genre.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
      await db.execute(sql`
        INSERT INTO genres (name, slug) 
        VALUES (${genre}, ${slug})
        ON CONFLICT (name) DO NOTHING
      `);
    }
    console.log('Seeded base genres');
    
    // Step 5: Get all extended genres from the existing enum and create relationships
    const extendedGenres = [
      { name: "indie_rock", parent: "indie", additionalParent: "rock" },
      { name: "indie_pop", parent: "indie", additionalParent: "pop" },
      { name: "indie_folk", parent: "indie", additionalParent: "folk" },
      { name: "surf_rock", parent: "rock" },
      { name: "psychedelic_rock", parent: "rock" },
      { name: "lo_fi", parent: "experimental" },
      { name: "dream_pop", parent: "pop" },
      { name: "power_pop", parent: "pop" },
      { name: "jangle_pop", parent: "pop" },
      { name: "folk_rock", parent: "folk", additionalParent: "rock" },
      { name: "garage_rock", parent: "rock" },
      { name: "art_pop", parent: "pop" },
      { name: "bedroom_pop", parent: "pop" },
      { name: "alternative_country", parent: "country", additionalParent: "alternative" },
      { name: "emo", parent: "rock" },
      { name: "soft_rock", parent: "rock" },
      { name: "post_punk", parent: "punk" },
      { name: "art_rock", parent: "rock" },
      { name: "slacker_rock", parent: "rock" },
      { name: "shoegaze", parent: "rock" },
      { name: "noise_rock", parent: "rock" },
      { name: "math_rock", parent: "rock" },
      { name: "post_rock", parent: "rock" },
      { name: "krautrock", parent: "rock" }
    ];
    
    // Insert extended genres and set up parent relationships
    for (const genre of extendedGenres) {
      const name = genre.name.replace(/_/g, ' ');
      const slug = genre.name.replace(/_/g, '-');
      
      // Get parent genre ID
      const parentGenre = await db.execute(sql`
        SELECT id FROM genres WHERE name = ${genre.parent}
      `);
      
      if (parentGenre.rows.length > 0) {
        const parentId = parentGenre.rows[0].id;
        
        // Insert the extended genre with parent relationship
        await db.execute(sql`
          INSERT INTO genres (name, slug, parent_id) 
          VALUES (${name}, ${slug}, ${parentId})
          ON CONFLICT (name) DO NOTHING
        `);
        
        console.log(`Added genre ${name} with parent ${genre.parent}`);
      }
    }
    
    // Step 6: Migrate existing artist genres
    // Get all artists
    const artists = await db.execute(sql`SELECT id, genres FROM artists`);
    for (const artist of artists.rows) {
      if (artist.genres && artist.genres.length > 0) {
        for (const genreName of artist.genres) {
          // Find the genre in the new table
          const genreRows = await db.execute(sql`
            SELECT id FROM genres 
            WHERE name = ${genreName} OR name = ${genreName.replace(/_/g, ' ')}
          `);
          
          if (genreRows.rows.length > 0) {
            const genreId = genreRows.rows[0].id;
            // Insert into junction table
            await db.execute(sql`
              INSERT INTO artist_genres (artist_id, genre_id)
              VALUES (${artist.id}, ${genreId})
              ON CONFLICT DO NOTHING
            `);
          }
        }
      }
    }
    console.log('Migrated existing artist genres');
    
    // Step 7: Migrate venue primary and secondary genres
    const venues = await db.execute(sql`
      SELECT id, "primaryGenre", "secondaryGenres" FROM venues
    `);
    
    for (const venue of venues.rows) {
      // Migrate primary genre
      if (venue.primaryGenre) {
        const genreRows = await db.execute(sql`
          SELECT id FROM genres 
          WHERE name = ${venue.primaryGenre} OR name = ${venue.primaryGenre.replace(/_/g, ' ')}
        `);
        
        if (genreRows.rows.length > 0) {
          const genreId = genreRows.rows[0].id;
          // Insert primary genre
          await db.execute(sql`
            INSERT INTO venue_genres (venue_id, genre_id, is_primary)
            VALUES (${venue.id}, ${genreId}, TRUE)
            ON CONFLICT DO NOTHING
          `);
        }
      }
      
      // Migrate secondary genres
      if (venue.secondaryGenres && venue.secondaryGenres.length > 0) {
        for (const genreName of venue.secondaryGenres) {
          const genreRows = await db.execute(sql`
            SELECT id FROM genres 
            WHERE name = ${genreName} OR name = ${genreName.replace(/_/g, ' ')}
          `);
          
          if (genreRows.rows.length > 0) {
            const genreId = genreRows.rows[0].id;
            // Insert secondary genre
            await db.execute(sql`
              INSERT INTO venue_genres (venue_id, genre_id, is_primary)
              VALUES (${venue.id}, ${genreId}, FALSE)
              ON CONFLICT DO NOTHING
            `);
          }
        }
      }
    }
    console.log('Migrated existing venue genres');
    
    console.log('Genre tables migration completed successfully!');
    
  } catch (error) {
    console.error('Error during genre tables migration:', error);
    process.exit(1);
  }
}

// Execute the migration
main();