/**
 * Venue Seeder Using Google Maps API
 * 
 * This script uses the Google Maps Places API to seed our database with real music venues
 * It searches for different venue types in target cities and stores the results
 * in our database with accurate locations, contact info, and website URLs.
 */

import axios from 'axios';
import { db } from './db';
import { venues } from '../shared/schema';
import { SyncLogger } from './utils/logging';
import { setTimeout } from 'timers/promises';
import { eq } from 'drizzle-orm';

// Initialize logger
const logger = new SyncLogger('VenueSeeder');

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Delay between API requests to avoid rate limiting
const API_REQUEST_DELAY = 1000; // 1 second
const MAX_VENUES_PER_CITY = 5; // Cap on venues per city search - reduced to make testing faster

// Target cities for venue searches
const TARGET_CITIES = [
  { name: 'New York', state: 'NY', country: 'US', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', state: 'CA', country: 'US', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', state: 'IL', country: 'US', lat: 41.8781, lng: -87.6298 },
  { name: 'Austin', state: 'TX', country: 'US', lat: 30.2672, lng: -97.7431 },
  { name: 'Nashville', state: 'TN', country: 'US', lat: 36.1627, lng: -86.7816 },
  { name: 'Seattle', state: 'WA', country: 'US', lat: 47.6062, lng: -122.3321 },
  { name: 'Portland', state: 'OR', country: 'US', lat: 45.5152, lng: -122.6784 },
  { name: 'Boston', state: 'MA', country: 'US', lat: 42.3601, lng: -71.0589 },
  { name: 'Philadelphia', state: 'PA', country: 'US', lat: 39.9526, lng: -75.1652 },
  { name: 'San Francisco', state: 'CA', country: 'US', lat: 37.7749, lng: -122.4194 },
  { name: 'Denver', state: 'CO', country: 'US', lat: 39.7392, lng: -104.9903 },
  { name: 'Minneapolis', state: 'MN', country: 'US', lat: 44.9778, lng: -93.2650 },
  { name: 'Atlanta', state: 'GA', country: 'US', lat: 33.7490, lng: -84.3880 },
  { name: 'Miami', state: 'FL', country: 'US', lat: 25.7617, lng: -80.1918 },
  { name: 'New Orleans', state: 'LA', country: 'US', lat: 29.9511, lng: -90.0715 }
];

// Venue search types for the Places API
const VENUE_SEARCH_TYPES = [
  'music_venue',    // Music venues (primary)
  'nightclub',      // Nightclubs that may host live music
  'bar',            // Bars that may feature live music
  'performing_arts_theater'  // Theaters that host music performances
];

/**
 * Search for venues in a specific city for a specific type
 */
async function searchVenuesInCity(city: any, venueType: string) {
  try {
    logger.info(`Searching for '${venueType}' venues in ${city.name}, ${city.state}`);
    
    // Construct Places API nearby search request
    const url = `${PLACES_API_BASE_URL}/nearbysearch/json`;
    const params = {
      location: `${city.lat},${city.lng}`,
      radius: 10000,  // 10km radius
      type: venueType,
      keyword: 'live music',  // Focus on venues with live music
      key: GOOGLE_MAPS_API_KEY
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      logger.warn(`API returned status: ${response.data.status}`);
      return [];
    }
    
    logger.info(`Found ${response.data.results.length} venues in ${city.name}`);
    
    // Map Google venue types to our supported venue types
    function mapGoogleTypeToVenueType(googleType: string): string {
      const typeMap: Record<string, string> = {
        'music_venue': 'club',
        'nightclub': 'club',
        'bar': 'bar',
        'performing_arts_theater': 'theater'
      };
      return typeMap[googleType] || 'club'; // Default to 'club' if not found
    }
    
    // Map results to venue objects
    const venueResults = response.data.results.map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      city: city.name,
      region: city.state,
      country: city.country,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      venueType: mapGoogleTypeToVenueType(venueType),
      address: place.vicinity,
      rating: place.rating || null,
      googlePlaceId: place.place_id
    }));
    
    // Get next page token if available
    let nextPageToken = response.data.next_page_token;
    if (nextPageToken && venueResults.length < MAX_VENUES_PER_CITY) {
      // Wait 2 seconds before using next page token (Google requires delay)
      await setTimeout(2000);
      
      // Fetch next page
      const nextPageUrl = `${url}?pagetoken=${nextPageToken}&key=${GOOGLE_MAPS_API_KEY}`;
      const nextPageResponse = await axios.get(nextPageUrl);
      
      if (nextPageResponse.data.status === 'OK') {
        const nextPageResults = nextPageResponse.data.results.map((place: any) => ({
          placeId: place.place_id,
          name: place.name,
          city: city.name,
          region: city.state,
          country: city.country,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          venueType: mapGoogleTypeToVenueType(venueType),
          address: place.vicinity,
          rating: place.rating || null,
          googlePlaceId: place.place_id
        }));
        
        venueResults.push(...nextPageResults);
      }
    }
    
    return venueResults.slice(0, MAX_VENUES_PER_CITY);
  } catch (error: any) {
    logger.error(`Error searching venues in ${city.name}: ${error.message}`);
    return [];
  }
}

/**
 * Get detailed place information for a venue
 */
async function getVenueDetails(placeId: string) {
  try {
    logger.info(`Getting details for place ID: ${placeId}`);
    
    const url = `${PLACES_API_BASE_URL}/details/json`;
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,geometry,photo,price_level,rating,user_ratings_total,opening_hours',
      key: GOOGLE_MAPS_API_KEY
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK') {
      logger.warn(`API returned status: ${response.data.status} for place: ${placeId}`);
      return null;
    }
    
    return response.data.result;
  } catch (error: any) {
    logger.error(`Error getting place details: ${error.message}`);
    return null;
  }
}

/**
 * Save a venue to the database
 */
async function saveVenue(venueData: any, placeDetails: any) {
  try {
    // Check if venue already exists by Google Place ID or name
    let existingVenue;
    if (venueData.googlePlaceId) {
      existingVenue = await db
        .select()
        .from(venues)
        .where(eq(venues.googlePlaceId, venueData.googlePlaceId));
    }
    
    // If no match by Google Place ID, try by name
    if (!existingVenue || existingVenue.length === 0) {
      existingVenue = await db
        .select()
        .from(venues)
        .where(eq(venues.name, venueData.name));
    }
    
    if (existingVenue.length > 0) {
      logger.info(`Venue already exists: ${venueData.name}`);
      return existingVenue[0];
    }
    
    // Prepare venue data
    const venueToSave: any = {
      name: venueData.name,
      city: venueData.city,
      region: venueData.region,
      country: venueData.country,
      address: venueData.address,
      latitude: venueData.latitude,
      longitude: venueData.longitude,
      venueType: venueData.venueType,
      googlePlaceId: venueData.googlePlaceId
    };
    
    // Add place details if available
    if (placeDetails) {
      venueToSave.fullAddress = placeDetails.formatted_address;
      venueToSave.phone = placeDetails.formatted_phone_number;
      venueToSave.websiteUrl = placeDetails.website;
      
      // Add rating details if available
      if (placeDetails.rating) {
        venueToSave.googleRating = placeDetails.rating;
        venueToSave.ratingCount = placeDetails.user_ratings_total;
      }
      
      // Add price level if available
      if (placeDetails.price_level !== undefined) {
        venueToSave.priceLevel = placeDetails.price_level;
      }
    }
    
    // Save to database
    const [savedVenue] = await db.insert(venues).values(venueToSave).returning();
    
    logger.info(`Saved venue: ${venueData.name} (ID: ${savedVenue.id})`);
    return savedVenue;
  } catch (error: any) {
    logger.error(`Error saving venue ${venueData.name}: ${error.message}`);
    return null;
  }
}

/**
 * Process and save venues from search results
 */
async function processVenueResults(venueResults: any[]) {
  try {
    logger.info(`Processing ${venueResults.length} venue results`);
    
    const savedVenues = [];
    
    for (const venueData of venueResults) {
      try {
        // Introduce delay to avoid rate limiting
        await setTimeout(API_REQUEST_DELAY);
        
        // Get detailed place information
        const placeDetails = await getVenueDetails(venueData.googlePlaceId);
        
        // Save venue to database
        const savedVenue = await saveVenue(venueData, placeDetails);
        if (savedVenue) {
          savedVenues.push(savedVenue);
        }
      } catch (error: any) {
        logger.error(`Error processing venue ${venueData.name}: ${error.message}`);
        continue;
      }
    }
    
    return savedVenues;
  } catch (error: any) {
    logger.error(`Error processing venue results: ${error.message}`);
    return [];
  }
}

/**
 * Seed venues for a specific city
 */
async function seedVenuesForCity(city: any) {
  try {
    logger.info(`Seeding venues for ${city.name}, ${city.state}`);
    
    let allVenueResults: any[] = [];
    
    // Search for each venue type
    for (const venueType of VENUE_SEARCH_TYPES) {
      // Introduce delay to avoid rate limiting
      await setTimeout(API_REQUEST_DELAY);
      
      // Search for venues
      const venueResults = await searchVenuesInCity(city, venueType);
      
      // Add to results, filtering out duplicates by place ID
      const existingPlaceIds = new Set(allVenueResults.map(v => v.placeId));
      const uniqueResults = venueResults.filter(v => !existingPlaceIds.has(v.placeId));
      
      allVenueResults.push(...uniqueResults);
      
      logger.info(`Added ${uniqueResults.length} unique ${venueType} venues in ${city.name}`);
    }
    
    // Cap the number of venues per city
    if (allVenueResults.length > MAX_VENUES_PER_CITY) {
      logger.info(`Limiting from ${allVenueResults.length} to ${MAX_VENUES_PER_CITY} venues for ${city.name}`);
      allVenueResults = allVenueResults.slice(0, MAX_VENUES_PER_CITY);
    }
    
    // Process and save venues
    const savedVenues = await processVenueResults(allVenueResults);
    
    return {
      city: city.name,
      state: city.state,
      totalFound: allVenueResults.length,
      totalSaved: savedVenues.length
    };
  } catch (error: any) {
    logger.error(`Error seeding venues for ${city.name}: ${error.message}`);
    return {
      city: city.name,
      state: city.state,
      totalFound: 0,
      totalSaved: 0,
      error: error.message
    };
  }
}

/**
 * Seed venues for all target cities
 */
async function seedAllVenues(limit: number = 0) {
  try {
    logger.info('Starting venue seeding process');
    
    const citiesToProcess = limit > 0 ? TARGET_CITIES.slice(0, limit) : TARGET_CITIES;
    
    logger.info(`Processing ${citiesToProcess.length} cities`);
    
    const results = [];
    
    for (const city of citiesToProcess) {
      const result = await seedVenuesForCity(city);
      results.push(result);
      
      // Add delay between cities
      await setTimeout(2000);
    }
    
    // Summarize results
    const totalFound = results.reduce((sum, r) => sum + r.totalFound, 0);
    const totalSaved = results.reduce((sum, r) => sum + r.totalSaved, 0);
    
    logger.info(`Venue seeding complete. Found ${totalFound} venues, saved ${totalSaved} venues`);
    
    return {
      totalCities: citiesToProcess.length,
      totalFound,
      totalSaved,
      cityResults: results
    };
  } catch (error: any) {
    logger.error(`Error in venue seeding process: ${error.message}`);
    throw error;
  }
}

/**
 * Seed venues for a specific city by name
 */
async function seedVenuesForCityByName(cityName: string) {
  try {
    const city = TARGET_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    
    if (!city) {
      logger.error(`City not found: ${cityName}`);
      return {
        error: 'city_not_found',
        message: `City not found: ${cityName}. Available cities are: ${TARGET_CITIES.map(c => c.name).join(', ')}`
      };
    }
    
    return await seedVenuesForCity(city);
  } catch (error: any) {
    logger.error(`Error seeding venues for ${cityName}: ${error.message}`);
    return {
      error: 'seeding_error',
      message: error.message
    };
  }
}

// Export functions
export {
  seedAllVenues,
  seedVenuesForCityByName,
  seedVenuesForCity
};

// Direct execution for ES modules
const args = process.argv.slice(2);
const command = args[0];

// Only run if this is the main module (not imported)
if (import.meta.url.endsWith(process.argv[1])) {
  (async () => {
    try {
      if (command === 'all') {
        // Process all cities or a subset
        const limit = args[1] ? parseInt(args[1]) : 0;
        await seedAllVenues(limit);
      } else if (command === 'city') {
        // Process a specific city
        const cityName = args[1];
        if (!cityName) {
          console.error('Please provide a city name');
          process.exit(1);
        }
        await seedVenuesForCityByName(cityName);
      } else {
        console.error('Unknown command. Use: all [limit] or city [name]');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}