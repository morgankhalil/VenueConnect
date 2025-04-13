/**
 * Venue Data Enhancer
 * 
 * This script uses the Google Maps API to enhance venue data with:
 * - Accurate geocoding (latitude/longitude)
 * - Verified place details (address, phone, etc.)
 * - Current website URLs
 * - Place IDs for future reference
 */

import axios from 'axios';
import { db } from './db';
import { venues } from '../shared/schema';
import { eq, and, isNull, not, or } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';

// Initialize logger
const logger = new SyncLogger('VenueEnhancer');

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

// Delay between API requests to avoid rate limiting
const API_REQUEST_DELAY = 1000; // 1 second

// Sleep function for throttling requests
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode a venue using the Google Maps API
 */
async function geocodeVenue(venue: any) {
  try {
    logger.info(`Geocoding venue: ${venue.name} in ${venue.city}, ${venue.region || venue.country}`);
    
    // Create query string from venue details
    const query = encodeURIComponent(`${venue.name}, ${venue.city}, ${venue.region || venue.country}`);
    const url = `${GOOGLE_MAPS_BASE_URL}/geocode/json?address=${query}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK' || !response.data.results.length) {
      logger.warn(`No geocoding results for venue: ${venue.name}`);
      return null;
    }
    
    // Get the first result
    const result = response.data.results[0];
    
    return {
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng
    };
  } catch (error) {
    logger.error(`Error geocoding venue ${venue.name}: ${error.message}`);
    return null;
  }
}

/**
 * Get detailed place information from Google Maps Place API
 */
async function getPlaceDetails(placeId: string) {
  try {
    logger.info(`Getting place details for place ID: ${placeId}`);
    
    const fields = ['name', 'formatted_address', 'formatted_phone_number', 'website', 'url', 'vicinity', 'types'].join(',');
    const url = `${GOOGLE_MAPS_BASE_URL}/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK' || !response.data.result) {
      logger.warn(`No place details found for place ID: ${placeId}`);
      return null;
    }
    
    return response.data.result;
  } catch (error) {
    logger.error(`Error getting place details: ${error.message}`);
    return null;
  }
}

/**
 * Update a venue with enhanced data from Google Maps
 */
async function updateVenueWithEnhancedData(venue: any, geocodeData: any, placeDetails: any) {
  try {
    logger.info(`Updating venue: ${venue.name} with enhanced data`);
    
    // Build update payload
    const updatePayload: any = {
      latitude: geocodeData.lat,
      longitude: geocodeData.lng,
      googlePlaceId: geocodeData.placeId
    };
    
    // Add place details if available
    if (placeDetails) {
      if (placeDetails.website) {
        updatePayload.websiteUrl = placeDetails.website;
      }
      
      if (placeDetails.formatted_phone_number) {
        updatePayload.phone = placeDetails.formatted_phone_number;
      }
      
      if (placeDetails.vicinity) {
        updatePayload.address = placeDetails.vicinity;
      }
      
      if (placeDetails.formatted_address) {
        updatePayload.fullAddress = placeDetails.formatted_address;
      }
      
      // Extract venue type from place types
      if (placeDetails.types && placeDetails.types.length) {
        const venueTypeMap: Record<string, string> = {
          'bar': 'bar',
          'night_club': 'club',
          'restaurant': 'restaurant',
          'cafe': 'cafe',
          'movie_theater': 'theater',
          'performing_arts_theater': 'theater',
          'stadium': 'arena',
          'amusement_park': 'venue',
          'establishment': 'venue'
        };
        
        for (const type of placeDetails.types) {
          if (venueTypeMap[type]) {
            updatePayload.venueType = venueTypeMap[type];
            break;
          }
        }
      }
    }
    
    // Update the venue
    await db.update(venues)
      .set(updatePayload)
      .where(eq(venues.id, venue.id));
    
    logger.info(`Successfully updated venue: ${venue.name}`);
    
    // Return the updated fields for tracking
    return updatePayload;
  } catch (error) {
    logger.error(`Error updating venue ${venue.name}: ${error.message}`);
    return null;
  }
}

/**
 * Process a single venue to enhance its data
 */
async function enhanceVenueData(venue: any) {
  try {
    logger.info(`Enhancing data for venue: ${venue.name}`);
    
    // Skip if venue already has lat/lng and website
    if (venue.latitude && venue.longitude && venue.websiteUrl) {
      logger.info(`Venue ${venue.name} already has complete data, skipping`);
      return {
        venueId: venue.id,
        name: venue.name,
        status: 'skipped',
        reason: 'already_complete'
      };
    }
    
    // Step 1: Geocode the venue
    const geocodeData = await geocodeVenue(venue);
    if (!geocodeData) {
      return {
        venueId: venue.id,
        name: venue.name,
        status: 'failed',
        reason: 'geocoding_failed'
      };
    }
    
    // Add delay to avoid rate limiting
    await sleep(API_REQUEST_DELAY);
    
    // Step 2: Get place details
    const placeDetails = await getPlaceDetails(geocodeData.placeId);
    
    // Step 3: Update venue with enhanced data
    const updateResult = await updateVenueWithEnhancedData(venue, geocodeData, placeDetails);
    
    return {
      venueId: venue.id,
      name: venue.name,
      status: updateResult ? 'enhanced' : 'failed',
      updates: updateResult
    };
  } catch (error) {
    logger.error(`Error enhancing venue ${venue.name}: ${error.message}`);
    return {
      venueId: venue.id,
      name: venue.name,
      status: 'error',
      reason: error.message
    };
  }
}

/**
 * Process all venues or a subset based on criteria
 */
async function enhanceAllVenues(limit: number = 0) {
  try {
    logger.info('Starting venue data enhancement process');
    
    // Get venues to enhance
    let query = db.select().from(venues);
    
    // Filter only venues without full data
    query = query.where(
      or(
        isNull(venues.latitude),
        isNull(venues.longitude),
        isNull(venues.websiteUrl)
      )
    );
    
    // Apply limit if specified
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    const venuesToEnhance = await query;
    logger.info(`Found ${venuesToEnhance.length} venues to enhance`);
    
    // Process each venue
    const results = [];
    for (const venue of venuesToEnhance) {
      const result = await enhanceVenueData(venue);
      results.push(result);
      
      // Add delay between venues
      await sleep(API_REQUEST_DELAY);
    }
    
    // Summarize results
    const summary = {
      total: results.length,
      enhanced: results.filter(r => r.status === 'enhanced').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length
    };
    
    logger.info(`Enhancement complete, summary: ${JSON.stringify(summary)}`);
    return {
      summary,
      results
    };
  } catch (error) {
    logger.error(`Error in venue enhancement process: ${error.message}`);
    throw error;
  }
}

/**
 * Enhance a specific venue by name
 */
async function enhanceVenueByName(venueName: string) {
  try {
    logger.info(`Looking up venue: ${venueName}`);
    
    // Find the venue
    const venueResults = await db
      .select()
      .from(venues)
      .where(eq(venues.name, venueName));
    
    if (venueResults.length === 0) {
      logger.error(`Venue not found: ${venueName}`);
      return {
        status: 'error',
        reason: 'venue_not_found'
      };
    }
    
    const venue = venueResults[0];
    
    // Enhance the venue
    return await enhanceVenueData(venue);
  } catch (error) {
    logger.error(`Error enhancing venue ${venueName}: ${error.message}`);
    return {
      status: 'error',
      reason: error.message
    };
  }
}

// Export functions
export {
  enhanceAllVenues,
  enhanceVenueByName,
  enhanceVenueData
};

// Direct execution for ES modules
// Command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Only run if this is the main module (not imported)
if (import.meta.url.endsWith(process.argv[1])) {
  // Execute based on command
  (async () => {
    try {
      if (command === 'all') {
        // Process all venues, with optional limit
        const limit = args[1] ? parseInt(args[1]) : 0;
        await enhanceAllVenues(limit);
      } else if (command === 'venue') {
        // Process a specific venue
        const venueName = args[1];
        if (!venueName) {
          console.error('Please provide a venue name');
          process.exit(1);
        }
        await enhanceVenueByName(venueName);
      } else {
        console.error('Unknown command. Use: all [limit] or venue [name]');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}