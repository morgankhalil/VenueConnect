import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from "../shared/schema";

// Load environment variables
dotenv.config();

// Source database connection (current database)
const sourceConnectionString = process.env.DATABASE_URL;
// Target database connection (Supabase)
const targetConnectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!sourceConnectionString || !targetConnectionString) {
  console.error("Error: Both DATABASE_URL and SUPABASE_CONNECTION_STRING environment variables are required");
  process.exit(1);
}

// Configure source database client
const sourceClient = postgres(sourceConnectionString);
const sourceDb = drizzle(sourceClient, { schema });

// Configure target database client (Supabase)
const targetClient = postgres(targetConnectionString, {
  ssl: 'require',
});
const targetDb = drizzle(targetClient, { schema });

// Helper function to run migration for a table
async function migrateTable(tableName: string, tableSchema: any) {
  console.log(`Migrating ${tableName}...`);
  try {
    // Fetch all data from source table
    const data = await sourceDb.select().from(tableSchema);
    console.log(`  - Found ${data.length} records`);
    
    if (data.length === 0) {
      console.log(`  - No data to migrate for ${tableName}`);
      return;
    }
    
    // Insert data into target table
    await targetDb.insert(tableSchema).values(data).onConflictDoNothing();
    console.log(`  - Successfully migrated ${data.length} records`);
  } catch (error) {
    console.error(`  - Error migrating ${tableName}:`, error);
  }
}

async function main() {
  try {
    console.log("Starting data migration to Supabase...");
    
    // Migrate users table first (as other tables depend on it)
    await migrateTable("users", schema.users);
    
    // Migrate genres table before artists and venues
    await migrateTable("genres", schema.genres);
    
    // Migrate artists
    await migrateTable("artists", schema.artists);
    
    // Migrate venues
    await migrateTable("venues", schema.venues);
    
    // Migrate junction tables
    await migrateTable("artistGenres", schema.artistGenres);
    await migrateTable("venueGenres", schema.venueGenres);
    
    // Migrate events
    await migrateTable("events", schema.events);
    
    // Migrate venueNetwork
    await migrateTable("venueNetwork", schema.venueNetwork);
    
    // Migrate predictions
    await migrateTable("predictions", schema.predictions);
    
    // Migrate inquiries
    await migrateTable("inquiries", schema.inquiries);
    
    // Migrate collaborativeOpportunities
    await migrateTable("collaborativeOpportunities", schema.collaborativeOpportunities);
    
    // Migrate collaborativeParticipants
    await migrateTable("collaborativeParticipants", schema.collaborativeParticipants);
    
    // Migrate messages
    await migrateTable("messages", schema.messages);
    
    // Migrate webhookConfigurations
    await migrateTable("webhookConfigurations", schema.webhookConfigurations);
    
    console.log("Data migration to Supabase completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    // Close database connections
    await sourceClient.end();
    await targetClient.end();
  }
}

main();