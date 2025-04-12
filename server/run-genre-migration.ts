/**
 * Direct migration runner for standardizing genre tables and columns to camelCase
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Run the migration to standardize genre tables
 */
async function main() {
  console.log("Starting standardization of genre tables and columns to camelCase...");

  try {
    // Step 1: Check if the tables already exist (to avoid running the migration multiple times)
    const checkArtistGenres = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'artistGenres'
      );
    `);
    
    const artistGenresExists = checkArtistGenres.rows[0].exists;
    
    if (artistGenresExists) {
      console.log("Tables already migrated, skipping...");
      return;
    }
    
    // Step 2: Fix the genres table columns
    console.log("Standardizing 'genres' table columns...");
    await db.execute(sql`ALTER TABLE "genres" RENAME COLUMN "parent_id" TO "parentId";`);
    await db.execute(sql`ALTER TABLE "genres" RENAME COLUMN "created_at" TO "createdAt";`);
    
    // Step 3: Create new tables with camelCase naming
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
    
    // Step 4: Copy data from old tables to new tables
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
    
    // Step 5: Verify data integrity
    console.log("Verifying data integrity...");
    
    const artistGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "artist_genres";`);
    const newArtistGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "artistGenres";`);
    
    const venueGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "venue_genres";`);
    const newVenueGenresCount = await db.execute(sql`SELECT COUNT(*) FROM "venueGenres";`);
    
    console.log(`Original artist_genres count: ${artistGenresCount.rows[0].count}`);
    console.log(`New artistGenres count: ${newArtistGenresCount.rows[0].count}`);
    
    console.log(`Original venue_genres count: ${venueGenresCount.rows[0].count}`);
    console.log(`New venueGenres count: ${newVenueGenresCount.rows[0].count}`);
    
    // Step 6: Drop old tables, but only if data integrity is confirmed
    if (artistGenresCount.rows[0].count == newArtistGenresCount.rows[0].count &&
        venueGenresCount.rows[0].count == newVenueGenresCount.rows[0].count) {
      console.log("Data integrity confirmed, dropping old snake_case tables...");
      await db.execute(sql`DROP TABLE IF EXISTS "artist_genres";`);
      await db.execute(sql`DROP TABLE IF EXISTS "venue_genres";`);
      console.log("Migration completed successfully!");
    } else {
      console.error("Data integrity check failed, aborting table drop");
      console.log(`Original artist_genres: ${artistGenresCount.rows[0].count} vs New artistGenres: ${newArtistGenresCount.rows[0].count}`);
      console.log(`Original venue_genres: ${venueGenresCount.rows[0].count} vs New venueGenres: ${newVenueGenresCount.rows[0].count}`);
      throw new Error("Data integrity check failed");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Execute migration
main()
  .then(() => {
    console.log("Migration completed, exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });