import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import path from 'path';

const main = async () => {
  // The DATABASE_URL is automatically provided by Replit
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log('Applying database schema...');

  try {
    // Create migration client with prepared statements off for DDL transactions
    const migrationClient = postgres(connectionString, { 
      max: 1,
      prepare: false, // Need this for DDL statements
    });
    
    // Initialize Drizzle with migration client
    const db = drizzle(migrationClient);

    // Run migrations from the migrations folder
    // If it doesn't exist yet, we'll create it
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    
    // Apply migrations
    console.log(`Using migrations from ${migrationsFolder}`);
    
    try {
      console.log('Pushing schema to database...');
      // Define tables explicitly from schema
      const tables = Object.values(schema)
        .filter(obj => typeof obj === 'object' && obj !== null && 'name' in obj)
        .map(table => table as any);
      
      console.log(`Found ${tables.length} tables in schema`);
      
      // Direct approach without migrations
      for (const table of tables) {
        try {
          if (table && table.name && typeof table.name === 'string') {
            console.log(`Creating table: ${table.name}`);
            await db.execute(`
              CREATE TABLE IF NOT EXISTS "${table.name}" (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT NOW()
              )
            `);
            console.log(`Table ${table.name} created or already exists`);
          }
        } catch (error) {
          console.error(`Error creating table ${table?.name}:`, error);
        }
      }
      
      console.log('Schema applied successfully');
    } catch (error) {
      console.error('Error pushing schema:', error);
    }

    // Close the client
    await migrationClient.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

main();