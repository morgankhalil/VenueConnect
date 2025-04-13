import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Function to generate schema SQL
function generateSchemaSql() {
  // Convert schema to SQL
  let sql = '-- Supabase Migration Schema\n';
  sql += '-- Generated on ' + new Date().toISOString() + '\n\n';
  
  // Add enums
  sql += '-- Create Enums\n';
  const enums = [
    { name: 'user_role', values: ['admin', 'venue_manager', 'artist_manager', 'booking_agent', 'staff', 'user'] },
    { name: 'genre', values: [
      'rock', 'indie', 'hip_hop', 'electronic', 'pop', 'folk', 'metal', 'jazz', 'blues', 
      'world', 'classical', 'country', 'punk', 'experimental', 'alternative', 'rnb', 'soul',
      'reggae', 'ambient', 'techno', 'house', 'disco', 'funk', 'other'
    ]},
    { name: 'marketCategory', values: ['primary', 'secondary', 'tertiary'] },
    { name: 'venueType', values: [
      'club', 'bar', 'theater', 'coffeehouse', 'diy_space', 'art_gallery', 
      'college_venue', 'community_center', 'record_store'
    ]},
    { name: 'capacityCategory', values: ['tiny', 'small', 'medium', 'large'] },
  ];
  
  enums.forEach(enumDef => {
    sql += `CREATE TYPE ${enumDef.name} AS ENUM (${enumDef.values.map(v => `'${v}'`).join(', ')});\n`;
  });
  sql += '\n';
  
  // Helper function to extract table creation SQL from schema
  const tableNames = Object.keys(schema)
    .filter(key => 
      typeof schema[key as keyof typeof schema] === 'object' && 
      'name' in (schema[key as keyof typeof schema] as any)
    );
  
  // Add simple table creation statements (this is a simplified version)
  sql += '-- Create Tables (simplified version, will need to be completed manually)\n';
  tableNames.forEach(tableName => {
    if (tableName.endsWith('Relations')) return;
    
    const table = schema[tableName as keyof typeof schema] as any;
    if (!table || !table.name) return;
    
    sql += `-- Table: ${table.name}\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
    
    // Get columns from schema (simplified)
    sql += '  -- Add columns based on the schema definition\n';
    sql += '  -- This is a placeholder and needs to be completed manually\n';
    sql += ');\n\n';
  });
  
  return sql;
}

// Generate migration scripts
async function generateMigrationScripts() {
  try {
    console.log("Preparing Supabase migration materials...");
    
    // Create migrations directory
    const migrationDir = join(process.cwd(), 'supabase-migration');
    ensureDirectoryExists(migrationDir);
    
    // Generate schema SQL
    console.log("Generating schema SQL...");
    const schemaSql = generateSchemaSql();
    writeFileSync(join(migrationDir, 'schema.sql'), schemaSql);
    
    // Generate migration instructions
    const instructions = `
# Supabase Migration Instructions

This directory contains scripts and instructions for migrating your application to Supabase.

## Prerequisites

1. A Supabase project with a PostgreSQL database
2. The Supabase connection string in the following format:
   \`postgresql://postgres:password@db.projectid.supabase.co:5432/postgres\`

## Migration Steps

1. Set the SUPABASE_CONNECTION_STRING environment variable:
   \`\`\`
   export SUPABASE_CONNECTION_STRING=postgresql://postgres:password@db.projectid.supabase.co:5432/postgres
   \`\`\`

2. Run the schema migration:
   \`\`\`
   psql "$SUPABASE_CONNECTION_STRING" -f schema.sql
   \`\`\`

3. Run the data migration script from the application:
   \`\`\`
   npx tsx ../server/migrate-data-to-supabase.ts
   \`\`\`

4. Update the application's .env file or environment variables to use SUPABASE_CONNECTION_STRING

## Verification

After migration, verify that:
1. All tables exist in Supabase
2. Data has been correctly migrated
3. The application can connect to Supabase
`;
    
    writeFileSync(join(migrationDir, 'README.md'), instructions);
    
    // Generate a shell script for migration
    const migrationScript = `#!/bin/bash
# Supabase Migration Script

if [ -z "$SUPABASE_CONNECTION_STRING" ]; then
  echo "Error: SUPABASE_CONNECTION_STRING environment variable is not set"
  echo "Please set it to your Supabase connection string"
  exit 1
fi

# Run schema migration
echo "Running schema migration..."
psql "$SUPABASE_CONNECTION_STRING" -f schema.sql

# Run data migration
echo "Running data migration..."
npx tsx ../server/migrate-data-to-supabase.ts

echo "Migration completed!"
`;
    
    writeFileSync(join(migrationDir, 'migrate.sh'), migrationScript);
    console.log("Migration scripts generated successfully!");
    console.log(`Files created in: ${migrationDir}`);
    
  } catch (error) {
    console.error("Error generating migration scripts:", error);
  }
}

// Execute the function
generateMigrationScripts();