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
    await safeRenameColumn('venues', 'market_category', 'marketCategory');
    await safeRenameColumn('venues', 'venue_type', 'venueType');
    await safeRenameColumn('venues', 'capacity_category', 'capacityCategory');
    await safeRenameColumn('venues', 'secondary_genres', 'secondaryGenres');
    await safeRenameColumn('venues', 'booking_contact_name', 'bookingContactName');
    await safeRenameColumn('venues', 'booking_email', 'bookingEmail');
    await safeRenameColumn('venues', 'contact_phone', 'contactPhone');
    await safeRenameColumn('venues', 'typical_booking_lead_time_days', 'typicalBookingLeadTimeDays');
    await safeRenameColumn('venues', 'payment_structure', 'paymentStructure');
    await safeRenameColumn('venues', 'sound_system', 'soundSystem');
    await safeRenameColumn('venues', 'local_accommodation', 'localAccommodation');
    await safeRenameColumn('venues', 'local_promotion', 'localPromotion');
    await safeRenameColumn('venues', 'age_restriction', 'ageRestriction');
    await safeRenameColumn('venues', 'website_url', 'websiteUrl');
    await safeRenameColumn('venues', 'image_url', 'imageUrl');
    await safeRenameColumn('venues', 'social_media_links', 'socialMediaLinks');
    await safeRenameColumn('venues', 'bandsintown_id', 'bandsintownId');
    await safeRenameColumn('venues', 'songkick_id', 'songkickId');
    await safeRenameColumn('venues', 'owner_id', 'ownerId');
    
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

    // Inquiries table
    console.log('Updating inquiries table columns...');
    await safeRenameColumn('inquiries', 'venue_id', 'venueId');
    await safeRenameColumn('inquiries', 'artist_id', 'artistId');
    await safeRenameColumn('inquiries', 'proposed_date', 'proposedDate');

    // Collaborative opportunities table
    console.log('Updating collaborative_opportunities table columns...');
    await safeRenameColumn('collaborative_opportunities', 'artist_id', 'artistId');
    await safeRenameColumn('collaborative_opportunities', 'creator_venue_id', 'creatorVenueId');
    await safeRenameColumn('collaborative_opportunities', 'date_range_start', 'dateRangeStart');
    await safeRenameColumn('collaborative_opportunities', 'date_range_end', 'dateRangeEnd');

    // Collaborative participants table
    console.log('Updating collaborative_participants table columns...');
    await safeRenameColumn('collaborative_participants', 'opportunity_id', 'opportunityId');
    await safeRenameColumn('collaborative_participants', 'venue_id', 'venueId');
    await safeRenameColumn('collaborative_participants', 'proposed_date', 'proposedDate');

    // Webhook configurations table
    console.log('Updating webhook_configurations table columns...');
    await safeRenameColumn('webhook_configurations', 'callback_url', 'callbackUrl');
    await safeRenameColumn('webhook_configurations', 'secret_key', 'secretKey');
    await safeRenameColumn('webhook_configurations', 'config_options', 'configOptions');
    await safeRenameColumn('webhook_configurations', 'last_executed', 'lastExecuted');

    // Tour routes table
    console.log('Updating tour_routes table columns...');
    await safeRenameColumn('tour_routes', 'tour_id', 'tourId');
    await safeRenameColumn('tour_routes', 'start_venue_id', 'startVenueId');
    await safeRenameColumn('tour_routes', 'end_venue_id', 'endVenueId');
    await safeRenameColumn('tour_routes', 'distance_km', 'distanceKm');
    await safeRenameColumn('tour_routes', 'estimated_travel_time_minutes', 'estimatedTravelTimeMinutes');
    await safeRenameColumn('tour_routes', 'optimization_score', 'optimizationScore');
    
    // Tours table
    console.log('Updating tours table columns...');
    await safeRenameColumn('tours', 'artist_id', 'artistId');
    await safeRenameColumn('tours', 'start_date', 'startDate');
    await safeRenameColumn('tours', 'end_date', 'endDate');
    await safeRenameColumn('tours', 'total_budget', 'totalBudget');
    await safeRenameColumn('tours', 'estimated_travel_distance', 'estimatedTravelDistance');
    await safeRenameColumn('tours', 'estimated_travel_time_minutes', 'estimatedTravelTimeMinutes');
    await safeRenameColumn('tours', 'initial_optimization_score', 'initialOptimizationScore');
    await safeRenameColumn('tours', 'initial_total_distance', 'initialTotalDistance');
    await safeRenameColumn('tours', 'initial_travel_time_minutes', 'initialTravelTimeMinutes');
    await safeRenameColumn('tours', 'optimization_score', 'optimizationScore');
    
    // Tour venues table
    console.log('Updating tour_venues table columns...');
    await safeRenameColumn('tour_venues', 'tour_id', 'tourId');
    await safeRenameColumn('tour_venues', 'venue_id', 'venueId');
    await safeRenameColumn('tour_venues', 'travel_distance_from_previous', 'travelDistanceFromPrevious');
    await safeRenameColumn('tour_venues', 'travel_time_from_previous', 'travelTimeFromPrevious');
    await safeRenameColumn('tour_venues', 'status_updated_at', 'statusUpdatedAt');
    
    // Tour gaps table
    console.log('Updating tour_gaps table columns...');
    await safeRenameColumn('tour_gaps', 'tour_id', 'tourId');
    await safeRenameColumn('tour_gaps', 'start_date', 'startDate');
    await safeRenameColumn('tour_gaps', 'end_date', 'endDate');
    await safeRenameColumn('tour_gaps', 'previous_venue_id', 'previousVenueId');
    await safeRenameColumn('tour_gaps', 'next_venue_id', 'nextVenueId');
    await safeRenameColumn('tour_gaps', 'location_latitude', 'locationLatitude');
    await safeRenameColumn('tour_gaps', 'location_longitude', 'locationLongitude');
    await safeRenameColumn('tour_gaps', 'max_travel_distance', 'maxTravelDistance');
    
    // Tour gap suggestions table
    console.log('Updating tour_gap_suggestions table columns...');
    await safeRenameColumn('tour_gap_suggestions', 'gap_id', 'gapId');
    await safeRenameColumn('tour_gap_suggestions', 'venue_id', 'venueId');
    await safeRenameColumn('tour_gap_suggestions', 'suggested_date', 'suggestedDate');
    await safeRenameColumn('tour_gap_suggestions', 'match_score', 'matchScore');
    await safeRenameColumn('tour_gap_suggestions', 'travel_distance_from_previous', 'travelDistanceFromPrevious');
    await safeRenameColumn('tour_gap_suggestions', 'travel_distance_to_next', 'travelDistanceToNext');
    
    // Artist tour preferences table
    console.log('Updating artist_tour_preferences table columns...');
    await safeRenameColumn('artist_tour_preferences', 'artist_id', 'artistId');
    await safeRenameColumn('artist_tour_preferences', 'preferred_regions', 'preferredRegions');
    await safeRenameColumn('artist_tour_preferences', 'preferred_venue_types', 'preferredVenueTypes');
    await safeRenameColumn('artist_tour_preferences', 'preferred_venue_capacity', 'preferredVenueCapacity');
    await safeRenameColumn('artist_tour_preferences', 'max_travel_distance_per_day', 'maxTravelDistancePerDay');
    await safeRenameColumn('artist_tour_preferences', 'min_days_between_shows', 'minDaysBetweenShows');
    await safeRenameColumn('artist_tour_preferences', 'max_days_between_shows', 'maxDaysBetweenShows');
    await safeRenameColumn('artist_tour_preferences', 'avoid_dates', 'avoidDates');
    await safeRenameColumn('artist_tour_preferences', 'required_day_off', 'requiredDayOff');
    
    // Venue tour preferences table
    console.log('Updating venue_tour_preferences table columns...');
    await safeRenameColumn('venue_tour_preferences', 'venue_id', 'venueId');
    await safeRenameColumn('venue_tour_preferences', 'preferred_genres', 'preferredGenres');
    await safeRenameColumn('venue_tour_preferences', 'available_dates', 'availableDates');
    await safeRenameColumn('venue_tour_preferences', 'minimum_artist_popularity', 'minimumArtistPopularity');
    await safeRenameColumn('venue_tour_preferences', 'preferred_notice_time_days', 'preferredNoticeTimeDays');
    await safeRenameColumn('venue_tour_preferences', 'open_to_collaboration', 'openToCollaboration');
    await safeRenameColumn('venue_tour_preferences', 'participation_radius', 'participationRadius');
    
    // Venue network table
    console.log('Updating venue_network table columns...');
    await safeRenameColumn('venue_network', 'venue_id', 'venueId');
    await safeRenameColumn('venue_network', 'connected_venue_id', 'connectedVenueId');
    await safeRenameColumn('venue_network', 'connection_strength', 'connectionStrength');

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