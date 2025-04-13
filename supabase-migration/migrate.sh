#!/bin/bash
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
