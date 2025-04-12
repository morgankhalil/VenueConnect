import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Finalize the standardization of all remaining columns to camelCase
 * This migration addresses the remaining snake_case columns not handled in previous migrations
 */
async function main() {
  console.log('Starting final database column standardization...');

  try {
    // Standardize inquiries columns
    console.log('Standardizing inquiries columns...');
    await db.execute(sql`ALTER TABLE inquiries RENAME COLUMN created_at TO "createdAt"`);

    // Standardize messages columns
    console.log('Standardizing messages columns...');
    await db.execute(sql`ALTER TABLE messages RENAME COLUMN receiver_id TO "receiverId"`);
    await db.execute(sql`ALTER TABLE messages RENAME COLUMN sender_id TO "senderId"`);
    await db.execute(sql`ALTER TABLE messages RENAME COLUMN sender_name TO "senderName"`);

    // Standardize predictions columns
    console.log('Standardizing predictions columns...');
    await db.execute(sql`ALTER TABLE predictions RENAME COLUMN created_at TO "createdAt"`);

    // Standardize users columns
    console.log('Standardizing users columns...');
    await db.execute(sql`ALTER TABLE users RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE users RENAME COLUMN venue_id TO "venueId"`);

    // Standardize webhookConfigurations columns
    console.log('Standardizing webhookConfigurations columns...');
    await db.execute(sql`ALTER TABLE "webhookConfigurations" RENAME COLUMN created_at TO "createdAt"`);
    await db.execute(sql`ALTER TABLE "webhookConfigurations" RENAME COLUMN is_enabled TO "isEnabled"`);

    console.log('Final column standardization completed successfully');
  } catch (error) {
    console.error('Error during final standardization:', error);
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