/**
 * Fetch artist events from Bandsintown API
 * This script fetches upcoming events for artists in our database
 */

import axios from 'axios';
import { db } from './db';
import { artists, events, venues, genres, artistGenres } from '../shared/schema';
import { eq, and, inArray, gt } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

// Bandsintown API base URL
const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID || 'venueconnect';
const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;
const BANDSINTOWN_BASE_URL = 'https://rest.bandsintown.com/artists';

// Venue matching threshold (0-1)
const VENUE_MATCH_THRESHOLD = 0.8;

interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  venue: {
    name: string;
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  lineup: string[];
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
}

/**
 * Fetch events for a specific artist from Bandsintown
 */
async function fetchArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
  try {
    // Encode the artist name for the URL
    const encodedArtistName = encodeURIComponent(artistName);
    const url = `${BANDSINTOWN_BASE_URL}/${encodedArtistName}/events`;
    
    let headers = {};
    if (BANDSINTOWN_API_KEY) {
      headers = {
        'Authorization': `Bearer ${BANDSINTOWN_API_KEY}`
      };
    }
    
    // Make the API request
    const response = await axios.get(url, {
      params: {
        app_id: BANDSINTOWN_APP_ID,
        date: 'upcoming'
      },
      headers
    });
    
    console.log(`Found ${response.data.length} events for artist ${artistName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching events for artist ${artistName}:`, error.response?.data || error.message);
    return [];
  }
}

/**
 * Normalize venue name for better matching
 */
function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/the /g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two venue names
 * @return Score between 0 and 1
 */
function getVenueNameSimilarity(name1: string, name2: string): number {
  const normalizedName1 = normalizeVenueName(name1);
  const normalizedName2 = normalizeVenueName(name2);
  
  // Exact match
  if (normalizedName1 === normalizedName2) {
    return 1;
  }
  
  // Check if one is a substring of the other
  if (normalizedName1.includes(normalizedName2) || normalizedName2.includes(normalizedName1)) {
    const lengthRatio = Math.min(normalizedName1.length, normalizedName2.length) / 
                         Math.max(normalizedName1.length, normalizedName2.length);
    return 0.8 * lengthRatio;
  }
  
  // Here we could implement Levenshtein distance or other string
  // similarity algorithms, but for now we'll use a simple approach
  
  // Count matching words
  const words1 = normalizedName1.split(' ');
  const words2 = normalizedName2.split(' ');
  
  const matchingWords = words1.filter(word => words2.includes(word)).length;
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  
  return matchingWords / totalUniqueWords;
}

/**
 * Find the best matching venue from our database
 */
async function findMatchingVenue(eventVenue: BandsintownEvent['venue']): Promise<number | null> {
  // Get all venues from our database
  const allVenues = await db.select().from(venues);
  
  let bestMatch = {
    id: null,
    score: 0
  };
  
  for (const venue of allVenues) {
    // Skip venues without names
    if (!venue.name) continue;
    
    // Calculate name similarity
    const nameSimilarity = getVenueNameSimilarity(eventVenue.name, venue.name);
    
    // Calculate location similarity if coordinates are available
    let locationSimilarity = 0;
    if (
      venue.latitude && 
      venue.longitude && 
      eventVenue.latitude && 
      eventVenue.longitude
    ) {
      // Calculate distance
      const venueLatLng = { lat: Number(venue.latitude), lng: Number(venue.longitude) };
      const eventLatLng = { lat: Number(eventVenue.latitude), lng: Number(eventVenue.longitude) };
      
      // Calculate distance in km using haversine formula
      const distance = calculateDistance(venueLatLng, eventLatLng);
      
      // Distance less than 0.5km is considered same venue
      if (distance < 0.5) {
        locationSimilarity = 1;
      } else if (distance < 2) {
        locationSimilarity = 0.8;
      } else if (distance < 5) {
        locationSimilarity = 0.5;
      }
    }
    
    // Calculate city/region match
    let regionSimilarity = 0;
    if (
      venue.city && 
      venue.region && 
      eventVenue.city && 
      eventVenue.region
    ) {
      if (
        normalizeVenueName(venue.city) === normalizeVenueName(eventVenue.city) &&
        normalizeVenueName(venue.region) === normalizeVenueName(eventVenue.region)
      ) {
        regionSimilarity = 1;
      } else if (normalizeVenueName(venue.city) === normalizeVenueName(eventVenue.city)) {
        regionSimilarity = 0.8;
      } else if (normalizeVenueName(venue.region) === normalizeVenueName(eventVenue.region)) {
        regionSimilarity = 0.3;
      }
    }
    
    // Calculate overall score (weighted)
    const score = (nameSimilarity * 0.6) + (locationSimilarity * 0.3) + (regionSimilarity * 0.1);
    
    // Update best match if this venue has a higher score
    if (score > bestMatch.score) {
      bestMatch = {
        id: venue.id,
        score
      };
    }
  }
  
  // Return the best match if it's above our threshold
  if (bestMatch.score >= VENUE_MATCH_THRESHOLD) {
    return bestMatch.id;
  }
  
  return null;
}

/**
 * Calculate distance between two points in km using the Haversine formula
 */
function calculateDistance(
  point1: { lat: number, lng: number }, 
  point2: { lat: number, lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Save an event to our database
 */
async function saveEvent(
  artistId: number, 
  event: BandsintownEvent, 
  venueId: number | null
): Promise<void> {
  try {
    // Format the event date
    const eventDate = new Date(event.datetime);
    
    // Check if this event already exists
    const existingEvent = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.artistId, artistId),
          eq(events.date, eventDate)
        )
      );
    
    if (existingEvent.length > 0) {
      console.log(`Event already exists for artist ${artistId} on ${eventDate}`);
      return;
    }
    
    // Only save events with matching venues
    if (!venueId) {
      console.log(`No matching venue found for event at ${event.venue.name}, skipping`);
      return;
    }
    
    // Insert the new event
    await db.insert(events).values({
      artistId,
      venueId,
      name: `${event.lineup[0]} at ${event.venue.name}`,
      date: eventDate,
      ticketLink: event.url,
      externalId: event.id
    });
    
    console.log(`Saved event for artist ${artistId} at venue ${venueId} on ${eventDate}`);
  } catch (error) {
    console.error('Error saving event:', error);
  }
}

/**
 * Sync events for a specific artist
 */
async function syncArtistEvents(artistId: number, artistName: string): Promise<void> {
  try {
    console.log(`Syncing events for artist ${artistName}`);
    
    // Fetch events from Bandsintown
    const artistEvents = await fetchArtistEvents(artistName);
    
    if (artistEvents.length === 0) {
      console.log(`No events found for artist ${artistName}`);
      return;
    }
    
    // Process each event
    for (const event of artistEvents) {
      // Find a matching venue in our database
      const matchingVenueId = await findMatchingVenue(event.venue);
      
      // Save the event if we have a matching venue
      if (matchingVenueId) {
        await saveEvent(artistId, event, matchingVenueId);
      }
    }
    
    console.log(`Completed sync for artist ${artistName}`);
  } catch (error) {
    console.error(`Error syncing artist ${artistName}:`, error);
  }
}

/**
 * Sync events for all artists in the database
 */
async function syncAllArtistEvents(): Promise<void> {
  try {
    console.log('Starting event sync from Bandsintown');
    
    // Get all artists from our database
    const dbArtists = await db.select().from(artists);
    console.log(`Found ${dbArtists.length} artists in database`);
    
    // Process each artist
    for (const artist of dbArtists) {
      await syncArtistEvents(artist.id, artist.name);
    }
    
    console.log('Event sync completed!');
  } catch (error) {
    console.error('Error syncing events:', error);
  }
}

/**
 * Sync events for specific artist names
 */
async function syncSpecificArtists(artistNames: string[]): Promise<void> {
  try {
    console.log(`Using provided artist names: ${artistNames.join(', ')}`);
    console.log('Starting Bandsintown artist and event sync...');
    
    for (const artistName of artistNames) {
      // Check if artist exists
      const existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.name, artistName));
      
      if (existingArtist.length > 0) {
        // Artist exists, sync events
        await syncArtistEvents(existingArtist[0].id, artistName);
      } else {
        console.log(`Artist ${artistName} not found in database, skipping`);
      }
    }
    
    console.log('Event sync completed!');
  } catch (error) {
    console.error('Error syncing events:', error);
  }
}

// Main execution
async function main() {
  // Get artist names from command line arguments, if any
  const artistNames = process.argv.slice(2);
  
  if (artistNames.length > 0) {
    await syncSpecificArtists(artistNames);
  } else {
    await syncAllArtistEvents();
  }
  
  // Exit
  process.exit(0);
}

main();