import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase connection string
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error("Error: SUPABASE_CONNECTION_STRING environment variable is required");
  process.exit(1);
}

console.log("Checking Supabase connection string format...");

// Mask password for security while still showing structure
function maskConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr);
    const maskedPassword = url.password ? '*'.repeat(url.password.length) : '';
    
    // Rebuild connection string with masked password
    return `${url.protocol}//${url.username}:${maskedPassword}@${url.hostname}:${url.port}${url.pathname}${url.search}`;
  } catch (error) {
    return "Invalid URL format";
  }
}

// Check connection string format
console.log("Masked connection string:", maskConnectionString(connectionString));

// Validate PostgreSQL connection string format
const postgresRegex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
if (postgresRegex.test(connectionString)) {
  console.log("✓ Connection string format is valid");
} else {
  console.log("⚠ Connection string format does not match expected pattern");
  console.log("Expected format: postgresql://username:password@hostname:port/database");
}

// Extract and check components
try {
  const url = new URL(connectionString);
  
  console.log("\nConnection String Components:");
  console.log("----------------------------");
  console.log(`Protocol: ${url.protocol}`);
  console.log(`Username: ${url.username}`);
  console.log(`Password: ${url.password ? "[Set]" : "[Not Set]"}`);
  console.log(`Hostname: ${url.hostname}`);
  console.log(`Port:     ${url.port || "Not specified (default: 5432)"}`);
  console.log(`Database: ${url.pathname.replace(/^\//, '')}`);
  
  // Check for common issues
  if (url.protocol !== "postgresql:") {
    console.log("\n⚠ Protocol should be 'postgresql:'");
  }
  
  if (!url.hostname || url.hostname === "localhost") {
    console.log("\n⚠ Hostname might not be accessible from Replit");
  }
  
  if (!url.port) {
    console.log("\n⚠ Port is not specified, using default (5432)");
  }
  
  if (!url.pathname || url.pathname === "/") {
    console.log("\n⚠ Database name is not specified");
  }
  
  // Try to resolve the hostname
  console.log("\nTrying to resolve hostname...");
  const dns = require('dns');
  dns.lookup(url.hostname, (err: any, address: string) => {
    if (err) {
      console.log(`✗ Could not resolve hostname: ${err.message}`);
      console.log("  This might be due to network restrictions in Replit or an incorrect hostname");
    } else {
      console.log(`✓ Hostname resolved to IP: ${address}`);
    }
  });
  
} catch (error) {
  console.error("\nError parsing connection string:", error);
}