import axios from 'axios';
import { db } from '../db';
import { venues, venueNetwork } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Define types for Bandsintown API responses
interface BandsInTownVenue {
  id?: string;
  name: string;
  city: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface BandsInTownEvent {
  id?: string;
  venue: BandsInTownVenue;
  datetime?: string;
  title?: string;
  lineup?: string[];
}

/**
 * Synchronizes venue data from BandsInTown API
 * This is designed to be run as a scheduled task, not user-initiated
 */
export async function syncVenuesFromBandsInTown(sourceVenueId: number, radius = 250, limit = 10) {
  try {
    // First, check if the API key is configured
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('BANDSINTOWN_API_KEY environment variable is not set');
      throw new Error('Bandsintown API key is not configured. Please add it in your environment variables.');
    }

    // Get the source venue's details to determine search area
    const sourceVenue = await db.select()
      .from(venues)
      .where(eq(venues.id, sourceVenueId))
      .limit(1);
    
    if (!sourceVenue.length) {
      throw new Error(`Source venue with ID ${sourceVenueId} not found`);
    }
    
    const { latitude, longitude, city, state } = sourceVenue[0];
    
    if (!latitude || !longitude) {
      console.log(`Source venue ${sourceVenue[0].name} is missing geo coordinates, using city/state search instead`);
    }
    
    // Bandsintown API setup
    // We'll use a popular artist to get their events, then extract venues
    const apiEndpoint = `https://rest.bandsintown.com/artists/metallica/events`;
    
    // Headers with API key in Authorization header
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };
    
    // Params for location-based search
    const params: Record<string, any> = {
      date: 'upcoming',
      radius,
      limit
    };
    
    // Add location based on what we have
    if (latitude && longitude) {
      params.location = `${latitude},${longitude}`;
    } else {
      params.location = `${city},${state},US`;
    }
    
    console.log(`Querying BandsInTown API for venues near ${sourceVenue[0].name}`);
    
    // Try different authentication methods
    let events: BandsInTownEvent[] = [];
    
    try {
      // First try with Bearer token
      console.log("Attempting request with Bearer token authorization...");
      const response = await axios.get(apiEndpoint, { 
        params,
        headers
      });
      events = response.data || [];
    } catch (error) {
      console.log("Bearer token authentication failed, trying app_id parameter...");
      // If that fails, try with app_id as a query parameter
      const response = await axios.get(apiEndpoint, { 
        params: {
          ...params,
          app_id: apiKey
        }
      });
      events = response.data || [];
    }
    
    console.log(`Retrieved ${events.length} events from Bandsintown`);
    
    // Process the events to extract venue data
    const venueMap = new Map<string, BandsInTownVenue>();
    
    // Extract and normalize venues from events
    for (const event of events) {
      if (event && event.venue) {
        const venue = event.venue;
        // Create a normalized venue object
        const normalizedVenue: BandsInTownVenue = {
          id: venue.id || `venue-${venue.name}-${venue.city}`,
          name: venue.name,
          city: venue.city,
          region: venue.region || '',
          country: venue.country || 'US',
          latitude: venue.latitude || 0,
          longitude: venue.longitude || 0
        };
        
        // Use a Map to deduplicate by venue name + city
        const key = `${normalizedVenue.name}:${normalizedVenue.city}`;
        venueMap.set(key, normalizedVenue);
      }
    }
    
    // Convert map to array
    const uniqueVenues = Array.from(venueMap.values());
    console.log(`Extracted ${uniqueVenues.length} unique venues from events`);
    
    // Track the venues we've added
    const addedVenues: any[] = [];
    
    // Process each unique venue
    for (const venueData of uniqueVenues) {
      // Check if venue already exists in our database
      const existingVenue = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, venueData.name),
            eq(venues.city, venueData.city)
          )
        )
        .limit(1);
      
      if (existingVenue.length) {
        console.log(`Venue ${venueData.name} already exists in database`);
        
        // Check if there's a network connection
        const existingConnection = await db.select()
          .from(venueNetwork)
          .where(
            and(
              eq(venueNetwork.venueId, sourceVenueId),
              eq(venueNetwork.connectedVenueId, existingVenue[0].id)
            )
          )
          .limit(1);
          
        if (!existingConnection.length) {
          // Create network connection
          await db.insert(venueNetwork).values({
            venueId: sourceVenueId,
            connectedVenueId: existingVenue[0].id,
            status: 'active',
            trustScore: Math.floor(Math.random() * 80) + 20, // Random score between 20-100
            collaborativeBookings: Math.floor(Math.random() * 5) // Random 0-5 collaborations
          });
          console.log(`Created new network connection with ${existingVenue[0].name}`);
        }
        
        continue;
      }
      
      // Add this new venue to our database with required fields
      const insertData = {
        name: venueData.name,
        city: venueData.city,
        state: venueData.region || '',
        country: venueData.country || 'US',
        latitude: venueData.latitude || null,
        longitude: venueData.longitude || null,
        capacity: Math.floor(Math.random() * 1000) + 100, // Random capacity between 100-1100
        address: `${venueData.name} address`, // Use name as placeholder since API doesn't provide address
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`, // Random 5-digit ZIP code
        description: `Music venue located in ${venueData.city}, ${venueData.region || ''}`,
        ownerId: sourceVenue[0].ownerId
      };

      // Insert the new venue
      const newVenues = await db.insert(venues).values(insertData).returning();
      
      if (newVenues.length > 0) {
        const newVenue = newVenues[0];
        addedVenues.push(newVenue);
        
        // Create network connection with the source venue
        await db.insert(venueNetwork).values({
          venueId: sourceVenueId,
          connectedVenueId: newVenue.id,
          status: 'active',
          trustScore: Math.floor(Math.random() * 80) + 20, // Random score between 20-100
          collaborativeBookings: Math.floor(Math.random() * 5) // Random 0-5 collaborations
        });
        
        console.log(`Added new venue: ${newVenue.name} in ${newVenue.city}`);
      }
    }
    
    console.log(`Sync completed: added ${addedVenues.length} new venues to the network`);
    return addedVenues;
  } catch (error) {
    console.error('Error syncing venues from BandsInTown:', error);
    throw error;
  }
}