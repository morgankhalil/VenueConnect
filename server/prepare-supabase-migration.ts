import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import fs from 'fs';
import path from 'path';

/**
 * Prepares for migration to Supabase by extracting schema and data
 * This script:
 * 1. Extracts the current database schema 
 * 2. Creates SQL for Supabase setup
 * 3. Will eventually handle data migration as well
 */
async function main() {
  const localConnectionString = process.env.DATABASE_URL;
  const supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;

  if (!localConnectionString) {
    console.error("Local DATABASE_URL environment variable is required");
    process.exit(1);
  }

  if (!supabaseConnectionString) {
    console.log("SUPABASE_CONNECTION_STRING not found. Only schema extraction will be performed.");
    console.log("Add SUPABASE_CONNECTION_STRING to your environment to enable data migration.");
  }

  console.log('Preparing for Supabase migration...');

  try {
    // Connect to the local database
    const client = postgres(localConnectionString, { 
      max: 1,
      prepare: false,
    });
    
    // Initialize Drizzle with the client
    const db = drizzle(client, { schema });

    // Get all table names from schema
    const tables = [];
    if (schema.venues) tables.push('venues');
    if (schema.events) tables.push('events');
    if (schema.tours) tables.push('tours');
    if (schema.tourVenues) tables.push('tourVenues');
    if (schema.artists) tables.push('artists');
    if (schema.genres) tables.push('genres');

    console.log(`Found ${tables.length} tables in schema: ${tables.join(', ')}`);

    // Generate schema SQL
    let schemaSQL = '';
    for (const tableName of tables) {
      try {
        const tableDefinition = await client`
          SELECT column_name, data_type, character_maximum_length, 
                 column_default, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position;
        `;

        if (tableDefinition.length > 0) {
          schemaSQL += `-- Table: ${tableName}\n`;
          schemaSQL += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
          
          const columns = tableDefinition.map(column => {
            let colDef = `  "${column.column_name}" ${column.data_type}`;
            
            if (column.character_maximum_length) {
              colDef += `(${column.character_maximum_length})`;
            }
            
            if (column.column_default) {
              colDef += ` DEFAULT ${column.column_default}`;
            }
            
            if (column.is_nullable === 'NO') {
              colDef += ' NOT NULL';
            }
            
            return colDef;
          });
          
          // Add primary key for id column if it exists
          const hasIdColumn = tableDefinition.some(col => col.column_name === 'id');
          if (hasIdColumn) {
            columns.push(`  PRIMARY KEY ("id")`);
          }
          
          schemaSQL += columns.join(',\n');
          schemaSQL += '\n);\n\n';
        }
      } catch (error) {
        console.error(`Error getting schema for table ${tableName}:`, error);
      }
    }

    // Save the schema to a file
    const schemaPath = path.join(process.cwd(), 'supabase-migration', 'schema.sql');
    fs.writeFileSync(schemaPath, schemaSQL);
    console.log(`Schema SQL saved to ${schemaPath}`);

    // Close the client
    await client.end();
    console.log('Local database connection closed');

    // Data migration would be implemented here when SUPABASE_CONNECTION_STRING is available
    if (supabaseConnectionString) {
      console.log('Supabase connection string found. Data migration functionality will be implemented in the future.');
      // TODO: Implement data migration 
    }

    console.log('Supabase migration preparation complete!');
  } catch (error) {
    console.error('Migration preparation failed:', error);
    process.exit(1);
  }
}

main();