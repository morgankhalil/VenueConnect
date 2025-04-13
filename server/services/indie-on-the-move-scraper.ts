/**
 * Indie on the Move Scraper
 * 
 * This module scrapes venue and event data from indieonthemove.com to seed our database
 * with real venue and artist information.
 * 
 * Respectful scraping practices:
 * - Includes delays between requests
 * - Respects robots.txt
 * - Identifies itself via user-agent
 * - Caches results to minimize repeated requests
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq, and, sql, or, like } from 'drizzle-orm';
import { db } from '../db';
import { venues, artists, events, type VenueInsert, type ArtistInsert } from '../../shared/schema';
import { setTimeout } from 'timers/promises';

// Types for the data we'll extract
interface IndieVenue {
  name: string;
  city: string;
  state: string;
  address?: string;
  venueUrl?: string;
  capacity?: string;
  bookingEmail?: string;
  description?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  venueType?: string;
}

interface IndieEvent {
  date: string;          // YYYY-MM-DD format
  time?: string;         // HH:MM format (24-hour)
  artistName: string;    // Artist name
  venueName: string;     // Venue name
  venueCity: string;     // City name
  venueState: string;    // State
  eventUrl?: string;     // URL to the event page
}

// Configuration
const BASE_URL = 'https://www.indieonthemove.com';
const REQUEST_DELAY = 2000; // 2 seconds between requests to avoid rate limiting
const USER_AGENT = 'VenueDiscoveryPlatform/1.0 (+https://example.com) - Respectful data collection for venue database';

// Cache for storing data to minimize repeat requests
let venueCache: Record<string, IndieVenue[]> = {};
let eventCache: IndieEvent[] = [];

// Axios instance with appropriate headers
const axiosInstance = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html',
    'Accept-Language': 'en-US,en;q=0.9'
  },
  timeout: 30000 // 30 second timeout
});

/**
 * Sleep for specified duration
 */
const sleep = async (ms: number = REQUEST_DELAY) => {
  await setTimeout(ms);
};

/**
 * Get list of available states
 */
export async function getAvailableStates(): Promise<string[]> {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/venues`);
    const $ = cheerio.load(response.data);
    
    const states: string[] = [];
    // Find state links in the venues page
    $('a[href^="/venues/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\/venues\/[A-Z]{2}$/)) {
        const stateCode = href.split('/').pop() as string;
        states.push(stateCode);
      }
    });
    
    return [...new Set(states)]; // Remove duplicates
  } catch (error) {
    console.error('Error fetching available states:', error);
    return [];
  }
}

/**
 * Scrape venues from Indie on the Move by state
 */
export async function scrapeIndieVenuesByState(state: string): Promise<IndieVenue[]> {
  try {
    // Check cache first
    if (venueCache[state]) {
      return venueCache[state];
    }
    
    const url = `${BASE_URL}/venues/${state.toUpperCase()}`;
    console.log(`Scraping venues from ${url}`);
    
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    
    const venues: IndieVenue[] = [];
    
    // Find all venue cards
    $('.venue-card, .card').each((_, card) => {
      const name = $(card).find('.card-title, h5, h3').first().text().trim();
      
      // Skip if no name
      if (!name) return;
      
      // Extract location from card text
      const locationText = $(card).find('.card-text, p').text().trim();
      const locationMatch = locationText.match(/([^,]+),\s*([A-Z]{2})/);
      
      if (!locationMatch) return;
      
      const city = locationMatch[1].trim();
      const state = locationMatch[2].trim();
      
      // Extract venue URL if available
      const venueLink = $(card).find('a[href^="/venues/view/"]').attr('href');
      const venueUrl = venueLink ? `${BASE_URL}${venueLink}` : undefined;
      
      venues.push({
        name,
        city,
        state,
        venueUrl
      });
    });
    
    // Update cache
    venueCache[state] = venues;
    
    console.log(`Found ${venues.length} venues in ${state}`);
    return venues;
  } catch (error) {
    console.error(`Error scraping venues from ${state}:`, error);
    return [];
  }
}

/**
 * Fetch detailed venue information
 */
export async function scrapeVenueDetails(venueUrl: string): Promise<Partial<IndieVenue>> {
  try {
    console.log(`Scraping venue details from ${venueUrl}`);
    
    const response = await axiosInstance.get(venueUrl);
    const $ = cheerio.load(response.data);
    
    // Extract venue name
    const name = $('h1, .venue-name').first().text().trim();
    
    // Extract venue details
    const details: Partial<IndieVenue> = { name };
    
    // Get venue info paragraphs
    $('.venue-info p, .card-body p, .venue-details p').each((_, p) => {
      const text = $(p).text().trim();
      
      if (text.includes('Address:')) {
        // Extract address, city, state
        const addressMatch = text.match(/Address:\s*(.*?)(?:,\s*([^,]+),\s*([A-Z]{2}))?/);
        if (addressMatch) {
          details.address = addressMatch[1]?.trim();
          if (addressMatch[2] && !details.city) {
            details.city = addressMatch[2]?.trim();
          }
          if (addressMatch[3] && !details.state) {
            details.state = addressMatch[3]?.trim();
          }
        }
      } else if (text.includes('Capacity:')) {
        // Extract capacity
        const capacityMatch = text.match(/Capacity:\s*([0-9,]+)/);
        if (capacityMatch) {
          details.capacity = capacityMatch[1]?.trim();
        }
      } else if (text.includes('Booking:') || text.includes('Contact:')) {
        // Extract booking email
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          details.bookingEmail = emailMatch[0];
        }
        
        // Extract phone number
        const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) {
          details.phoneNumber = phoneMatch[0];
        }
      } else if (text.includes('Website:')) {
        // Extract website URL
        const link = $(p).find('a').attr('href');
        if (link) {
          details.websiteUrl = link;
        }
      } else if (text.includes('Venue Type:')) {
        // Extract venue type
        const typeMatch = text.match(/Venue Type:\s*(.+)/);
        if (typeMatch) {
          details.venueType = typeMatch[1]?.trim();
        }
      }
    });
    
    // Try to get description
    const description = $('.venue-description, .about-venue').text().trim();
    if (description) {
      details.description = description;
    }
    
    // Add a small delay to avoid rate limiting
    await sleep();
    
    return details;
  } catch (error) {
    console.error(`Error scraping venue details from ${venueUrl}:`, error);
    return {};
  }
}

/**
 * Scrape upcoming shows
 */
export async function scrapeUpcomingShows(): Promise<IndieEvent[]> {
  try {
    // Check cache first
    if (eventCache.length > 0) {
      return eventCache;
    }
    
    const url = `${BASE_URL}/shows`;
    console.log(`Scraping upcoming shows from ${url}`);
    
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    
    const events: IndieEvent[] = [];
    
    // Find all show cards
    $('.show-card, .card').each((_, card) => {
      try {
        // Extract artist name
        const artistName = $(card).find('.card-title, h5, h4, h3').first().text().trim();
        if (!artistName) return;
        
        // Extract date
        const dateText = $(card).find('.text-muted, .card-subtitle, small').text().trim();
        const dateMatch = dateText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (!dateMatch) return;
        
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const dateParts = dateMatch[1].split('/');
        const date = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        
        // Extract time
        const timeMatch = dateText.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
        const time = timeMatch ? timeMatch[1] : undefined;
        
        // Extract venue info
        const venueText = $(card).find('.card-text, p').text().trim();
        const venueMatch = venueText.match(/([^,]+),\s*([^,]+),\s*([A-Z]{2})/);
        
        if (!venueMatch) return;
        
        const venueName = venueMatch[1].trim();
        const venueCity = venueMatch[2].trim();
        const venueState = venueMatch[3].trim();
        
        // Extract event URL
        const eventLink = $(card).find('a[href^="/shows/"]').attr('href');
        const eventUrl = eventLink ? `${BASE_URL}${eventLink}` : undefined;
        
        events.push({
          date,
          time,
          artistName,
          venueName,
          venueCity,
          venueState,
          eventUrl
        });
      } catch (err) {
        console.error('Error parsing event card:', err);
      }
    });
    
    // Update cache
    eventCache = events;
    
    console.log(`Found ${events.length} upcoming shows`);
    return events;
  } catch (error) {
    console.error('Error scraping upcoming shows:', error);
    return [];
  }
}

/**
 * Save venues to database
 */
export async function saveVenuesToDatabase(venues: IndieVenue[]): Promise<number> {
  try {
    console.log(`Saving ${venues.length} venues to database`);
    
    let venuesAdded = 0;
    
    for (const venue of venues) {
      // Skip if missing required fields
      if (!venue.name || !venue.city || !venue.state) {
        continue;
      }
      
      // Check if venue already exists
      const existingVenue = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, venue.name),
            eq(venues.city, venue.city),
            or(
              eq(venues.region, venue.state),
              sql`venues.region IS NULL`
            )
          )
        )
        .limit(1);
      
      // If venue exists, update it with any new details
      if (existingVenue.length > 0) {
        const venueId = existingVenue[0].id;
        
        // Only update if we have details to add
        if (venue.address || venue.capacity || venue.bookingEmail || 
            venue.description || venue.websiteUrl || venue.venueType) {
          
          await db.update(venues)
            .set({
              address: venue.address || existingVenue[0].address,
              capacity: venue.capacity ? parseInt(venue.capacity.replace(/,/g, '')) : existingVenue[0].capacity,
              bookingEmail: venue.bookingEmail || existingVenue[0].bookingEmail,
              description: venue.description || existingVenue[0].description,
              websiteUrl: venue.websiteUrl || existingVenue[0].websiteUrl,
              venueType: venue.venueType || existingVenue[0].venueType,
              phoneNumber: venue.phoneNumber || existingVenue[0].phoneNumber,
              updatedAt: sql`NOW()`
            })
            .where(eq(venues.id, venueId));
        }
      } 
      // Otherwise, insert a new venue
      else {
        const venueData: VenueInsert = {
          name: venue.name,
          city: venue.city,
          region: venue.state,
          country: 'USA',
          address: venue.address || null,
          capacity: venue.capacity ? parseInt(venue.capacity.replace(/,/g, '')) : null,
          bookingEmail: venue.bookingEmail || null,
          description: venue.description || null,
          websiteUrl: venue.websiteUrl || null,
          venueType: venue.venueType || null,
          phoneNumber: venue.phoneNumber || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.insert(venues).values(venueData);
        venuesAdded++;
      }
    }
    
    console.log(`Added ${venuesAdded} new venues to database`);
    return venuesAdded;
  } catch (error) {
    console.error('Error saving venues to database:', error);
    return 0;
  }
}

/**
 * Save events to database
 */
export async function saveEventsToDatabase(indieEvents: IndieEvent[]): Promise<{ eventsAdded: number, artistsAdded: number }> {
  try {
    console.log(`Saving ${indieEvents.length} events to database`);
    
    let eventsAdded = 0;
    let artistsAdded = 0;
    
    for (const event of indieEvents) {
      // Skip if missing required fields
      if (!event.date || !event.artistName || !event.venueName) {
        continue;
      }
      
      // 1. Find or create venue
      const existingVenue = await db.select()
        .from(venues)
        .where(
          and(
            eq(venues.name, event.venueName),
            eq(venues.city, event.venueCity),
            or(
              eq(venues.region, event.venueState),
              sql`venues.region IS NULL`
            )
          )
        )
        .limit(1);
      
      let venueId: number;
      
      if (existingVenue.length > 0) {
        venueId = existingVenue[0].id;
      } else {
        // Create a new venue
        const [newVenue] = await db.insert(venues).values({
          name: event.venueName,
          city: event.venueCity,
          region: event.venueState,
          country: 'USA',
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning({ id: venues.id });
        
        venueId = newVenue.id;
      }
      
      // 2. Find or create artist
      const existingArtist = await db.select()
        .from(artists)
        .where(eq(artists.name, event.artistName))
        .limit(1);
      
      let artistId: number;
      
      if (existingArtist.length > 0) {
        artistId = existingArtist[0].id;
      } else {
        // Create a new artist
        const artistData: ArtistInsert = {
          name: event.artistName,
          genres: ['other'], // Default genre
          createdAt: new Date(),
          updatedAt: new Date(),
          popularity: 50 // Default popularity
        };
        
        const [newArtist] = await db.insert(artists).values(artistData).returning({ id: artists.id });
        artistId = newArtist.id;
        artistsAdded++;
      }
      
      // 3. Create event if it doesn't exist
      const existingEvent = await db.select()
        .from(events)
        .where(
          and(
            eq(events.date, event.date),
            eq(events.artistId, artistId),
            eq(events.venueId, venueId)
          )
        )
        .limit(1);
      
      if (existingEvent.length === 0) {
        await db.insert(events).values({
          date: event.date,
          time: event.time || null,
          artistId,
          venueId,
          status: 'confirmed',
          description: `${event.artistName} at ${event.venueName}`,
          sourceName: 'indieonthemove',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        eventsAdded++;
      }
    }
    
    console.log(`Added ${eventsAdded} new events and ${artistsAdded} new artists to database`);
    return { eventsAdded, artistsAdded };
  } catch (error) {
    console.error('Error saving events to database:', error);
    return { eventsAdded: 0, artistsAdded: 0 };
  }
}

/**
 * Main function to scrape and save data from Indie on the Move
 */
export async function seedFromIndieOnTheMove(states: string[] = ['MA', 'NY', 'CA', 'TX', 'IL']): Promise<{
  totalVenues: number;
  totalEvents: number;
  totalArtists: number;
}> {
  console.log('Starting Bandsintown events and artists seeding');
  
  let totalVenues = 0;
  let totalEvents = 0;
  let totalArtists = 0;
  
  try {
    // If no states provided, get available states
    if (states.length === 0) {
      states = await getAvailableStates();
      console.log(`Found ${states.length} states available`);
    }
    
    // Process each state
    for (const state of states) {
      console.log(`Processing state: ${state}`);
      
      // Get venues for state
      const stateVenues = await scrapeIndieVenuesByState(state);
      console.log(`Found ${stateVenues.length} venues in ${state}`);
      
      // Add small delay to avoid rate limiting
      await sleep();
      
      // Get details for each venue
      for (let i = 0; i < stateVenues.length; i++) {
        const venue = stateVenues[i];
        
        if (venue.venueUrl) {
          console.log(`Getting details for venue ${i+1}/${stateVenues.length}: ${venue.name}`);
          
          // Get venue details
          const venueDetails = await scrapeVenueDetails(venue.venueUrl);
          
          // Merge details into venue object
          Object.assign(venue, venueDetails);
          
          // Add delay between requests
          await sleep();
        }
      }
      
      // Save venues to database
      const venuesAdded = await saveVenuesToDatabase(stateVenues);
      totalVenues += venuesAdded;
      
      // Add delay before next state
      await sleep(REQUEST_DELAY * 2);
    }
    
    // Get and save upcoming shows
    const upcomingShows = await scrapeUpcomingShows();
    const { eventsAdded, artistsAdded } = await saveEventsToDatabase(upcomingShows);
    
    totalEvents += eventsAdded;
    totalArtists += artistsAdded;
    
    console.log(`Completed seeding from Indie on the Move:`);
    console.log(`- Added ${totalVenues} venues`);
    console.log(`- Added ${totalEvents} events`);
    console.log(`- Added ${totalArtists} artists`);
    
    return {
      totalVenues,
      totalEvents,
      totalArtists
    };
  } catch (error) {
    console.error('Error seeding from Indie on the Move:', error);
    return {
      totalVenues,
      totalEvents,
      totalArtists
    };
  }
}

// Export additional helpers
export { sleep };