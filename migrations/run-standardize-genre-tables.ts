/**
 * Run the genre tables standardization migration
 */

// Import the main function from the migration script
import { main as runMigration } from './standardize-genre-tables';

// Run the migration
async function main() {
  try {
    console.log("Running genre tables standardization migration...");
    // Execute the main function from the migration script
    await runMigration();
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });