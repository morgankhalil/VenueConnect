import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

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
 * List of artists to use for venue discovery
 * Including a mix of genres and popularity levels to maximize event coverage
 */
// Get artists from database
const existingArtists = await db.select().from(artists);
const artistsToSearch = existingArtists.map(artist => artist.name);

/**
 * Fetch artist data from Bandsintown
 */
async function fetchArtist(artistName: string): Promise<BandsInTownArtist | null> {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    // Sanitize artist name for URL
    const encodedArtistName = encodeURIComponent(artistName.trim());
    const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}`;
    
    console.log(`Fetching artist data for '${artistName}'...`);
    
    const response = await axios.get(apiEndpoint, { 
      params: { app_id: apiKey },
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data && response.data.name) {
      console.log(`Successfully retrieved data for artist ${artistName}`);
      return response.data;
    }
    
    console.log(`No data found for artist ${artistName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching artist '${artistName}':`, error);
    return null;
  }
}

/**
 * Fetch artist events from Bandsintown
 */
async function fetchArtistEvents(artistName: string): Promise<BandsInTownEvent[]> {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    // Sanitize artist name for URL
    const encodedArtistName = encodeURIComponent(artistName.trim());
    const apiEndpoint = `https://rest.bandsintown.com/artists/${encodedArtistName}/events`;
    
    console.log(`Fetching events for artist '${artistName}'...`);
    
    // Get events from today and next 2 years
    const today = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
    
    const response = await axios.get(apiEndpoint, { 
      params: { 
        app_id: apiKey,
        date: `${today.toISOString().split('T')[0]},${twoYearsFromNow.toISOString().split('T')[0]}`
      },
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Successfully retrieved ${response.data.length} events for ${artistName}`);
      return response.data;
    }
    
    console.log(`No events found for artist ${artistName}`);
    return [];
  } catch (error) {
    console.error(`Error fetching events for artist '${artistName}':`, error);
    return [];
  }
}

/**
 * Add artist to database if it doesn't exist
 */
async function addArtistToDatabase(artistData: BandsInTownArtist): Promise<number> {
  // Check if artist already exists
  const existingArtists = await db.select()
    .from(artists)
    .where(eq(artists.name, artistData.name))
    .limit(1);

  if (existingArtists.length > 0) {
    console.log(`Artist '${artistData.name}' already exists in database`);
    return existingArtists[0].id;
  }

  // Insert new artist
  console.log(`Adding artist '${artistData.name}' to database`);
  const newArtists = await db.insert(artists).values({
    name: artistData.name,
    bandsintownId: artistData.id,
    imageUrl: artistData.image_url,
    websiteUrl: artistData.url,
    genres: ['rock'], // Default to rock since Bandsintown doesn't provide genres
    popularity: artistData.tracker_count ? Math.min(100, Math.floor(artistData.tracker_count / 1000)) : 50
  }).returning();

  if (newArtists.length > 0) {
    console.log(`Added new artist: ${newArtists[0].name} (ID: ${newArtists[0].id})`);
    return newArtists[0].id;
  }

  throw new Error(`Failed to add artist ${artistData.name} to database`);
}

/**
 * Add venue to database if it doesn't exist
 */
async function addVenueToDatabase(venueData: BandsInTownVenue): Promise<number> {
  // Check if venue already exists
  const existingVenues = await db.select()
    .from(venues)
    .where(
      and(
        eq(venues.name, venueData.name),
        eq(venues.city, venueData.city)
      )
    )
    .limit(1);

  if (existingVenues.length > 0) {
    console.log(`Venue '${venueData.name}' in ${venueData.city} already exists in database`);
    return existingVenues[0].id;
  }

  // Sanitize and validate venue data
  const sanitizedName = (venueData.name || '').trim().substring(0, 100);
  const sanitizedCity = (venueData.city || '').trim().substring(0, 50);
  const sanitizedRegion = (venueData.region || '').trim().substring(0, 50);

  // Skip venues with missing required data
  if (!sanitizedName || !sanitizedCity) {
    throw new Error(`Invalid venue data: missing name or city`);
  }

  // Insert new venue
  console.log(`Adding venue '${sanitizedName}' in ${sanitizedCity} to database`);
  const newVenues = await db.insert(venues).values({
    name: sanitizedName,
    city: sanitizedCity,
    state: sanitizedRegion,
    country: (venueData.country || 'US').trim().substring(0, 2),
    latitude: venueData.latitude || null,
    longitude: venueData.longitude || null,
    capacity: Math.floor(Math.random() * 1000) + 100, // Random capacity since not provided
    address: `${sanitizedName}`,
    zipCode: `${Math.floor(Math.random() * 90000) + 10000}`, // Random ZIP since not provided
    description: `Music venue located in ${sanitizedCity}, ${sanitizedRegion}`.trim(),
    bandsintownId: venueData.id || null
  }).returning();

  if (newVenues.length > 0) {
    console.log(`Added new venue: ${newVenues[0].name} in ${newVenues[0].city} (ID: ${newVenues[0].id})`);
    return newVenues[0].id;
  }

  throw new Error(`Failed to add venue ${venueData.name} to database`);
}

/**
 * Add event to database if it doesn't exist
 */
async function addEventToDatabase(eventData: BandsInTownEvent, artistId: number, venueId: number): Promise<void> {
  // Parse datetime
  const eventDate = new Date(eventData.datetime);
  const dateString = eventDate.toISOString().split('T')[0];
  const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

  // Check if event already exists
  const existingEvents = await db.select()
    .from(events)
    .where(
      and(
        eq(events.artistId, artistId),
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

    console.log(`Updated existing event: ${eventData.artist?.name} at ${eventData.venue.name} on ${dateString}`);
    return;
  }

  // Create new event
  await db.insert(events).values({
    artistId,
    venueId,
    date: dateString,
    startTime: timeString,
    status: eventData.status || 'confirmed',
    ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
    sourceId: eventData.id,
    sourceName: 'bandsintown'
  });

  console.log(`Added new event: ${eventData.artist?.name} at ${eventData.venue.name} on ${dateString}`);
}

/**
 * Main function to seed venues from artists' events
 */
async function seedVenuesFromArtists() {
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY environment variable before running this script.');
      process.exit(1);
    }

    // Track statistics
    const stats = {
      artistsProcessed: 0,
      venuesAdded: 0,
      eventsAdded: 0,
      failedArtists: [] as string[]
    };

    // Set for tracking unique venues we've added
    const processedVenues = new Set<string>();

    // Process each artist
    for (const artistName of ARTISTS_TO_SEARCH) {
      try {
        console.log(`\nProcessing artist: ${artistName}`);
        
        // Fetch artist data
        const artistData = await fetchArtist(artistName);
        if (!artistData) {
          console.log(`Failed to fetch data for ${artistName}, skipping`);
          stats.failedArtists.push(artistName);
          continue;
        }
        
        // Add artist to database
        const artistId = await addArtistToDatabase(artistData);
        
        // Fetch artist events
        const events = await fetchArtistEvents(artistName);
        if (events.length === 0) {
          console.log(`No events found for ${artistName}, continuing to next artist`);
          stats.artistsProcessed++;
          continue;
        }
        
        // Process venues and events
        for (const event of events) {
          if (!event.venue) {
            console.log('Event missing venue data, skipping');
            continue;
          }
          
          try {
            // Create venue key for deduplication
            const venueKey = `${event.venue.name}:${event.venue.city}`;
            
            // Add venue to database
            const venueId = await addVenueToDatabase(event.venue);
            
            // Track if this is a new venue
            if (!processedVenues.has(venueKey)) {
              processedVenues.add(venueKey);
              stats.venuesAdded++;
            }
            
            // Add event to database
            await addEventToDatabase(event, artistId, venueId);
            stats.eventsAdded++;
          } catch (error) {
            console.error(`Error processing event:`, error);
          }
        }
        
        stats.artistsProcessed++;
        console.log(`Completed processing ${artistName}: found ${events.length} events`);
      } catch (error) {
        console.error(`Error processing artist ${artistName}:`, error);
        stats.failedArtists.push(artistName);
      }
    }

    // Print summary
    console.log('\n== Seeding Complete ==');
    console.log(`Artists processed: ${stats.artistsProcessed}/${ARTISTS_TO_SEARCH.length}`);
    console.log(`Venues added: ${stats.venuesAdded}`);
    console.log(`Events added: ${stats.eventsAdded}`);
    
    if (stats.failedArtists.length > 0) {
      console.log(`Failed artists: ${stats.failedArtists.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Unexpected error in seed process:', error);
    process.exit(1);
  }
}

// Run the script
seedVenuesFromArtists();