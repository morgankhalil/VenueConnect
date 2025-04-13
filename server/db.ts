
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";

// Use Supabase connection string if available, otherwise fall back to DATABASE_URL
const connectionString = process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Database connection string is required (SUPABASE_CONNECTION_STRING or DATABASE_URL)");
}

// Create postgres client with Supabase connection
const client = postgres(connectionString, {
  ssl: 'require', // Supabase requires SSL
  max: 10, // Set the maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout after 10 seconds
});

export const db = drizzle(client, { schema });

// Log connection status
console.log("Database connection initialized");
