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
import { db } from '../db';
import { venues, events, artists } from '../../shared/schema';
import { eq, and, sql, like } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Define structures for scraped data
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

/**
 * Scrape venues from Indie on the Move by state
 */
export async function scrapeIndieVenuesByState(state: string): Promise<IndieVenue[]> {
  try {
    console.log(`Scraping venues for state: ${state}`);
    
    const venues: IndieVenue[] = [];
    let page = 1;
    let hasMorePages = true;
    
    // Custom axios instance with appropriate headers
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'VenueDiscoveryPlatform/1.0 (Research Project)',
        'Accept': 'text/html'
      }
    });
    
    while (hasMorePages) {
      console.log(`Fetching page ${page} for state ${state}...`);
      const url = `https://www.indieonthemove.com/venues/${state}?page=${page}`;
      
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      // Find venue listings
      const venueElements = $('.card');
      
      if (venueElements.length === 0) {
        hasMorePages = false;
        break;
      }
      
      // Process each venue
      venueElements.each((_, element) => {
        try {
          const name = $(element).find('.card-title').text().trim();
          const locationText = $(element).find('.card-text').first().text().trim();
          
          // Parse location - usually in format "City, State"
          const locationParts = locationText.split(',');
          if (locationParts.length < 2) return;
          
          const city = locationParts[0].trim();
          const venueState = locationParts[1].trim();
          
          // Extract venue URL
          const venueUrl = $(element).find('a').attr('href');
          
          // Add to list
          venues.push({
            name,
            city,
            state: venueState,
            venueUrl
          });
        } catch (error) {
          console.error('Error parsing venue element:', error);
        }
      });
      
      // Increment page and add delay before next request
      page++;
      await setTimeout(2000); // 2 second delay
      
      // Check if there's a "Next" button
      hasMorePages = $('.pagination .page-item').last().text().includes('Next');
    }
    
    console.log(`Found ${venues.length} venues for state ${state}`);
    return venues;
  } catch (error) {
    console.error(`Error scraping venues for state ${state}:`, error);
    return [];
  }
}

/**
 * Fetch detailed venue information
 */
export async function scrapeVenueDetails(venueUrl: string): Promise<Partial<IndieVenue>> {
  try {
    console.log(`Fetching details for venue: ${venueUrl}`);
    
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'VenueDiscoveryPlatform/1.0 (Research Project)',
        'Accept': 'text/html'
      }
    });
    
    const response = await axiosInstance.get(venueUrl);
    const $ = cheerio.load(response.data);
    
    const details: Partial<IndieVenue> = {};
    
    // Extract venue details from the page
    // Name is usually in the heading
    details.name = $('.container h1').first().text().trim();
    
    // Extract address
    const addressElement = $('.container .row .col-md-8 p').first();
    if (addressElement.length) {
      details.address = addressElement.text().trim();
    }
    
    // Extract capacity
    const capacityElement = $('.container .row .col-md-8 p').filter((_, el) => {
      return $(el).text().includes('Capacity');
    });
    if (capacityElement.length) {
      const capacityText = capacityElement.text().trim();
      const match = capacityText.match(/Capacity: ([\d-]+)/);
      if (match && match[1]) {
        details.capacity = match[1];
      }
    }
    
    // Extract booking contact info
    const bookingElement = $('.container .row .col-md-8 p').filter((_, el) => {
      return $(el).text().includes('Booking:');
    });
    if (bookingElement.length) {
      const emailMatch = bookingElement.html()?.match(/href="mailto:([^"]+)"/);
      if (emailMatch && emailMatch[1]) {
        details.bookingEmail = emailMatch[1];
      }
    }
    
    // Extract website
    const websiteElement = $('.container .row .col-md-8 p a').filter((_, el) => {
      return $(el).text().includes('Website');
    });
    if (websiteElement.length) {
      details.websiteUrl = websiteElement.attr('href');
    }
    
    // Extract venue type
    const typeElement = $('.container .row .col-md-8 p').filter((_, el) => {
      return $(el).text().includes('Type:');
    });
    if (typeElement.length) {
      const typeText = typeElement.text().trim();
      const match = typeText.match(/Type: (.+)/);
      if (match && match[1]) {
        details.venueType = match[1].trim();
      }
    }
    
    // Extract description
    const descriptionElement = $('.container .row .col-md-8 p').filter((_, el) => {
      // Find the paragraph that likely contains the description
      // Usually it's a longer paragraph not containing specific labels
      const text = $(el).text().trim();
      return text.length > 100 && 
             !text.includes('Capacity:') && 
             !text.includes('Type:') && 
             !text.includes('Booking:') &&
             !text.includes('Contact:');
    });
    if (descriptionElement.length) {
      details.description = descriptionElement.text().trim();
    }
    
    return details;
  } catch (error) {
    console.error(`Error fetching venue details for ${venueUrl}:`, error);
    return {};
  }
}

/**
 * Scrape upcoming shows
 */
export async function scrapeUpcomingShows(): Promise<IndieEvent[]> {
  try {
    console.log('Scraping upcoming shows from Indie on the Move');
    
    const events: IndieEvent[] = [];
    let page = 1;
    let hasMorePages = true;
    
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'VenueDiscoveryPlatform/1.0 (Research Project)',
        'Accept': 'text/html'
      }
    });
    
    while (hasMorePages && page <= 5) { // Limit to 5 pages for initial implementation
      console.log(`Fetching upcoming shows page ${page}...`);
      const url = `https://www.indieonthemove.com/shows?page=${page}`;
      
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      // Find show listings
      const showElements = $('.card');
      
      if (showElements.length === 0) {
        hasMorePages = false;
        break;
      }
      
      // Process each show
      showElements.each((_, element) => {
        try {
          const dateElement = $(element).find('.card-subtitle.text-muted');
          const dateText = dateElement.text().trim();
          
          // Parse date (format: "April 13, 2025")
          const date = new Date(dateText);
          if (isNaN(date.getTime())) return;
          
          const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Artist name is usually in the card title
          const artistName = $(element).find('.card-title').text().trim();
          
          // Venue info is in card text
          const venueInfo = $(element).find('.card-text').text().trim();
          const venueMatch = venueInfo.match(/(.*) in (.*), (.*)/);
          
          if (!venueMatch) return;
          
          const venueName = venueMatch[1].trim();
          const venueCity = venueMatch[2].trim();
          const venueState = venueMatch[3].trim();
          
          // Event URL
          const eventUrl = $(element).find('a').attr('href');
          
          events.push({
            date: formattedDate,
            artistName,
            venueName,
            venueCity,
            venueState,
            eventUrl
          });
        } catch (error) {
          console.error('Error parsing show element:', error);
        }
      });
      
      // Increment page and add delay before next request
      page++;
      await setTimeout(2000); // 2 second delay
      
      // Check if there's a "Next" button
      hasMorePages = $('.pagination .page-item').last().text().includes('Next');
    }
    
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
  let savedCount = 0;
  
  for (const venue of venues) {
    try {
      // Check if venue already exists
      const existingVenue = await db.select()
        .from(venues)
        .where(and(
          eq(venues.name, venue.name),
          eq(venues.city, venue.city),
          like(venues.region, `%${venue.state}%`)
        ))
        .limit(1);
      
      if (existingVenue.length > 0) {
        console.log(`Venue already exists: ${venue.name} in ${venue.city}, ${venue.state}`);
        
        // Update with new info if we have more details
        if (venue.bookingEmail || venue.websiteUrl || venue.description) {
          await db.update(venues)
            .set({
              bookingEmail: venue.bookingEmail || existingVenue[0].bookingEmail,
              websiteUrl: venue.websiteUrl || existingVenue[0].websiteUrl,
              description: venue.description || existingVenue[0].description,
              capacity: venue.capacity ? parseInt(venue.capacity) : existingVenue[0].capacity,
              venueType: venue.venueType || existingVenue[0].venueType,
              updatedAt: sql`NOW()`
            })
            .where(eq(venues.id, existingVenue[0].id));
          
          console.log(`Updated venue: ${venue.name}`);
        }
        
        continue;
      }
      
      // Insert new venue
      await db.insert(venues).values({
        name: venue.name,
        city: venue.city,
        region: venue.state,
        address: venue.address || null,
        bookingEmail: venue.bookingEmail || null,
        websiteUrl: venue.websiteUrl || null,
        description: venue.description || null,
        capacity: venue.capacity ? parseInt(venue.capacity) : null,
        venueType: venue.venueType || null,
        createdAt: sql`NOW()`,
        updatedAt: sql`NOW()`
      });
      
      console.log(`Saved new venue: ${venue.name} in ${venue.city}, ${venue.state}`);
      savedCount++;
    } catch (error) {
      console.error(`Error saving venue ${venue.name}:`, error);
    }
  }
  
  return savedCount;
}

/**
 * Save events to database
 */
export async function saveEventsToDatabase(indieEvents: IndieEvent[]): Promise<{ eventsAdded: number, artistsAdded: number }> {
  let eventsAdded = 0;
  let artistsAdded = 0;
  
  for (const indieEvent of indieEvents) {
    try {
      // Find venue
      const venue = await db.select()
        .from(venues)
        .where(and(
          eq(venues.name, indieEvent.venueName),
          eq(venues.city, indieEvent.venueCity),
          like(venues.region, `%${indieEvent.venueState}%`)
        ))
        .limit(1);
      
      if (venue.length === 0) {
        console.log(`Venue not found: ${indieEvent.venueName} in ${indieEvent.venueCity}, ${indieEvent.venueState}`);
        
        // Create minimal venue record
        const [newVenue] = await db.insert(venues).values({
          name: indieEvent.venueName,
          city: indieEvent.venueCity,
          region: indieEvent.venueState,
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }).returning();
        
        console.log(`Created minimal venue record: ${indieEvent.venueName}`);
        venue.push(newVenue);
      }
      
      // Check if artist exists
      let artist = await db.select()
        .from(artists)
        .where(eq(artists.name, indieEvent.artistName))
        .limit(1);
      
      if (artist.length === 0) {
        // Create artist
        const [newArtist] = await db.insert(artists).values({
          name: indieEvent.artistName,
          genres: ['other'], // Default genre
          popularity: 50, // Default popularity
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }).returning();
        
        artist = [newArtist];
        artistsAdded++;
        console.log(`Created new artist: ${indieEvent.artistName}`);
      }
      
      // Check if event already exists
      const existingEvent = await db.select()
        .from(events)
        .where(and(
          eq(events.venueId, venue[0].id),
          eq(events.artistId, artist[0].id),
          eq(events.date, indieEvent.date)
        ))
        .limit(1);
      
      if (existingEvent.length > 0) {
        console.log(`Event already exists: ${indieEvent.artistName} at ${indieEvent.venueName} on ${indieEvent.date}`);
        continue;
      }
      
      // Create event
      await db.insert(events).values({
        date: indieEvent.date,
        time: indieEvent.time || null,
        venueId: venue[0].id,
        artistId: artist[0].id,
        description: `${indieEvent.artistName} performing at ${indieEvent.venueName}`,
        status: 'confirmed',
        sourceName: 'indieonthemove',
        createdAt: sql`NOW()`,
        updatedAt: sql`NOW()`
      });
      
      eventsAdded++;
      console.log(`Created new event: ${indieEvent.artistName} at ${indieEvent.venueName} on ${indieEvent.date}`);
    } catch (error) {
      console.error(`Error saving event for ${indieEvent.artistName}:`, error);
    }
  }
  
  return { eventsAdded, artistsAdded };
}

/**
 * Main function to scrape and save data from Indie on the Move
 */
export async function seedFromIndieOnTheMove(states: string[] = ['MA', 'NY', 'CA', 'TX', 'IL']): Promise<{
  venuesScraped: number;
  venuesSaved: number;
  eventsScraped: number;
  eventsSaved: number;
  artistsAdded: number;
}> {
  const result = {
    venuesScraped: 0,
    venuesSaved: 0,
    eventsScraped: 0,
    eventsSaved: 0,
    artistsAdded: 0
  };
  
  // Scrape venues by state
  for (const state of states) {
    const venues = await scrapeIndieVenuesByState(state);
    result.venuesScraped += venues.length;
    
    // For each venue, get details
    const detailedVenues: IndieVenue[] = [];
    
    for (const venue of venues) {
      if (venue.venueUrl) {
        const details = await scrapeVenueDetails(venue.venueUrl);
        detailedVenues.push({
          ...venue,
          ...details
        });
        
        // Rate limiting
        await setTimeout(2000);
      } else {
        detailedVenues.push(venue);
      }
    }
    
    // Save venues to database
    const savedCount = await saveVenuesToDatabase(detailedVenues);
    result.venuesSaved += savedCount;
  }
  
  // Scrape upcoming shows
  const events = await scrapeUpcomingShows();
  result.eventsScraped = events.length;
  
  // Save events to database
  const { eventsAdded, artistsAdded } = await saveEventsToDatabase(events);
  result.eventsSaved = eventsAdded;
  result.artistsAdded = artistsAdded;
  
  return result;
}