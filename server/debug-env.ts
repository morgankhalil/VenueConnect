// Debug script to check environment variables
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables check:');
console.log('-------------------------');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('SUPABASE_CONNECTION_STRING:', process.env.SUPABASE_CONNECTION_STRING);
console.log('-------------------------');

// Check env configuration
const envConfigured = process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING;
if (!envConfigured) {
  console.log('WARNING: No database connection strings found in environment variables!');
} else {
  console.log('Database connection string is available.');
}

// Print process info
console.log('Process info:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());