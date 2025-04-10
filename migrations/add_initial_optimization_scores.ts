import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Add initial optimization score columns to tours table
 * This migration adds three new columns to store the initial (pre-optimization) metrics:
 * - initial_optimization_score: The baseline score before optimization
 * - initial_total_distance: The total distance between venues before optimization
 * - initial_travel_time_minutes: The estimated travel time before optimization
 */
async function main() {
  console.log('Adding initial optimization score columns to tours table...');

  // First check if columns already exist to avoid errors
  const checkColumns = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'tours'
    AND column_name IN ('initial_optimization_score', 'initial_total_distance', 'initial_travel_time_minutes')
  `);

  const existingColumns = checkColumns.rows.map((row: any) => row.column_name);
  
  // Add initial_optimization_score column if it doesn't exist
  if (!existingColumns.includes('initial_optimization_score')) {
    console.log('Adding initial_optimization_score column...');
    await db.execute(sql`
      ALTER TABLE tours
      ADD COLUMN initial_optimization_score INTEGER
    `);
  }

  // Add initial_total_distance column if it doesn't exist
  if (!existingColumns.includes('initial_total_distance')) {
    console.log('Adding initial_total_distance column...');
    await db.execute(sql`
      ALTER TABLE tours
      ADD COLUMN initial_total_distance REAL
    `);
  }

  // Add initial_travel_time_minutes column if it doesn't exist
  if (!existingColumns.includes('initial_travel_time_minutes')) {
    console.log('Adding initial_travel_time_minutes column...');
    await db.execute(sql`
      ALTER TABLE tours
      ADD COLUMN initial_travel_time_minutes INTEGER
    `);
  }

  console.log('Migration completed successfully.');
}

// Run the migration
main()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });