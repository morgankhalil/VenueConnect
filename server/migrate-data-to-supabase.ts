import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import fs from 'fs';
import path from 'path';

/**
 * Migrates data from local PostgreSQL to Supabase
 * This script:
 * 1. Exports data from the local database
 * 2. Imports it into Supabase
 * 3. Verifies the migration was successful
 */
async function main() {
  const localConnectionString = process.env.DATABASE_URL;
  const supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;

  if (!localConnectionString) {
    console.error("Local DATABASE_URL environment variable is required");
    process.exit(1);
  }

  if (!supabaseConnectionString) {
    console.error("SUPABASE_CONNECTION_STRING is required for migration");
    process.exit(1);
  }

  console.log('Starting data migration to Supabase...');

  try {
    // Connect to the local database
    const localClient = postgres(localConnectionString, { 
      max: 1,
      prepare: false,
    });
    
    // Initialize Drizzle with the client
    const localDb = drizzle(localClient, { schema });

    // Connect to Supabase
    console.log('Connecting to Supabase...');
    const supabaseClient = postgres(supabaseConnectionString, {
      max: 1,
      prepare: false,
    });
    
    // Initialize Drizzle with Supabase client
    const supabaseDb = drizzle(supabaseClient, { schema });

    // Define the order of tables for migration (considering foreign key constraints)
    const tableOrder = [
      'genres',
      'artists',
      'venues',
      'tours',
      'events',
      'tourVenues'
    ];

    // Execute migration for each table
    for (const tableName of tableOrder) {
      try {
        console.log(`Migrating ${tableName}...`);
        
        // Fetch data from local database
        const data = await localClient`SELECT * FROM "${tableName}"`;
        console.log(`Found ${data.length} records in ${tableName}`);

        if (data.length === 0) {
          console.log(`Skipping empty table: ${tableName}`);
          continue;
        }

        // Create data insert script for Supabase
        // We'll use a transaction to ensure data integrity
        let insertScript = `BEGIN;\n`;
        
        // Clear existing data to avoid conflicts
        insertScript += `DELETE FROM "${tableName}";\n`;
        
        // Reset sequence if table has an ID sequence
        insertScript += `ALTER SEQUENCE IF EXISTS ${tableName}_id_seq RESTART WITH ${data.length + 1};\n`;
        
        // Add insert statements
        for (const row of data) {
          // Extract columns and values
          const columns = Object.keys(row).filter(key => key !== 'id');
          const values = columns.map(col => {
            const value = row[col];
            
            // Handle different data types
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'object') {
              if (Array.isArray(value)) {
                // Handle array values
                return `ARRAY[${value.map(v => 
                  typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
                ).join(', ')}]`;
              }
              // Handle JSON objects
              return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            }
            return value;
          });
          
          // Add ID explicitly to maintain referential integrity
          columns.unshift('id');
          values.unshift(row.id);
          
          insertScript += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        // Commit transaction
        insertScript += `COMMIT;\n`;
        
        // Save the insert script
        const scriptPath = path.join(process.cwd(), 'supabase-migration', `${tableName}_insert.sql`);
        fs.writeFileSync(scriptPath, insertScript);
        console.log(`Insert script saved to ${scriptPath}`);
        
        // Execute the insert script on Supabase
        console.log(`Executing insert script for ${tableName} on Supabase...`);
        await supabaseClient.unsafe(insertScript);
        
        // Verify the data was inserted correctly
        const verifyCount = await supabaseClient`SELECT COUNT(*) as count FROM "${tableName}"`;
        console.log(`Verified ${verifyCount[0].count} records in Supabase ${tableName}`);
        
        if (Number(verifyCount[0].count) !== data.length) {
          console.warn(`Warning: Record count mismatch for ${tableName}. Expected ${data.length}, got ${verifyCount[0].count}`);
        } else {
          console.log(`✓ Migration successful for ${tableName}`);
        }
      } catch (error) {
        console.error(`Error migrating ${tableName}:`, error);
      }
    }

    // Close connections
    await localClient.end();
    await supabaseClient.end();
    console.log('Database connections closed');

    console.log('Data migration to Supabase complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Only run this script explicitly - it's not for automatic execution
if (require.main === module) {
  main();
}