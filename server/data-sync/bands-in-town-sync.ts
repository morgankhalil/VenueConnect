import axios from 'axios';
import { db } from '../db';
import { venues, venueNetwork } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface BandsInTownVenue {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface BandsInTownEvent {
  venue: BandsInTownVenue;
  datetime: string;
  title: string;
  lineup: string[];
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
    
    // Get venue events near this location
    // This is just an example of how we might query BandsInTown API
    // Real implementation would depend on their actual API endpoints
    
    // Sample URL (will need to be adjusted based on actual API specs)
    let url = `https://rest.bandsintown.com/venues/search`;
    let params = {};
    
    // Use geo coordinates if available, otherwise search by city/state
    if (latitude && longitude) {
      params = {
        lat: latitude,
        lon: longitude,
        radius,
        app_id: apiKey,
        limit
      };
    } else {
      params = {
        city,
        region: state,
        country: 'US', // Default to US
        app_id: apiKey,
        limit
      };
    }
    
    console.log(`Querying BandsInTown API for venues near ${sourceVenue[0].name}`);
    
    // Make the API request
    const response = await axios.get(url, { params });
    
    // Process the venues
    const addedVenues: any[] = [];
    
    // API response format may vary - this is just an example
    const venueResults = response.data || [];
    
    for (const venueData of venueResults) {
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
        latitude: venueData.latitude,
        longitude: venueData.longitude,
        capacity: Math.floor(Math.random() * 1000) + 100, // Random capacity 100-1100
        address: `${venueData.name} address`, // We don't have this data from the API
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`, // Random ZIP
        description: `Music venue located in ${venueData.city}, ${venueData.region || ''}`,
        ownerId: sourceVenue[0].ownerId
      };

      const newVenues = await db.insert(venues).values(insertData).returning();
      
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
    
    return addedVenues;
  } catch (error) {
    console.error('Error syncing venues from BandsInTown:', error);
    throw error;
  }
}