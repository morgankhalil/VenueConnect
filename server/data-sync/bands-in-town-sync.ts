import axios from 'axios';
import { db } from '../db';
import { venues, venueNetwork, artists, events } from '../../shared/schema';
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

interface BandsInTownArtist {
  id: string;
  name: string;
  url: string;
  image_url?: string;
  thumb_url?: string;
  facebook_page_url?: string;
  mbid?: string;
  tracker_count?: number;
  upcoming_event_count?: number;
}

interface BandsInTownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime?: string;
  datetime: string;
  description?: string;
  venue: BandsInTownVenue;
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
  title?: string;
  artist?: BandsInTownArtist;
  status?: 'confirmed' | 'cancelled';
}

/**
 * Fetches artist info from Bandsintown API and saves to database
 * @param artistName Name of the artist to fetch
 * @returns The artist details, including database ID
 */
export async function syncArtistFromBandsInTown(artistName: string) {
  try {
    // Validate input
    if (!artistName || typeof artistName !== 'string') {
      throw new Error('Invalid artist name');
    }

    // Check if API key is configured
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('BANDSINTOWN_API_KEY secret is not set');
      throw new Error('Bandsintown API key is not configured. Please add it to your Replit Secrets.');
    }

    // Sanitize artist name for URL
    const encodedArtistName = encodeURIComponent(artistName.trim());
    const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}`;
    
    // Headers with API key in Authorization header
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };

    // Try different authentication methods
    let artistData: BandsInTownArtist | null = null;

    try {
      // First try with Bearer token
      console.log(`Attempting to fetch artist '${artistName}' with Bearer token...`);
      const response = await axios.get(apiEndpoint, { 
        headers,
      });
      artistData = response.data;
    } catch (error) {
      console.log(`Bearer token authentication failed, trying app_id parameter for artist '${artistName}'...`);
      // If that fails, try with app_id as a query parameter
      const response = await axios.get(apiEndpoint, { 
        params: {
          app_id: apiKey
        }
      });
      artistData = response.data;
    }

    if (!artistData || !artistData.name) {
      console.log(`Artist '${artistName}' not found on Bandsintown`);
      return null;
    }

    console.log(`Found artist '${artistData.name}' on Bandsintown`);

    // Check if artist already exists in our database
    const existingArtists = await db.select()
      .from(artists)
      .where(eq(artists.name, artistData.name))
      .limit(1);

    if (existingArtists.length > 0) {
      console.log(`Artist '${artistData.name}' already exists in database`);
      
      // Update artist info
      await db.update(artists)
        .set({
          bandsintownId: artistData.id,
          imageUrl: artistData.image_url,
          genres: ['rock'] // Default to rock since Bandsintown doesn't provide genres
        })
        .where(eq(artists.id, existingArtists[0].id));
      
      return existingArtists[0];
    }

    // Insert new artist
    const newArtists = await db.insert(artists).values({
      name: artistData.name,
      bandsintownId: artistData.id,
      imageUrl: artistData.image_url,
      websiteUrl: artistData.url,
      genres: ['rock'], // Default to rock since Bandsintown doesn't provide genres
      popularity: artistData.tracker_count ? Math.min(100, Math.floor(artistData.tracker_count / 1000)) : 50
    }).returning();

    if (newArtists.length > 0) {
      console.log(`Added new artist: ${newArtists[0].name}`);
      return newArtists[0];
    }

    return null;
  } catch (error) {
    console.error(`Error syncing artist from BandsInTown:`, error);
    throw error;
  }
}

/**
 * Synchronizes artist events from Bandsintown API
 * @param artistName Name of the artist to fetch events for
 * @returns Array of events added/updated
 */
export async function syncArtistEventsFromBandsInTown(artistName: string) {
  try {
    // Validate input
    if (!artistName || typeof artistName !== 'string') {
      throw new Error('Invalid artist name');
    }

    // Check if API key is configured
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('BANDSINTOWN_API_KEY secret is not set');
      throw new Error('Bandsintown API key is not configured. Please add it to your Replit Secrets.');
    }

    // First, make sure we have the artist in our database
    const artist = await syncArtistFromBandsInTown(artistName);
    if (!artist) {
      throw new Error(`Failed to find or create artist '${artistName}'`);
    }

    // Sanitize artist name for URL
    const encodedArtistName = encodeURIComponent(artistName.trim());
    const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}/events`;
    
    // Headers with API key in Authorization header
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };

    // Params for the request
    const params: Record<string, any> = {
      date: 'upcoming' // Get upcoming events
    };

    // Try different authentication methods
    let eventsData: BandsInTownEvent[] = [];

    try {
      // First try with Bearer token
      console.log(`Attempting to fetch events for '${artistName}' with Bearer token...`);
      const response = await axios.get(apiEndpoint, { 
        headers,
        params
      });
      eventsData = response.data || [];
    } catch (error) {
      console.log(`Bearer token authentication failed, trying app_id parameter for '${artistName}' events...`);
      // If that fails, try with app_id as a query parameter
      const response = await axios.get(apiEndpoint, { 
        params: {
          ...params,
          app_id: apiKey
        }
      });
      eventsData = response.data || [];
    }

    console.log(`Retrieved ${eventsData.length} events for artist '${artistName}'`);
    
    // Process events
    const addedEvents: any[] = [];
    
    for (const eventData of eventsData) {
      if (!eventData.venue || !eventData.datetime) {
        console.log('Skipping event with missing venue or datetime');
        continue;
      }
      
      // Check if venue exists, or create it
      let venueId;
      const existingVenues = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, eventData.venue.name),
            eq(venues.city, eventData.venue.city)
          )
        )
        .limit(1);
      
      if (existingVenues.length > 0) {
        venueId = existingVenues[0].id;
      } else {
        // Need to create the venue
        const newVenues = await db.insert(venues).values({
          name: eventData.venue.name,
          city: eventData.venue.city,
          state: eventData.venue.region || '',
          country: (eventData.venue.country || 'US').substring(0, 2),
          latitude: eventData.venue.latitude || null,
          longitude: eventData.venue.longitude || null,
          capacity: 500, // Default capacity
          address: `${eventData.venue.name}`, // Default address
          zipCode: '00000', // Default zip
          description: `Music venue in ${eventData.venue.city}`,
        }).returning();
        
        if (newVenues.length > 0) {
          venueId = newVenues[0].id;
          console.log(`Created new venue: ${newVenues[0].name} in ${newVenues[0].city}`);
        } else {
          console.log(`Failed to create venue for event`);
          continue;
        }
      }
      
      // Process datetime
      const eventDate = new Date(eventData.datetime);
      const dateString = eventDate.toISOString().split('T')[0];
      const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);
      
      // Check if event already exists
      const existingEvents = await db.select()
        .from(events)
        .where(
          and(
            eq(events.artistId, artist.id),
            eq(events.venueId, venueId),
            eq(events.date, dateString)
          )
        )
        .limit(1);
      
      if (existingEvents.length > 0) {
        // Update existing event
        await db.update(events)
          .set({
            status: eventData.status || 'confirmed',
            ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
            sourceId: eventData.id,
            sourceName: 'bandsintown'
          })
          .where(eq(events.id, existingEvents[0].id));
        
        console.log(`Updated existing event: ${artist.name} at ${eventData.venue.name} on ${dateString}`);
        addedEvents.push({...existingEvents[0]});
      } else {
        // Create new event
        const newEvents = await db.insert(events).values({
          artistId: artist.id,
          venueId: venueId,
          date: dateString,
          startTime: timeString,
          status: eventData.status || 'confirmed',
          ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
          sourceId: eventData.id,
          sourceName: 'bandsintown'
        }).returning();
        
        if (newEvents.length > 0) {
          console.log(`Added new event: ${artist.name} at ${eventData.venue.name} on ${dateString}`);
          addedEvents.push({...newEvents[0]});
        }
      }
    }
    
    console.log(`Sync completed: processed ${eventsData.length} events, added/updated ${addedEvents.length}`);
    return addedEvents;
  } catch (error) {
    console.error(`Error syncing events from BandsInTown:`, error);
    throw error;
  }
}

/**
 * Synchronizes venue data from BandsInTown API
 * This is designed to be run as a scheduled task, not user-initiated
 */
export async function syncVenuesFromBandsInTown(sourceVenueId: number, radius = 250, limit = 10) {
  // Input validation
  if (!sourceVenueId || isNaN(sourceVenueId) || sourceVenueId <= 0) {
    throw new Error('Invalid sourceVenueId: Must be a positive number');
  }
  
  if (radius && (isNaN(radius) || radius < 0 || radius > 500)) {
    throw new Error('Invalid radius: Must be between 0 and 500');
  }
  
  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    throw new Error('Invalid limit: Must be between 1 and 100');
  }
  try {
    // First, check if the API key is configured
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('BANDSINTOWN_API_KEY secret is not set');
      throw new Error('Bandsintown API key is not configured. Please add it to your Replit Secrets.');
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
      
      // Sanitize and validate venue data before insertion
      const sanitizedName = (venueData.name || '').trim().substring(0, 100); // Limit name length
      const sanitizedCity = (venueData.city || '').trim().substring(0, 50); // Limit city length
      const sanitizedRegion = (venueData.region || '').trim().substring(0, 50); // Limit state/region length
      
      // Skip venues with missing required data
      if (!sanitizedName || !sanitizedCity) {
        console.log(`Skipping venue with missing required data: ${venueData.name || 'Unknown'}`);
        continue;
      }
      
      // Add this new venue to our database with sanitized data
      const insertData = {
        name: sanitizedName,
        city: sanitizedCity,
        state: sanitizedRegion,
        country: (venueData.country || 'US').trim().substring(0, 2), // Limit to 2 characters for country code
        latitude: venueData.latitude || null,
        longitude: venueData.longitude || null,
        capacity: Math.floor(Math.random() * 1000) + 100, // Random capacity between 100-1100
        address: `${sanitizedName} address`, // Use name as placeholder since API doesn't provide address
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`, // Random 5-digit ZIP code
        description: `Music venue located in ${sanitizedCity}, ${sanitizedRegion}`.trim().substring(0, 500), // Limit description length
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