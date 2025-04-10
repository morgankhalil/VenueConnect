import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Update genre enum to include all necessary genres
 * This migration adds new genre values to the enum type in PostgreSQL
 */
async function main() {
  console.log("Starting migration to update genre enum...");

  try {
    // Update the enum type with all needed genres
    await db.execute(sql`
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'punk';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'experimental';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'alternative';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'rnb';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'soul';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'reggae';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'ambient';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'techno';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'house';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'disco';
      ALTER TYPE genre ADD VALUE IF NOT EXISTS 'funk';
    `);

    console.log("Successfully updated genre enum with new values");
  } catch (error) {
    console.error("Error during genre enum update:", error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => {
    console.log("Migration process completed");
    process.exit(0);
  });