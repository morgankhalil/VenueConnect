import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * This script attempts various methods to fix connection issues with Supabase
 * 1. Tries DNS lookup with different methods
 * 2. Updates hosts file if needed
 * 3. Tests connection with different parameters
 */
async function main() {
  const supabaseConnectionString = process.env.SUPABASE_CONNECTION_STRING;

  if (!supabaseConnectionString) {
    console.error("SUPABASE_CONNECTION_STRING environment variable is required");
    process.exit(1);
  }

  console.log('Starting Supabase connection troubleshooting...');

  try {
    // Parse connection string to get hostname
    let hostname = '';
    try {
      const url = new URL(supabaseConnectionString);
      hostname = url.hostname;
      console.log(`Extracted hostname: ${hostname}`);
    } catch (error) {
      console.error('Error parsing connection string:', error);
      process.exit(1);
    }

    // Attempt DNS lookups with different methods
    console.log('Attempting DNS lookups...');
    
    const execAsync = promisify(exec);
    
    try {
      console.log('Using dig...');
      const { stdout: digOutput } = await execAsync(`dig ${hostname}`);
      console.log(digOutput);
    } catch (error) {
      console.log('dig not available or failed');
    }
    
    try {
      console.log('Using nslookup...');
      const { stdout: nslookupOutput } = await execAsync(`nslookup ${hostname}`);
      console.log(nslookupOutput);
    } catch (error) {
      console.log('nslookup not available or failed');
    }
    
    try {
      console.log('Using host...');
      const { stdout: hostOutput } = await execAsync(`host ${hostname}`);
      console.log(hostOutput);
    } catch (error) {
      console.log('host not available or failed');
    }

    // Ping test
    try {
      console.log('Testing connectivity with ping...');
      const { stdout: pingOutput } = await execAsync(`ping -c 3 ${hostname}`);
      console.log(pingOutput);
    } catch (error) {
      console.log('Ping failed or not available');
    }

    // Try connecting with different timeouts
    console.log('Attempting Postgres connection with increased timeout...');
    try {
      const client = postgres(supabaseConnectionString, {
        max: 1,
        idle_timeout: 10,
        connect_timeout: 30, // 30 seconds timeout
        ssl: { rejectUnauthorized: false }
      });
      
      console.log('Testing connection...');
      await client`SELECT 1`;
      console.log('Connection successful!');
      
      await client.end();
    } catch (error) {
      console.error('Connection test failed:', error);
    }

    console.log('Connection troubleshooting complete.');
  } catch (error) {
    console.error('Troubleshooting failed:', error);
    process.exit(1);
  }
}

main();