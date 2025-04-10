import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Add status_updated_at column to tour_venues table
 */
async function main() {
  console.log('Adding status_updated_at column to tour_venues table...');
  
  try {
    // Check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tour_venues' 
      AND column_name = 'status_updated_at'
    `);
    
    if (checkResult.rows.length === 0) {
      // Column doesn't exist, add it
      await db.execute(sql`
        ALTER TABLE tour_venues
        ADD COLUMN status_updated_at TIMESTAMPTZ
      `);
      console.log('Column status_updated_at added successfully');
    } else {
      console.log('Column status_updated_at already exists');
    }
  } catch (error) {
    console.error('Error adding status_updated_at column:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });