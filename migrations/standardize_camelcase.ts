/**
 * Standardize column names to use camelCase format
 * This migration renames snake_case columns to camelCase to match our schema definitions
 */
import { sql } from 'drizzle-orm';
import { db } from '../server/db';

async function main() {
  try {
    console.log('Starting column name standardization to camelCase...');

    // Rename columns in artists table
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "created_at" TO "createdAt";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "bandsintown_id" TO "bandsintownId";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "songkick_id" TO "songkickId";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "image_url" TO "imageUrl";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "website_url" TO "websiteUrl";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "social_media_links" TO "socialMediaLinks";`);
    await db.execute(sql`ALTER TABLE "artists" RENAME COLUMN "spotify_id" TO "spotifyId";`);

    console.log('Successfully standardized artists table columns');

    // Rename columns in events table
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "created_at" TO "createdAt";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "artist_id" TO "artistId";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "venue_id" TO "venueId";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "start_time" TO "startTime";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "ticket_url" TO "ticketUrl";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "source_id" TO "sourceId";`);
    await db.execute(sql`ALTER TABLE "events" RENAME COLUMN "source_name" TO "sourceName";`);

    console.log('Successfully standardized events table columns');

    // Rename columns in venues table (only the snake_case ones)
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "owner_id" TO "ownerId";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "market_category" TO "marketCategory";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "venue_type" TO "venueType";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "capacity_category" TO "capacityCategory";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "primary_genre" TO "primaryGenre";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "secondary_genres" TO "secondaryGenres";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "typical_booking_lead_time_days" TO "typicalBookingLeadTimeDays";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "local_accommodation" TO "localAccommodation";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "local_promotion" TO "localPromotion";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "contact_phone" TO "contactPhone";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "booking_contact_name" TO "bookingContactName";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "booking_email" TO "bookingEmail";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "age_restriction" TO "ageRestriction";`);
    await db.execute(sql`ALTER TABLE "venues" RENAME COLUMN "payment_structure" TO "paymentStructure";`);

    console.log('Successfully standardized venues table columns');

    // Add more tables as needed

    console.log('Column name standardization completed successfully');
  } catch (error) {
    console.error('Error standardizing column names:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });