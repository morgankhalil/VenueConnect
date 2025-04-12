import { sql } from "drizzle-orm";
import { db } from "../server/db";

/**
 * Clean up redundant and unused columns in the venues table
 * This migration:
 * 1. Removes the duplicate 'website' column (in favor of 'website_url')
 * 2. Drops other unused columns: 'contact_email' (in favor of 'booking_email')
 * 3. Keeps but doesn't drop external IDs (bandsintown_id, songkick_id) which might be useful later
 */
async function main() {
  console.log("Starting venues table column cleanup...");

  try {
    // Drop the 'website' column since we use 'website_url' instead
    console.log("Dropping 'website' column (redundant with 'website_url')...");
    await db.execute(sql`ALTER TABLE venues DROP COLUMN IF EXISTS website`);

    // Drop the unused 'contact_email' column since we use 'booking_email' 
    console.log("Dropping 'contact_email' column (redundant with 'booking_email')...");
    await db.execute(sql`ALTER TABLE venues DROP COLUMN IF EXISTS contact_email`);

    // We're keeping bandsintown_id and songkick_id because these could be useful 
    // for future API integration, even though they're currently empty
    // Similarly, social_media_links is a useful structure for the future

    console.log("Venues table columns successfully cleaned up.");
  } catch (error) {
    console.error("Error during venues table cleanup:", error);
    throw error;
  }
}

// Execute the function
main()
  .catch(error => {
    console.error("Failed to clean up venues table:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Venues table cleanup migration completed");
    process.exit(0);
  });