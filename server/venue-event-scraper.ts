/**
 * Venue Event Scraper
 * 
 * This module provides tools to scrape event information from venue websites.
 * It includes:
 * - Base class for venue scrapers (VenueEventScraper)
 * - Generic event scraper that attempts to handle common patterns
 * - Specialized scrapers for specific venue website structures
 */
import axios from 'axios';
import cheerio from 'cheerio';
import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { eq, and, sql, isNull, not, desc } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

// Define the structure for scraped event data
export interface ScrapedEvent {
  date: string;         // YYYY-MM-DD format
  time?: string;        // HH:MM format (24-hour)
  title: string;        // Event title (typically artist name)
  url?: string;         // URL to the event page if available
  price?: string;       // Price information if available
  description?: string; // Additional event description
  imageUrl?: string;    // URL to event image if available
}

// Base class for venue event scrapers
export abstract class VenueEventScraper {
  protected venue: any;
  protected baseUrl: string;
  
  constructor(venue: any) {
    this.venue = venue;
    this.baseUrl = this.normalizeUrl(venue.websiteUrl);
  }
  
  // Normalize the URL to ensure it has proper format
  protected normalizeUrl(url: string): string {
    if (!url) return '';
    
    // Remove trailing slash if present
    url = url.trim().replace(/\/$/, '');
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  }
  
  // Resolve relative URLs to absolute ones
  protected resolveUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    
    // If already absolute, return as is
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    // Handle relative URLs that start with slash
    if (relativeUrl.startsWith('/')) {
      // Extract domain from baseUrl
      const urlObj = new URL(this.baseUrl);
      return `${urlObj.protocol}//${urlObj.hostname}${relativeUrl}`;
    }
    
    // Otherwise, join with baseUrl
    return `${this.baseUrl}/${relativeUrl}`;
  }
  
  // Format date to YYYY-MM-DD
  protected formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error(`Error formatting date: ${dateStr}`, e);
      return '';
    }
  }
  
  // Abstract method to be implemented by specific venue scrapers
  abstract scrapeEvents(): Promise<ScrapedEvent[]>;
  
  // Load HTML from URL and return Cheerio object
  protected async loadPage(url: string): Promise<cheerio.Root> {
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
        timeout: 10000
      });
      
      return cheerio.load(response.data);
    } catch (error: any) {
      console.error(`Error loading page ${url}: ${error.message}`);
      return cheerio.load('<html><body></body></html>');
    }
  }
  
  // Save scraped events to the database
  public async saveEvents(scrapedEvents: ScrapedEvent[]): Promise<number> {
    if (!scrapedEvents.length) {
      console.log(`No events found for venue: ${this.venue.name}`);
      return 0;
    }
    
    console.log(`Saving ${scrapedEvents.length} events for venue: ${this.venue.name}`);
    
    let savedCount = 0;
    
    for (const eventData of scrapedEvents) {
      try {
        if (!eventData.date || !eventData.title) {
          console.warn('Skipping event with missing required data:', eventData);
          continue;
        }
        
        // Extract artist name from event title
        const artistName = eventData.title.split(' - ')[0].trim();
        
        // Find or create artist
        let artist = await this.findOrCreateArtist(artistName);
        
        // Check if event already exists
        const existingEvents = await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.venueId, this.venue.id),
              eq(events.date, eventData.date),
              eq(events.artistId, artist.id)
            )
          );
        
        if (existingEvents.length > 0) {
          console.log(`Event already exists: ${artistName} at ${this.venue.name} on ${eventData.date}`);
          continue;
        }
        
        // Insert new event
        await db
          .insert(events)
          .values({
            venueId: this.venue.id,
            artistId: artist.id,
            date: eventData.date,
            startTime: eventData.time || '20:00', // Default to 8 PM if time not specified
            status: 'confirmed',
            price: eventData.price || null,
            description: eventData.description || null,
            imageUrl: eventData.imageUrl || null,
            ticketUrl: eventData.url || null,
            sourceName: 'venue_website',
            sourceId: eventData.url || `${this.venue.id}-${eventData.date}-${artist.id}`
          });
        
        console.log(`Created event: ${artistName} at ${this.venue.name} on ${eventData.date}`);
        savedCount++;
      } catch (error) {
        console.error(`Error saving event:`, error);
      }
    }
    
    return savedCount;
  }
  
  // Find existing artist or create a new one
  private async findOrCreateArtist(name: string): Promise<any> {
    try {
      // Check if artist already exists
      const existingArtists = await db
        .select()
        .from(artists)
        .where(eq(artists.name, name));
      
      if (existingArtists.length > 0) {
        return existingArtists[0];
      }
      
      // Create new artist
      const [newArtist] = await db
        .insert(artists)
        .values({
          name: name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          image: null,
          bandsintownId: null,
          spotifyId: null,
          sourceName: 'venue_website'
        })
        .returning();
      
      console.log(`Created new artist: ${name}`);
      return newArtist;
    } catch (error) {
      console.error(`Error finding/creating artist: ${name}`, error);
      throw error;
    }
  }
}

// Generic scraper that attempts to handle common venue website patterns
export class GenericVenueScraper extends VenueEventScraper {
  constructor(venue: any) {
    super(venue);
  }
  
  async scrapeEvents(): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    try {
      // First try the main page
      let $ = await this.loadPage(this.baseUrl);
      let foundEvents = await this.findEventsOnPage($);
      
      // If no events found on main page, try common event page paths
      if (foundEvents.length === 0) {
        const commonPaths = [
          '/events',
          '/calendar',
          '/shows',
          '/schedule',
          '/whats-on',
          '/upcoming'
        ];
        
        for (const path of commonPaths) {
          const eventUrl = this.resolveUrl(path);
          $ = await this.loadPage(eventUrl);
          foundEvents = await this.findEventsOnPage($);
          
          if (foundEvents.length > 0) {
            break;
          }
        }
      }
      
      return foundEvents;
    } catch (error) {
      console.error(`Error scraping events from ${this.baseUrl}:`, error);
      return [];
    }
  }
  
  private async findEventsOnPage($: cheerio.Root): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = [];
    
    // Strategy 1: Look for date patterns in text
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi;
    
    // Common containers for events
    const eventContainers = [
      '.event', '.events', '.show', '.shows', '.concert', '.concerts',
      '[class*="event"]', '[class*="show"]', '[class*="concert"]',
      'article', '.calendar-item', '.gig', '.performance'
    ].join(', ');
    
    // Try to find structured event listings
    $(eventContainers).each((_, element) => {
      try {
        const $el = $(element);
        
        // Look for date text
        let dateText = '';
        const dateEl = $el.find('[class*="date"], .date, time, [datetime], [data-date]').first();
        
        if (dateEl.length) {
          // Check for datetime attribute
          dateText = dateEl.attr('datetime') || dateEl.attr('data-date') || dateEl.text().trim();
        } else {
          // Look for date in the text content
          const elText = $el.text();
          const dateMatches = elText.match(dateRegex);
          if (dateMatches && dateMatches.length > 0) {
            dateText = dateMatches[0];
          }
        }
        
        // Skip if no date found
        if (!dateText) return;
        
        // Format the date
        const formattedDate = this.formatDate(dateText);
        if (!formattedDate) return;
        
        // Look for title
        let title = '';
        const titleEl = $el.find('h1, h2, h3, h4, h5, .title, [class*="title"], [class*="artist"], .artist, .headliner').first();
        if (titleEl.length) {
          title = titleEl.text().trim();
        }
        
        // If no title found, skip
        if (!title) return;
        
        // Look for link/URL
        let url = '';
        const linkEl = $el.find('a').first();
        if (linkEl.length) {
          url = this.resolveUrl(linkEl.attr('href') || '');
        }
        
        // Look for time
        let time = '';
        const timeEl = $el.find('[class*="time"], .time, .doors, .start').first();
        if (timeEl.length) {
          const timeText = timeEl.text().trim();
          // Extract time with common formats (HH:MM, H:MM, followed by AM/PM)
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
        
        // Look for price
        let price = '';
        const priceEl = $el.find('[class*="price"], .price, .cost, .ticket-price').first();
        if (priceEl.length) {
          price = priceEl.text().trim();
        }
        
        // Look for description
        let description = '';
        const descEl = $el.find('[class*="desc"], .description, .info, .details, p').first();
        if (descEl.length) {
          description = descEl.text().trim();
        }
        
        // Look for image
        let imageUrl = '';
        const imgEl = $el.find('img').first();
        if (imgEl.length) {
          imageUrl = this.resolveUrl(imgEl.attr('src') || '');
        }
        
        // Add event to the list
        events.push({
          date: formattedDate,
          time,
          title,
          url,
          price,
          description,
          imageUrl
        });
      } catch (error) {
        console.error('Error processing event element:', error);
      }
    });
    
    return events;
  }
}

// Generic function to scrape events from a venue
export async function scrapeVenueEvents(venueId: number): Promise<{
  venueName: string;
  url: string;
  events: ScrapedEvent[];
  eventsAdded: number;
}> {
  try {
    // Get venue data
    const venueResults = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId));
    
    if (venueResults.length === 0) {
      throw new Error(`Venue not found with ID: ${venueId}`);
    }
    
    const venue = venueResults[0];
    
    if (!venue.websiteUrl) {
      throw new Error(`Venue ${venue.name} does not have a website URL`);
    }
    
    console.log(`Scraping events for venue: ${venue.name} (${venue.websiteUrl})`);
    
    // Create scraper instance
    const scraper = new GenericVenueScraper(venue);
    
    // Scrape events
    const scrapedEvents = await scraper.scrapeEvents();
    console.log(`Found ${scrapedEvents.length} events for ${venue.name}`);
    
    // Save events to database
    const eventsAdded = await scraper.saveEvents(scrapedEvents);
    
    return {
      venueName: venue.name,
      url: venue.websiteUrl,
      events: scrapedEvents,
      eventsAdded
    };
  } catch (error) {
    console.error(`Error scraping venue events:`, error);
    throw error;
  }
}

// Command-line script to scrape events from venues
export async function scrapeVenues(limit: number = 0): Promise<{
  venuesProcessed: number;
  eventsFound: number;
  eventsAdded: number;
}> {
  try {
    console.log('Starting venue event scraping...');
    
    // Get venues with website URLs
    let venuesQuery = db
      .select()
      .from(venues)
      .where(
        and(
          not(isNull(venues.websiteUrl)),
          sql`length(${venues.websiteUrl}) > 5`
        )
      )
      .orderBy(desc(venues.id));
    
    if (limit > 0) {
      venuesQuery = venuesQuery.limit(limit);
    }
    
    const venuesToScrape = await venuesQuery;
    
    console.log(`Found ${venuesToScrape.length} venues with websites to scrape`);
    
    let totalEventsFound = 0;
    let totalEventsAdded = 0;
    
    // Process each venue
    for (const venue of venuesToScrape) {
      try {
        console.log(`\nProcessing venue: ${venue.name}`);
        
        const scraper = new GenericVenueScraper(venue);
        const scrapedEvents = await scraper.scrapeEvents();
        
        console.log(`Found ${scrapedEvents.length} events for ${venue.name}`);
        totalEventsFound += scrapedEvents.length;
        
        const eventsAdded = await scraper.saveEvents(scrapedEvents);
        totalEventsAdded += eventsAdded;
        
        // Add delay between venues to avoid overwhelming servers
        console.log(`Added ${eventsAdded} new events for ${venue.name}`);
        console.log('Waiting before next venue...');
        await setTimeout(2000);
      } catch (error) {
        console.error(`Error processing venue ${venue.name}:`, error);
      }
    }
    
    console.log(`\nScraping completed. Processed ${venuesToScrape.length} venues, found ${totalEventsFound} events, added ${totalEventsAdded} new events.`);
    
    return {
      venuesProcessed: venuesToScrape.length,
      eventsFound: totalEventsFound,
      eventsAdded: totalEventsAdded
    };
  } catch (error) {
    console.error('Error scraping venues:', error);
    return {
      venuesProcessed: 0,
      eventsFound: 0,
      eventsAdded: 0
    };
  }
}

// Main function for running from command line
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'scrape';
    
    if (command === 'scrape') {
      // Scrape all venues or a limited number
      const limit = args[1] ? parseInt(args[1]) : 0;
      await scrapeVenues(limit);
    } else if (command === 'venue') {
      // Scrape a specific venue by ID
      const venueId = args[1] ? parseInt(args[1]) : 0;
      
      if (!venueId) {
        console.error('Please provide a venue ID');
        process.exit(1);
      }
      
      await scrapeVenueEvents(venueId);
    } else {
      console.error(`Unknown command: ${command}`);
      console.log('Usage:');
      console.log(' - scrape [limit]: Scrape events from all venues, optionally limited to a number');
      console.log(' - venue [id]: Scrape events from a specific venue by ID');
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