
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";

// This file handles database connections with fallback options

// Use the local Replit PostgreSQL database
// The DATABASE_URL is automatically provided by Replit
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Setup client with connection string
const client = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20, // How long a connection can be idle before being closed
  onnotice: () => {}, // Suppress notice logs
  connect_timeout: 10, // Increase connection timeout for slower networks
});

// Initialize Drizzle ORM with the client
const db = drizzle(client, { schema });

// Log success
console.log("Database connection initialized");

// Store Supabase connection string for future migration
export const supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;

// Export the database instance
export { db };
