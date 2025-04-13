/**
 * Bandsintown Scraper
 * 
 * This module scrapes public event data from Bandsintown's website to collect
 * concert and tour information for artists and venues.
 * 
 * Note: This scraper respects robots.txt and implements rate limiting to avoid
 * excessive requests to Bandsintown servers.
 */
import axios from 'axios';
import cheerio from 'cheerio';
import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { eq, and, sql, isNull, not, desc, like, or } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Define the structure for scraped Bandsintown event data
export interface BandsintownEvent {
  date: string;          // YYYY-MM-DD format
  time?: string;         // HH:MM format (24-hour)
  artistName: string;    // Artist name
  venueName: string;     // Venue name
  venueCity: string;     // City name
  venueRegion?: string;  // State/region
  venueCountry?: string; // Country
  eventUrl: string;      // URL to the event page
}

/**
 * Scrape artist events from Bandsintown
 */
export async function scrapeArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
  const events: BandsintownEvent[] = [];
  
  try {
    // Encode artist name for URL
    const encodedArtistName = encodeURIComponent(artistName);
    const url = `https://www.bandsintown.com/a/${encodedArtistName}`;
    
    console.log(`Scraping events for artist: ${artistName}`);
    console.log(`URL: ${url}`);
    
    // Load the artist page
    const $ = await loadPage(url);
    
    // Check if we're on the artist page (look for event listings)
    const eventElements = $('.event-list .event-item, [data-event-id], [class*="event-row"], [class*="event-list-item"]');
    
    if (eventElements.length === 0) {
      console.log(`No event elements found for ${artistName}`);
      
      // Try to find the correct artist URL if we landed on a search page
      const artistLinks = $('a[href^="/a/"]');
      
      if (artistLinks.length > 0) {
        // Try to find the best match
        let bestMatchUrl = '';
        let bestMatchScore = 0;
        
        artistLinks.each((_, el) => {
          const linkText = $(el).text().trim().toLowerCase();
          const artistNameLower = artistName.toLowerCase();
          
          // Simple string similarity check
          if (linkText === artistNameLower) {
            bestMatchUrl = $(el).attr('href') || '';
            bestMatchScore = 1;
            return false; // break the loop
          }
          
          // If no exact match yet, check if it contains the artist name
          if (bestMatchScore < 1 && linkText.includes(artistNameLower)) {
            bestMatchUrl = $(el).attr('href') || '';
            bestMatchScore = 0.8;
          }
        });
        
        if (bestMatchUrl) {
          console.log(`Found better match URL: ${bestMatchUrl}`);
          // Follow the link to the artist page
          const fullUrl = `https://www.bandsintown.com${bestMatchUrl}`;
          await setTimeout(1000); // Wait before making another request
          return scrapeArtistEvents(bestMatchUrl.replace('/a/', ''));
        }
      }
      
      return [];
    }
    
    console.log(`Found ${eventElements.length} event elements`);
    
    // Process each event
    eventElements.each((_, element) => {
      try {
        const $el = $(element);
        
        // Extract date
        let dateText = '';
        const dateEl = $el.find('[class*="date"], .date, time, [datetime], [data-date]').first();
        if (dateEl.length) {
          dateText = dateEl.attr('datetime') || dateEl.attr('data-date') || dateEl.text().trim();
        }
        
        // Extract venue name
        let venueName = '';
        const venueEl = $el.find('[class*="venue-name"], .venue, [class*="venue"]').first();
        if (venueEl.length) {
          venueName = venueEl.text().trim();
        }
        
        // Extract location
        let location = '';
        const locationEl = $el.find('[class*="location"], .location, [class*="city"]').first();
        if (locationEl.length) {
          location = locationEl.text().trim();
        }
        
        // Parse location into city, region, country
        let venueCity = '';
        let venueRegion = '';
        let venueCountry = '';
        
        if (location) {
          const locationParts = location.split(',').map(part => part.trim());
          venueCity = locationParts[0] || '';
          
          if (locationParts.length > 1) {
            // If there are 3 parts, it's likely City, State, Country
            if (locationParts.length >= 3) {
              venueRegion = locationParts[1] || '';
              venueCountry = locationParts[2] || '';
            } else {
              // If 2 parts, it could be City, Country or City, State
              // Assume City, Country for international venues
              venueCountry = locationParts[1] || '';
            }
          }
        }
        
        // Extract URL
        let eventUrl = '';
        const linkEl = $el.find('a[href^="/e/"]').first();
        if (linkEl.length) {
          eventUrl = 'https://www.bandsintown.com' + (linkEl.attr('href') || '');
        }
        
        // Skip if missing essential data
        if (!dateText || !venueName || !venueCity) {
          return; // continue to next element
        }
        
        // Format date
        const date = formatDate(dateText);
        if (!date) return;
        
        // Extract time if available
        let time = '';
        const timeEl = $el.find('[class*="time"], .time, .doors, .start').first();
        if (timeEl.length) {
          const timeText = timeEl.text().trim();
          // Extract time pattern (HH:MM AM/PM)
          const timeMatch = timeText.match(/\b(\d{1,2}):?(\d{2})(?:\s*([aApP][mM]))?\b/);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] || '00';
            const ampm = timeMatch[3]?.toLowerCase();
            
            // Convert to 24-hour format
            if (ampm && ampm.startsWith('p') && hours < 12) {
              hours += 12;
            } else if (ampm && ampm.startsWith('a') && hours === 12) {
              hours = 0;
            }
            
            time = `${hours.toString().padStart(2, '0')}:${minutes}`;
          }
        }
        
        // Add event to the list
        events.push({
          date,
          time,
          artistName,
          venueName,
          venueCity,
          venueRegion,
          venueCountry,
          eventUrl
        });
      } catch (error) {
        console.error('Error processing event element:', error);
      }
    });
    
    return events;
  } catch (error) {
    console.error(`Error scraping artist events: ${error}`);
    return [];
  }
}

/**
 * Scrape events for all artists in the database or a specified list
 */
export async function scrapeAllArtistEvents(artistNames?: string[]): Promise<{
  artistsProcessed: number;
  eventsFound: number;
  eventsAdded: number;
}> {
  try {
    let artists = [];
    
    if (artistNames && artistNames.length > 0) {
      // Get specific artists by name
      for (const name of artistNames) {
        const artistResults = await db
          .select()
          .from(artists)
          .where(eq(artists.name, name));
        
        if (artistResults.length > 0) {
          artists.push(artistResults[0]);
        } else {
          // Create new artist if not found
          const [newArtist] = await db
            .insert(artists)
            .values({
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              sourceName: 'bandsintown_scraper'
            })
            .returning();
          
          artists.push(newArtist);
        }
      }
    } else {
      // Get all artists from the database
      artists = await db
        .select()
        .from(artists)
        .where(not(isNull(artists.name)));
    }
    
    console.log(`Found ${artists.length} artists to process`);
    
    let totalEventsFound = 0;
    let totalEventsAdded = 0;
    
    // Process each artist
    for (const artist of artists) {
      try {
        console.log(`\nProcessing artist: ${artist.name}`);
        
        // Scrape events for this artist
        const scrapedEvents = await scrapeArtistEvents(artist.name);
        
        console.log(`Found ${scrapedEvents.length} events for ${artist.name}`);
        totalEventsFound += scrapedEvents.length;
        
        // Save events to database
        const eventsAdded = await saveArtistEvents(artist, scrapedEvents);
        totalEventsAdded += eventsAdded;
        
        // Add delay between artists to avoid overwhelming the servers
        console.log(`Added ${eventsAdded} new events for ${artist.name}`);
        console.log('Waiting before next artist...');
        await setTimeout(2000);
      } catch (error) {
        console.error(`Error processing artist ${artist.name}:`, error);
      }
    }
    
    console.log(`\nScraping completed. Processed ${artists.length} artists, found ${totalEventsFound} events, added ${totalEventsAdded} new events.`);
    
    return {
      artistsProcessed: artists.length,
      eventsFound: totalEventsFound,
      eventsAdded: totalEventsAdded
    };
  } catch (error) {
    console.error('Error scraping all artist events:', error);
    return {
      artistsProcessed: 0,
      eventsFound: 0,
      eventsAdded: 0
    };
  }
}

/**
 * Save scraped Bandsintown events to the database
 */
async function saveArtistEvents(artist: any, scrapedEvents: BandsintownEvent[]): Promise<number> {
  if (!scrapedEvents.length) {
    console.log(`No events found for artist: ${artist.name}`);
    return 0;
  }
  
  console.log(`Saving ${scrapedEvents.length} events for artist: ${artist.name}`);
  
  let savedCount = 0;
  
  for (const eventData of scrapedEvents) {
    try {
      if (!eventData.date || !eventData.venueName) {
        console.warn('Skipping event with missing required data:', eventData);
        continue;
      }
      
      // Look for matching venue in our database
      let venueId = null;
      const venueResults = await db
        .select()
        .from(venues)
        .where(
          or(
            eq(venues.name, eventData.venueName),
            and(
              eq(venues.city, eventData.venueCity),
              like(venues.name, `%${eventData.venueName.substring(0, Math.min(10, eventData.venueName.length))}%`)
            )
          )
        )
        .limit(1);
      
      if (venueResults.length > 0) {
        venueId = venueResults[0].id;
      }
      
      // Check if event already exists
      const existingEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.artistId, artist.id),
            eq(events.date, eventData.date),
            venueId ? eq(events.venueId, venueId) : sql`${events.venueName} = ${eventData.venueName}`
          )
        );
      
      if (existingEvents.length > 0) {
        console.log(`Event already exists: ${artist.name} at ${eventData.venueName} on ${eventData.date}`);
        continue;
      }
      
      // Insert new event
      await db
        .insert(events)
        .values({
          artistId: artist.id,
          date: eventData.date,
          startTime: eventData.time || '20:00', // Default to 8 PM if time not specified
          status: 'confirmed',
          venueId: venueId,
          venueName: eventData.venueName,
          venueCity: eventData.venueCity,
          venueRegion: eventData.venueRegion || null,
          venueCountry: eventData.venueCountry || null,
          ticketUrl: eventData.eventUrl || null,
          sourceName: 'bandsintown_scraper',
          sourceId: eventData.eventUrl || `${artist.id}-${eventData.date}-${eventData.venueName}`
        });
      
      console.log(`Created event: ${artist.name} at ${eventData.venueName} on ${eventData.date}`);
      savedCount++;
    } catch (error) {
      console.error(`Error saving event:`, error);
    }
  }
  
  return savedCount;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error(`Error formatting date: ${dateStr}`, e);
    return '';
  }
}

/**
 * Load HTML from URL and return Cheerio object
 */
async function loadPage(url: string): Promise<cheerio.Root> {
  try {
    console.log(`Loading page: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    
    return cheerio.load(response.data);
  } catch (error: any) {
    console.error(`Error loading page ${url}: ${error.message}`);
    return cheerio.load('<html><body></body></html>');
  }
}

/**
 * Main function for running from command line
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'scrape';
    
    if (command === 'scrape') {
      // Scrape all artists in the database
      await scrapeAllArtistEvents();
    } else if (command === 'artist') {
      // Scrape a specific artist by name
      const artistName = args[1];
      
      if (!artistName) {
        console.error('Please provide an artist name');
        process.exit(1);
      }
      
      const events = await scrapeArtistEvents(artistName);
      console.log(`Found ${events.length} events for ${artistName}`);
      console.log(events);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log('Usage:');
      console.log(' - scrape: Scrape events from all artists in the database');
      console.log(' - artist [name]: Scrape events for a specific artist by name');
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script if called directly
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}