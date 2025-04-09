import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Use neon HTTP client for more reliable connections
const sql = neon(process.env.DATABASE_URL);

// Create drizzle instance with the newer HTTP client
export const db = drizzle(sql, { schema });

// Log connection status
console.log("Database connection initialized");
