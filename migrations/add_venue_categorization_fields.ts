import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Add venue categorization fields to venues table
 * This migration adds fields for market categories, venue types, capacity classifications, 
 * genre specialization, and booking details for independent venues
 */
async function main() {
  console.log("Starting migration to add venue categorization fields...");

  try {
    // Create the enum types first
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_category') THEN
          CREATE TYPE market_category AS ENUM ('primary', 'secondary', 'tertiary');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_type') THEN
          CREATE TYPE venue_type AS ENUM ('club', 'bar', 'theater', 'coffeehouse', 'diy_space', 'art_gallery', 'college_venue', 'community_center', 'record_store');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capacity_category') THEN
          CREATE TYPE capacity_category AS ENUM ('tiny', 'small', 'medium', 'large');
        END IF;
      END $$;
    `);

    console.log("Created enum types");

    // Add market category field
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS market_category market_category;
    `);

    // Add venue type field
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS venue_type venue_type;
    `);

    // Add capacity category field
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS capacity_category capacity_category;
    `);

    // Add primary genre field
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS primary_genre genre;
    `);

    // Add secondary genres array field
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS secondary_genres genre[];
    `);

    // Add booking contact fields
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS booking_contact_name text,
      ADD COLUMN IF NOT EXISTS booking_email text,
      ADD COLUMN IF NOT EXISTS typical_booking_lead_time_days integer,
      ADD COLUMN IF NOT EXISTS payment_structure text,
      ADD COLUMN IF NOT EXISTS sound_system text;
    `);

    // Add local support fields
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS local_accommodation boolean,
      ADD COLUMN IF NOT EXISTS local_promotion boolean;
    `);

    // Add additional venue information
    await db.execute(sql`
      ALTER TABLE venues 
      ADD COLUMN IF NOT EXISTS age_restriction text,
      ADD COLUMN IF NOT EXISTS website_url text,
      ADD COLUMN IF NOT EXISTS social_media_links jsonb,
      ADD COLUMN IF NOT EXISTS songkick_id text UNIQUE,
      ADD COLUMN IF NOT EXISTS updated_at timestamp;
    `);

    console.log("Added all venue categorization fields");
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
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