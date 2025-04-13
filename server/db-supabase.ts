import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema";

// Enable connection pooling for improved performance
neonConfig.fetchConnectionCache = true;

// Function to initialize Supabase connection
export function initSupabaseConnection() {
  // Get Supabase connection string
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error("SUPABASE_CONNECTION_STRING environment variable is required");
  }
  
  try {
    // Create Neon HTTP client with Supabase connection string
    // This uses Neon's HTTP proxy to overcome network restrictions
    const sql = neon(connectionString);
    
    // Initialize Drizzle ORM with the Neon client
    const db = drizzle(sql, { schema });
    
    console.log("Supabase connection initialized via Neon serverless client");
    return db;
  } catch (error) {
    console.error("Failed to initialize Supabase connection:", error);
    throw error;
  }
}

// Try to create a connection and return it if successful
let supabaseDb: ReturnType<typeof initSupabaseConnection> | null = null;
try {
  supabaseDb = initSupabaseConnection();
} catch (error) {
  console.error("Could not establish Supabase connection:", error);
  console.log("Falling back to default database");
}

export { supabaseDb };