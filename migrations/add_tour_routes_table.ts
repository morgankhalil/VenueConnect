import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Add tour_routes table to implement the Tour Optimization Engine
 * This table will store optimized routes between venues for tours
 */
async function main() {
  console.log('Adding tour_routes table...');

  // Check if table already exists
  const checkTable = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'tour_routes'
    )
  `);

  const tableExists = checkTable.rows[0]?.exists === true;
  
  if (tableExists) {
    console.log('Table tour_routes already exists. Skipping creation.');
    return;
  }

  // Create the tour_routes table
  await db.execute(sql`
    CREATE TABLE tour_routes (
      id SERIAL PRIMARY KEY,
      tour_id INTEGER NOT NULL REFERENCES tours(id),
      start_venue_id INTEGER REFERENCES venues(id),
      end_venue_id INTEGER REFERENCES venues(id),
      distance_km REAL,
      estimated_travel_time_minutes INTEGER,
      optimization_score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('tour_routes table created successfully');
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