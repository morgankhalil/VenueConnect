import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Get Supabase connection string from environment variable
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Error: SUPABASE_CONNECTION_STRING environment variable is required");
  process.exit(1);
}

// Configure postgres client for Supabase
const migrationClient = postgres(connectionString, {
  ssl: 'require',
  max: 1, // Use only one connection for migrations
});

// Create a separate instance of drizzle for migrations
const db = drizzle(migrationClient);

async function main() {
  try {
    console.log("Starting migration to Supabase...");
    
    // Set DATABASE_URL temporarily to Supabase connection for drizzle-kit
    process.env.DATABASE_URL = connectionString;
    
    // Generate migrations based on schema
    console.log("Generating migration files...");
    await execAsync("npx drizzle-kit generate:pg");
    
    // Apply migrations to the database
    console.log("Applying migrations to Supabase...");
    await migrate(db, { migrationsFolder: "./migrations" });
    
    console.log("Migration to Supabase completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // Close the database connection
    await migrationClient.end();
  }
}

main();