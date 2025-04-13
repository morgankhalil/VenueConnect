import { drizzle } from 'drizzle-orm/postgres-js';
import { neon, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

// Check that environment variables are set
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required for the source database");
  process.exit(1);
}

if (!process.env.SUPABASE_CONNECTION_STRING) {
  console.error("Error: SUPABASE_CONNECTION_STRING environment variable is required for the target database");
  process.exit(1);
}

// Source database connection
const sourceClient = postgres(process.env.DATABASE_URL);
const sourceDb = drizzle(sourceClient, { schema });

// Target database connection using Neon serverless client
const targetSql = neon(process.env.SUPABASE_CONNECTION_STRING);
const targetDb = drizzle(targetSql, { schema });

// Main migration function
async function migrateDataToSupabase() {
  console.log("Starting data migration to Supabase...");
  
  try {
    // Get table names from schema
    const tableNames = Object.keys(schema)
      .filter(key => 
        typeof schema[key as keyof typeof schema] === 'object' && 
        'name' in (schema[key as keyof typeof schema] as any) &&
        !key.endsWith('Relations')
      );
    
    // Migrate each table
    for (const tableName of tableNames) {
      const table = schema[tableName as keyof typeof schema] as any;
      if (!table || !table.name) continue;
      
      console.log(`Migrating table: ${table.name}`);
      
      try {
        // Get data from source
        const sourceData = await sourceDb.select().from(table);
        console.log(`  Found ${sourceData.length} records`);
        
        if (sourceData.length === 0) {
          console.log(`  No data to migrate for ${table.name}`);
          continue;
        }
        
        // Insert data into target
        // Process in batches to avoid memory issues with large datasets
        const batchSize = 100;
        for (let i = 0; i < sourceData.length; i += batchSize) {
          const batch = sourceData.slice(i, i + batchSize);
          await targetDb.insert(table).values(batch).onConflictDoNothing();
          console.log(`  Migrated batch ${i / batchSize + 1} of ${Math.ceil(sourceData.length / batchSize)}`);
        }
        
        console.log(`  Completed migration for ${table.name}`);
      } catch (error) {
        console.error(`  Error migrating table ${table.name}:`, error);
      }
    }
    
    console.log("Data migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    // Close connections
    await sourceClient.end();
    console.log("Database connections closed");
  }
}

// Execute the migration
migrateDataToSupabase();