import { neon, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

// Get Supabase connection string
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Error: SUPABASE_CONNECTION_STRING environment variable is required");
  process.exit(1);
}

console.log("Testing Supabase connection via Neon serverless client...");

// Create Neon HTTP client
const sql = neon(connectionString);

async function testConnection() {
  try {
    // Simple test query
    console.log("Executing test query...");
    const result = await sql`SELECT current_database(), current_user, version()`;
    console.log("Connection successful!");
    console.log("Database:", result[0].current_database);
    console.log("User:", result[0].current_user);
    console.log("Version:", result[0].version);
    return true;
  } catch (error) {
    console.error("Connection failed:");
    console.error(error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log("\nThe Neon serverless client successfully connected to your Supabase database!");
    console.log("You can use this approach to connect to your Supabase database from Replit.");
  } else {
    console.log("\nConnection failed with the Neon serverless client.");
    console.log("This may be due to one of the following reasons:");
    console.log("1. Network restrictions in the Replit environment");
    console.log("2. Invalid connection string");
    console.log("3. Supabase database is not accessible from this location");
  }
});