import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase connection string
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Error: SUPABASE_CONNECTION_STRING environment variable is required");
  process.exit(1);
}

console.log("Testing Supabase connection...");
console.log("Connection string format check:", 
  connectionString.startsWith("postgresql://") ? "Valid format" : "Invalid format");

// Extract hostname for info
try {
  const url = new URL(connectionString);
  console.log("Hostname:", url.hostname);
  console.log("Port:", url.port);
  console.log("Username:", url.username);
  console.log("Database:", url.pathname.replace(/^\//, ''));
} catch (error) {
  console.error("Error parsing connection string:", error);
}

// Try alternative approach using postgres-js
const pgClient = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  debug: true,
  idle_timeout: 2
});

async function testConnection() {
  try {
    // Simple test query
    console.log("Executing test query...");
    const result = await pgClient`SELECT version()`;
    console.log("Connection successful!");
    console.log("Result:", result);
  } catch (error) {
    console.error("Connection failed:");
    console.error(error);
  } finally {
    // Close the connection
    await pgClient.end();
  }
}

testConnection();