
# Supabase Migration Instructions

This directory contains scripts and instructions for migrating your application to Supabase.

## Prerequisites

1. A Supabase project with a PostgreSQL database
2. The Supabase connection string in the following format:
   `postgresql://postgres:password@db.projectid.supabase.co:5432/postgres`

## Migration Steps

1. Set the SUPABASE_CONNECTION_STRING environment variable:
   ```
   export SUPABASE_CONNECTION_STRING=postgresql://postgres:password@db.projectid.supabase.co:5432/postgres
   ```

2. Run the schema migration:
   ```
   psql "$SUPABASE_CONNECTION_STRING" -f schema.sql
   ```

3. Run the data migration script from the application:
   ```
   npx tsx ../server/migrate-data-to-supabase.ts
   ```

4. Update the application's .env file or environment variables to use SUPABASE_CONNECTION_STRING

## Verification

After migration, verify that:
1. All tables exist in Supabase
2. Data has been correctly migrated
3. The application can connect to Supabase
