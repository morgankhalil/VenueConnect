
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";

// Use DATABASE_URL for now, we'll address Supabase connection separately
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Standard postgres-js client
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Log connection status
console.log("Database connection initialized");
