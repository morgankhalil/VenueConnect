/**
 * Standardize genre relation tables and columns to camelCase
 * 
 * This migration renames:
 * 1. artist_genres table to artistGenres
 * 2. venue_genres table to venueGenres
 * 3. Columns like artist_id, genre_id, venue_id to artistId, genreId, venueId
 * 4. parent_id column in genres table to parentId
 * 5. is_primary column in venue_genres to isPrimary
 * 6. created_at columns to createdAt
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Main migration function
 */
export async function main() {
  console.log("Starting standardization of genre tables and columns to camelCase...");

  try {
    // Disable triggers for the migration duration
    await db.execute(sql`SET session_replication_role = 'replica';`);

    // Step 1: Fix the genres table columns
    console.log("Standardizing 'genres' table columns...");
    await db.execute(sql`ALTER TABLE "genres" RENAME COLUMN "parent_id" TO "parentId";`);
    await db.execute(sql`ALTER TABLE "genres" RENAME COLUMN "created_at" TO "createdAt";`);
    
    // Step 2: Create new tables with camelCase naming
    console.log("Creating new tables with camelCase naming...");
    
    // Create artistGenres table
    await db.execute(sql`
      CREATE TABLE "artistGenres" (
        "artistId" integer NOT NULL REFERENCES "artists"("id") ON DELETE CASCADE,
        "genreId" integer NOT NULL REFERENCES "genres"("id") ON DELETE CASCADE,
        PRIMARY KEY ("artistId", "genreId")
      );
    `);
    
    // Create venueGenres table
    await db.execute(sql`
      CREATE TABLE "venueGenres" (
        "venueId" integer NOT NULL REFERENCES "venues"("id") ON DELETE CASCADE,
        "genreId" integer NOT NULL REFERENCES "genres"("id") ON DELETE CASCADE,
        "isPrimary" boolean DEFAULT false,
        PRIMARY KEY ("venueId", "genreId")
      );
    `);
    
    // Step 3: Copy data from old tables to new tables
    console.log("Copying data to new camelCase tables...");
    
    // Transfer artist_genres data
    await db.execute(sql`
      INSERT INTO "artistGenres" ("artistId", "genreId")
      SELECT "artist_id", "genre_id" FROM "artist_genres";
    `);
    
    // Transfer venue_genres data
    await db.execute(sql`
      INSERT INTO "venueGenres" ("venueId", "genreId", "isPrimary")
      SELECT "venue_id", "genre_id", "is_primary" FROM "venue_genres";
    `);
    
    // Step 4: Verify data integrity
    console.log("Verifying data integrity...");
    
    const artistGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "artist_genres";`);
    const newArtistGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "artistGenres";`);
    
    const venueGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "venue_genres";`);
    const newVenueGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "venueGenres";`);
    
    console.log(`Original artist_genres count: ${artistGenresCount.rows[0].count}`);
    console.log(`New artistGenres count: ${newArtistGenresCount.rows[0].count}`);
    
    console.log(`Original venue_genres count: ${venueGenresCount.rows[0].count}`);
    console.log(`New venueGenres count: ${newVenueGenresCount.rows[0].count}`);
    
    // Step 5: Drop old tables
    console.log("Dropping old snake_case tables...");
    await db.execute(sql`DROP TABLE "artist_genres";`);
    await db.execute(sql`DROP TABLE "venue_genres";`);
    
    // Re-enable triggers
    await db.execute(sql`SET session_replication_role = 'default';`);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    // Re-enable triggers even if there's an error
    await db.execute(sql`SET session_replication_role = 'default';`);
    console.error("Migration failed:", error);
    throw error;
  }
}

// For direct execution
// Check if this file is being executed directly
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main()
    .then(() => {
      console.log("Migration completed, exiting...");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}