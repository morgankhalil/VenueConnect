# Supabase Migration Guide

This folder contains migration scripts and guidance for transitioning your project from the local Replit PostgreSQL database to Supabase.

## Overview

Due to connectivity limitations in the Replit environment, we've temporarily set up a local PostgreSQL database. This document outlines how to migrate to Supabase when connectivity becomes available.

## Pre-migration Steps

1. Ensure you have the Supabase connection string ready
2. Make sure your Supabase project is created and configured
3. Have administrative access to your Supabase project

## Migration Process

### Step 1: Export Schema

The `schema.sql` file in this directory contains the database schema definition. You can use this to recreate your tables in Supabase.

To apply this schema to your Supabase project:

```bash
# Option 1: Using the Supabase UI
# - Navigate to your Supabase project's SQL Editor
# - Copy and paste the contents of schema.sql
# - Execute the SQL

# Option 2: Using the Supabase CLI
supabase db push --db-url <YOUR_SUPABASE_CONNECTION_STRING>
```

### Step 2: Update Connection String

Once your Supabase project is ready, update the `SUPABASE_CONNECTION_STRING` environment variable in your Replit project.

### Step 3: Run Migration Script

Use the migration script to transfer data from your local database to Supabase:

```bash
npx tsx server/prepare-supabase-migration.ts
```

### Step 4: Verify Migration

After migration, verify your data has been transferred correctly:

```bash
# Check venue count
curl http://localhost:5000/api/dashboard/stats | jq
```

## Troubleshooting

### Connection Issues

If you encounter connection issues with Supabase from Replit:

1. Verify your connection string format is correct
2. Check that your Supabase project allows connections from external sources
3. Consider using Supabase's REST API as an alternative

### Data Discrepancies

If your data doesn't match after migration:

1. Check for any validation or constraint errors in migration logs
2. Verify schema compatibility between source and target databases
3. Consider running a diff check to identify specific mismatches

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/migration.html)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)