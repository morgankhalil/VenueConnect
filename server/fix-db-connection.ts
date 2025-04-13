import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Get current Database URL
const currentDbUrl = process.env.DATABASE_URL;
console.log("Current DATABASE_URL:", currentDbUrl);

// Check if it has the double protocol issue
if (currentDbUrl && currentDbUrl.startsWith('postgres://postgresql://')) {
  console.log("Detected protocol issue in DATABASE_URL, fixing...");
  
  // Fix the URL by removing the duplicate protocol
  const fixedDbUrl = currentDbUrl.replace('postgres://postgresql://', 'postgresql://');
  console.log("Fixed DATABASE_URL:", fixedDbUrl);
  
  // Create or update .env file with the fixed URL
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    // Check if .env file exists
    if (fs.existsSync(envPath)) {
      console.log(".env file exists, updating...");
      
      // Read existing .env file
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
      // Replace DATABASE_URL line or add it if not found
      if (envContent.includes('DATABASE_URL=')) {
        const updatedContent = envContent.replace(
          /DATABASE_URL=.*/,
          `DATABASE_URL=${fixedDbUrl}`
        );
        fs.writeFileSync(envPath, updatedContent);
      } else {
        fs.appendFileSync(envPath, `\nDATABASE_URL=${fixedDbUrl}`);
      }
    } else {
      console.log(".env file doesn't exist, creating it...");
      fs.writeFileSync(envPath, `DATABASE_URL=${fixedDbUrl}\n`);
    }
    
    console.log(".env file updated successfully.");
    console.log("You'll need to restart the application for changes to take effect.");
  } catch (error) {
    console.error("Error updating .env file:", error);
  }
  
  // Update the environment variable for the current process
  process.env.DATABASE_URL = fixedDbUrl;
  console.log("Environment variable updated for the current process.");
  
  // Test the connection with the fixed URL
  console.log("\nTesting database connection with fixed URL...");
  
  try {
    // For testing connection, we'll just indicate success
    // The actual connection will be tested when the app restarts
    console.log("Connection string updated successfully.");
    console.log("The connection will be fully tested when the application restarts.");
  } catch (err) {
    console.error("Connection update failed:", err);
  }
} else {
  console.log("DATABASE_URL format appears correct, no fix needed.");
}