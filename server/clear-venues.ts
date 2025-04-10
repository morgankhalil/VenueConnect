import { db } from "./db";
import { venues, tourVenues, events } from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Clear all venues from the database
 * This is a maintenance script to be used before re-seeding venues
 * CAUTION: This will delete all venue-related data!
 */
async function clearVenues() {
  console.log("Starting venue data cleanup...");

  try {
    // First, delete any records that reference venues
    console.log("Deleting tour_venues records that reference venues...");
    await db.delete(tourVenues).execute();
    
    console.log("Deleting events that reference venues...");
    await db.delete(events).execute();
    
    // Now delete the venues themselves
    console.log("Deleting all venue records...");
    await db.delete(venues).execute();
    
    // Verify that all venues are deleted
    const remainingVenues = await db.select({ count: sql`count(*)` }).from(venues);
    console.log(`Remaining venues after deletion: ${remainingVenues[0].count}`);
    
    console.log("All venue data successfully cleared from the database.");
  } catch (error) {
    console.error("Error during venue cleanup:", error);
    throw error;
  }
}

// Execute the function
clearVenues()
  .catch(error => {
    console.error("Failed to clear venues:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Venue cleanup process completed");
    process.exit(0);
  });