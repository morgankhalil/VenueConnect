/**
 * Run the genre tables standardization migration
 */

// Directly import the file containing the migration code
import * as migrations from './standardize-genre-tables';

// Run the migration
async function main() {
  try {
    console.log("Running genre tables standardization migration...");
    // Execute the main function from the migration script
    if (typeof migrations.main === 'function') {
      await migrations.main();
    } else {
      throw new Error("Migration main function not found");
    }
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