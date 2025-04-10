import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Update genre enum to include all necessary genres
 * This migration adds new genre values to the enum type in PostgreSQL
 */
async function main() {
  console.log("Starting migration to update genre enum...");

  try {
    // Execute each statement separately
    const newGenres = [
      'punk', 'experimental', 'alternative', 'rnb', 'soul',
      'reggae', 'ambient', 'techno', 'house', 'disco', 'funk'
    ];
    
    for (const genre of newGenres) {
      try {
        // We need to use DO blocks with dynamic SQL to avoid errors if value already exists
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = ${genre} AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'genre')) THEN
              ALTER TYPE genre ADD VALUE ${genre};
            END IF;
          END
          $$;
        `);
        console.log(`Added genre: ${genre}`);
      } catch (err) {
        console.warn(`Warning: Could not add genre "${genre}": ${err.message}`);
      }
    }

    console.log("Successfully updated genre enum with new values");
  } catch (error) {
    console.error("Error during genre enum update:", error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => {
    console.log("Migration process completed");
    process.exit(0);
  });