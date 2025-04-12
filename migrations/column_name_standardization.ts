import { db } from '../server/db';

/**
 * This migration standardizes column names across tables to consistently use camelCase 
 * This fixes the inconsistency between snake_case column names in the database and camelCase in the Drizzle schema
 */
async function main() {
  console.log('Starting column name standardization migration...');

  try {
    // We'll need to check if columns exist before renaming them
    // Let's do this by querying the information_schema 
    
    // Function to safely rename columns with checks
    const safeRenameColumn = async (tableName: string, oldName: string, newName: string) => {
      try {
        // Check if the column exists first
        const checkResult = await db.execute(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = '${oldName}';
        `);
        
        if (checkResult.rowCount > 0) {
          console.log(`Renaming column ${oldName} to ${newName} in ${tableName}`);
          await db.execute(`ALTER TABLE ${tableName} RENAME COLUMN "${oldName}" TO "${newName}";`);
          return true;
        } else {
          console.log(`Column ${oldName} doesn't exist in ${tableName}, skipping...`);
          return false;
        }
      } catch (error) {
        console.error(`Error renaming column ${oldName} to ${newName} in table ${tableName}:`, error);
        return false;
      }
    };

    // Venues table
    console.log('Updating venues table columns...');
    await safeRenameColumn('venues', 'primary_genre', 'primaryGenre');
    await safeRenameColumn('venues', 'capacity_standing', 'capacityStanding');
    await safeRenameColumn('venues', 'capacity_seated', 'capacitySeated');
    
    // Events table
    console.log('Updating events table columns...');
    await safeRenameColumn('events', 'artist_id', 'artistId');
    await safeRenameColumn('events', 'venue_id', 'venueId');
    
    // Predictions table
    console.log('Updating predictions table columns...');
    await safeRenameColumn('predictions', 'artist_id', 'artistId');
    await safeRenameColumn('predictions', 'venue_id', 'venueId');
    await safeRenameColumn('predictions', 'suggested_date', 'suggestedDate');
    await safeRenameColumn('predictions', 'confidence_score', 'confidenceScore');
    await safeRenameColumn('predictions', 'gap_before_event_id', 'gapBeforeEventId');
    await safeRenameColumn('predictions', 'gap_after_event_id', 'gapAfterEventId');

    try {
      // Rename columns in the inquiries table
      console.log('Updating inquiries table columns...');
      await db.execute(`
        ALTER TABLE inquiries 
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS artist_id TO "artistId",
        RENAME COLUMN IF EXISTS proposed_date TO "proposedDate";
      `);
      console.log('Inquiries table updated successfully.');
    } catch (error) {
      console.error('Error updating inquiries table:', error);
    }

    try {
      // Rename columns in the collaborative_opportunities table
      console.log('Updating collaborative_opportunities table columns...');
      await db.execute(`
        ALTER TABLE collaborative_opportunities 
        RENAME COLUMN IF EXISTS artist_id TO "artistId",
        RENAME COLUMN IF EXISTS creator_venue_id TO "creatorVenueId",
        RENAME COLUMN IF EXISTS date_range_start TO "dateRangeStart",
        RENAME COLUMN IF EXISTS date_range_end TO "dateRangeEnd";
      `);
      console.log('Collaborative opportunities table updated successfully.');
    } catch (error) {
      console.error('Error updating collaborative_opportunities table:', error);
    }

    try {
      // Rename columns in the collaborative_participants table
      console.log('Updating collaborative_participants table columns...');
      await db.execute(`
        ALTER TABLE collaborative_participants 
        RENAME COLUMN IF EXISTS opportunity_id TO "opportunityId",
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS proposed_date TO "proposedDate";
      `);
      console.log('Collaborative participants table updated successfully.');
    } catch (error) {
      console.error('Error updating collaborative_participants table:', error);
    }

    try {
      // Rename columns in the webhook_configurations table
      console.log('Updating webhook_configurations table columns...');
      await db.execute(`
        ALTER TABLE webhook_configurations 
        RENAME COLUMN IF EXISTS callback_url TO "callbackUrl",
        RENAME COLUMN IF EXISTS secret_key TO "secretKey",
        RENAME COLUMN IF EXISTS config_options TO "configOptions",
        RENAME COLUMN IF EXISTS last_executed TO "lastExecuted";
      `);
      console.log('Webhook configurations table updated successfully.');
    } catch (error) {
      console.error('Error updating webhook_configurations table:', error);
    }

    try {
      // Rename columns in the tour_routes table
      console.log('Updating tour_routes table columns...');
      await db.execute(`
        ALTER TABLE tour_routes 
        RENAME COLUMN IF EXISTS tour_id TO "tourId",
        RENAME COLUMN IF EXISTS start_venue_id TO "startVenueId",
        RENAME COLUMN IF EXISTS end_venue_id TO "endVenueId",
        RENAME COLUMN IF EXISTS distance_km TO "distanceKm",
        RENAME COLUMN IF EXISTS estimated_travel_time_minutes TO "estimatedTravelTimeMinutes",
        RENAME COLUMN IF EXISTS optimization_score TO "optimizationScore";
      `);
      console.log('Tour routes table updated successfully.');
    } catch (error) {
      console.error('Error updating tour_routes table:', error);
    }

    try {
      // Rename columns in the tours table
      console.log('Updating tours table columns...');
      await db.execute(`
        ALTER TABLE tours 
        RENAME COLUMN IF EXISTS artist_id TO "artistId",
        RENAME COLUMN IF EXISTS start_date TO "startDate",
        RENAME COLUMN IF EXISTS end_date TO "endDate",
        RENAME COLUMN IF EXISTS total_budget TO "totalBudget",
        RENAME COLUMN IF EXISTS estimated_travel_distance TO "estimatedTravelDistance",
        RENAME COLUMN IF EXISTS estimated_travel_time_minutes TO "estimatedTravelTimeMinutes",
        RENAME COLUMN IF EXISTS initial_optimization_score TO "initialOptimizationScore",
        RENAME COLUMN IF EXISTS initial_total_distance TO "initialTotalDistance",
        RENAME COLUMN IF EXISTS initial_travel_time_minutes TO "initialTravelTimeMinutes",
        RENAME COLUMN IF EXISTS optimization_score TO "optimizationScore";
      `);
      console.log('Tours table updated successfully.');
    } catch (error) {
      console.error('Error updating tours table:', error);
    }

    try {
      // Rename columns in the tour_venues table
      console.log('Updating tour_venues table columns...');
      await db.execute(`
        ALTER TABLE tour_venues 
        RENAME COLUMN IF EXISTS tour_id TO "tourId",
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS travel_distance_from_previous TO "travelDistanceFromPrevious",
        RENAME COLUMN IF EXISTS travel_time_from_previous TO "travelTimeFromPrevious",
        RENAME COLUMN IF EXISTS status_updated_at TO "statusUpdatedAt";
      `);
      console.log('Tour venues table updated successfully.');
    } catch (error) {
      console.error('Error updating tour_venues table:', error);
    }

    try {
      // Rename columns in the tour_gaps table
      console.log('Updating tour_gaps table columns...');
      await db.execute(`
        ALTER TABLE tour_gaps 
        RENAME COLUMN IF EXISTS tour_id TO "tourId",
        RENAME COLUMN IF EXISTS start_date TO "startDate",
        RENAME COLUMN IF EXISTS end_date TO "endDate",
        RENAME COLUMN IF EXISTS previous_venue_id TO "previousVenueId",
        RENAME COLUMN IF EXISTS next_venue_id TO "nextVenueId",
        RENAME COLUMN IF EXISTS location_latitude TO "locationLatitude",
        RENAME COLUMN IF EXISTS location_longitude TO "locationLongitude",
        RENAME COLUMN IF EXISTS max_travel_distance TO "maxTravelDistance";
      `);
      console.log('Tour gaps table updated successfully.');
    } catch (error) {
      console.error('Error updating tour_gaps table:', error);
    }

    try {
      // Rename columns in the tour_gap_suggestions table
      console.log('Updating tour_gap_suggestions table columns...');
      await db.execute(`
        ALTER TABLE tour_gap_suggestions 
        RENAME COLUMN IF EXISTS gap_id TO "gapId",
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS suggested_date TO "suggestedDate",
        RENAME COLUMN IF EXISTS match_score TO "matchScore",
        RENAME COLUMN IF EXISTS travel_distance_from_previous TO "travelDistanceFromPrevious",
        RENAME COLUMN IF EXISTS travel_distance_to_next TO "travelDistanceToNext";
      `);
      console.log('Tour gap suggestions table updated successfully.');
    } catch (error) {
      console.error('Error updating tour_gap_suggestions table:', error);
    }

    try {
      // Rename columns in the artist_tour_preferences table
      console.log('Updating artist_tour_preferences table columns...');
      await db.execute(`
        ALTER TABLE artist_tour_preferences 
        RENAME COLUMN IF EXISTS artist_id TO "artistId",
        RENAME COLUMN IF EXISTS preferred_regions TO "preferredRegions",
        RENAME COLUMN IF EXISTS preferred_venue_types TO "preferredVenueTypes",
        RENAME COLUMN IF EXISTS preferred_venue_capacity TO "preferredVenueCapacity",
        RENAME COLUMN IF EXISTS max_travel_distance_per_day TO "maxTravelDistancePerDay",
        RENAME COLUMN IF EXISTS min_days_between_shows TO "minDaysBetweenShows",
        RENAME COLUMN IF EXISTS max_days_between_shows TO "maxDaysBetweenShows",
        RENAME COLUMN IF EXISTS avoid_dates TO "avoidDates",
        RENAME COLUMN IF EXISTS required_day_off TO "requiredDayOff";
      `);
      console.log('Artist tour preferences table updated successfully.');
    } catch (error) {
      console.error('Error updating artist_tour_preferences table:', error);
    }

    try {
      // Rename columns in the venue_tour_preferences table
      console.log('Updating venue_tour_preferences table columns...');
      await db.execute(`
        ALTER TABLE venue_tour_preferences 
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS preferred_genres TO "preferredGenres",
        RENAME COLUMN IF EXISTS available_dates TO "availableDates",
        RENAME COLUMN IF EXISTS minimum_artist_popularity TO "minimumArtistPopularity",
        RENAME COLUMN IF EXISTS preferred_notice_time_days TO "preferredNoticeTimeDays",
        RENAME COLUMN IF EXISTS open_to_collaboration TO "openToCollaboration",
        RENAME COLUMN IF EXISTS participation_radius TO "participationRadius";
      `);
      console.log('Venue tour preferences table updated successfully.');
    } catch (error) {
      console.error('Error updating venue_tour_preferences table:', error);
    }
    
    try {
      // Rename columns in the venue_network table
      console.log('Updating venue_network table columns...');
      await db.execute(`
        ALTER TABLE venue_network 
        RENAME COLUMN IF EXISTS venue_id TO "venueId",
        RENAME COLUMN IF EXISTS connected_venue_id TO "connectedVenueId",
        RENAME COLUMN IF EXISTS connection_strength TO "connectionStrength";
      `);
      console.log('Venue network table updated successfully.');
    } catch (error) {
      console.error('Error updating venue_network table:', error);
    }

    console.log('Column name standardization migration completed successfully!');
  } catch (error) {
    console.error('Error during column name standardization migration:', error);
    throw error;
  }
}

// Execute the migration
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });