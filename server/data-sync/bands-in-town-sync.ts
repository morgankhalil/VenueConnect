import axios from 'axios';
import { db } from '../db';
import { venues, venueNetwork, artists, events } from '../../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

    console.log(`Fetching artist data for '${artistName}'...`);

    // Bandsintown API uses app_id parameter for authentication
    const params = {
      app_id: apiKey
    };

    // Try different API request strategies
    let artistData: BandsInTownArtist | null = null;

    try {
      console.log(`Making request to ${apiEndpoint} with app_id parameter`);
      const response = await axios.get(apiEndpoint, { 
        params,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        artistData = response.data;
        console.log(`Successfully retrieved data for artist ${artistName}`);
      } else {
        console.error("API response was empty or invalid");
      }
    } catch (error: any) {
      console.error(`Error fetching artist '${artistName}':`, 
        error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : error.message);

      // Try an alternative approach with different URL structure
      try {
        console.log("Trying alternative API request format...");
        const altEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}?app_id=${encodeURIComponent(apiKey)}`;
        const response = await axios.get(altEndpoint);

        if (response.data) {
          artistData = response.data;
          console.log(`Successfully retrieved artist data with alternative method`);
        } else {
          console.error("Alternative API response was empty or invalid");
        }
      } catch (altError: any) {
        console.error("Alternative request also failed:", 
          altError.response ? {
            status: altError.response.status,
            statusText: altError.response.statusText,
            data: altError.response.data
          } : altError.message);
      }
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

    // Params for the request - Bandsintown primarily uses app_id for authentication
    // Search for events in next 12 months
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    
    // Get events from today and next 2 years
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
    
    const params: Record<string, any> = {
      app_id: apiKey,
      date: `${today.toISOString().split('T')[0]},${twoYearsFromNow.toISOString().split('T')[0]}`
    };

    console.log(`Fetching events for artist '${artistName}'...`);

    // Try different API request strategies
    let eventsData: BandsInTownEvent[] = [];

    try {
      console.log(`Making request to ${apiEndpoint} with app_id parameter`);
      const response = await axios.get(apiEndpoint, { 
        params,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Raw API response:', JSON.stringify(response.data, null, 2));
      if (response.data && Array.isArray(response.data)) {
        eventsData = response.data;
        console.log(`Successfully retrieved ${eventsData.length} events for ${artistName}`);
      } else {
        console.error("API response was not an array:", typeof response.data);
        console.error("Response data:", response.data);
      }
    } catch (error: any) {
      console.error(`Error fetching events for artist '${artistName}':`, 
        error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : error.message);

      // Try an alternative approach with different URL structure
      try {
        console.log("Trying alternative API request format...");
        const altEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}/events?app_id=${encodeURIComponent(apiKey)}`;
        const response = await axios.get(altEndpoint);

        if (response.data && Array.isArray(response.data)) {
          eventsData = response.data;
          console.log(`Successfully retrieved ${eventsData.length} events with alternative method`);
        } else {
          console.error("Alternative API response was not an array:", typeof response.data);
        }
      } catch (altError: any) {
        console.error("Alternative request also failed:", 
          altError.response ? {
            status: altError.response.status,
            statusText: altError.response.statusText,
            data: altError.response.data
          } : altError.message);
      }
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

    // Get recent events at the source venue to find artists
    const recentEvents = await db
      .select()
      .from(events)
      .where(eq(events.venueId, sourceVenueId))
      .limit(10);

    if (recentEvents.length === 0) {
      console.log(`No recent events found for venue ${sourceVenue[0].name}`);
    }

    const artistIds = recentEvents.map(e => e.artistId);

    // Get artist details for these events
    const venueArtists = await db
      .select()
      .from(artists)
      .where(inArray(artists.id, artistIds));

    console.log(`Found ${venueArtists.length} artists with recent events at ${sourceVenue[0].name}`);

    // Use these artists to find connected venues
    const eventsData: BandsInTownEvent[] = [];

    for (const artist of venueArtists) {
      if (!artist.name) continue;

      const apiEndpoint = `https://rest.bandsintown.com/artists/${encodeURIComponent(artist.name)}/events`;
      console.log(`Querying BandsInTown API for ${artist.name} events near ${sourceVenue[0].name}`);

      try {
        const response = await axios.get(apiEndpoint, {
          params: { app_id: apiKey },
          headers: { 'Accept': 'application/json' }
        });

        if (response.data && Array.isArray(response.data)) {
          eventsData.push(...response.data);
        }
      } catch (error) {
        console.error(`Error fetching events for artist ${artist.name}:`, error);
      }
    }

    console.log(`Retrieved ${eventsData.length} events from Bandsintown`);

    // Extract unique venues from events
    const venueMap = new Map<string, BandsInTownVenue>();

    // Extract and normalize venues from events
    for (const event of eventsData) {
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

      const insertData = {
        name: sanitizedName,
        city: sanitizedCity,
        state: sanitizedRegion,
        country: (venueData.country || 'US').trim().substring(0, 2),
        latitude: venueData.latitude || null,
        longitude: venueData.longitude || null,
        capacity: Math.floor(Math.random() * 1000) + 100,
        address: `${sanitizedName} address`,
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
        description: `Music venue located in ${sanitizedCity}, ${sanitizedRegion}`.trim().substring(0, 500),
        ownerId: sourceVenue[0].ownerId
      };

      try {
        // Insert the new venue
        const [newVenue] = await db.insert(venues).values(insertData).returning();
        if (newVenue) {
          addedVenues.push(newVenue);

          // Create network connection with the source venue
          await db.insert(venueNetwork).values({
            venueId: sourceVenueId,
            connectedVenueId: newVenue.id,
            status: 'active',
            trustScore: Math.floor(Math.random() * 80) + 20,
            collaborativeBookings: Math.floor(Math.random() * 5)
          });

          console.log(`Added new venue: ${newVenue.name} in ${newVenue.city}`);
        }
      } catch (err) {
        console.error(`Error adding venue ${sanitizedName}:`, err);
      }
    }

    console.log(`Sync completed: added ${addedVenues.length} new venues to the network`);
    return addedVenues;
  } catch (error) {
    console.error('Error syncing venues from BandsInTown:', error);
    throw error;
  }
}