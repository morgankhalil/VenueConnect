/**
 * Test script for Bandsintown scraper
 * 
 * This script tests the ability to scrape event information from Bandsintown's website
 * for a specific artist.
 * 
 * Usage:
 *   npx tsx server/test-bandsintown-scraper.ts "Artist Name"
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { setTimeout } from 'timers/promises';

// Define the structure for scraped Bandsintown event data
interface BandsintownEvent {
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
async function scrapeArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
  const events: BandsintownEvent[] = [];
  
  try {
    // Bandsintown now uses numeric IDs in URLs for some artists
    // For popular artists like Coldplay, they might use a specific ID format
    // First try with the artistName directly
    const encodedArtistName = encodeURIComponent(artistName);
    let url = `https://www.bandsintown.com/a/${encodedArtistName}`;
    
    // For Coldplay specifically, we know they might use this ID
    if (artistName.toLowerCase() === 'coldplay') {
      url = 'https://www.bandsintown.com/a/170';
    }
    
    console.log(`Scraping events for artist: ${artistName}`);
    console.log(`URL: ${url}`);
    
    // Load the artist page
    const $ = await loadPage(url);
    
    // Get page title to verify we're on the right page
    const pageTitle = $('title').text();
    console.log(`Page title: ${pageTitle}`);
    
    // Check if we're on the artist page (look for event listings)
    const eventElements = $('.event-list .event-item, [data-event-id], [class*="event-row"], [class*="event-list-item"], .bit-events-container .bit-event');
    
    console.log(`Found ${eventElements.length} event elements using first selector`);
    
    if (eventElements.length === 0) {
      // Try alternative selectors for events
      console.log('Trying alternative selectors...');
      
      // Look for common event container patterns
      const alternativeSelectors = [
        '[data-testid="event-list"] > div', // Recent BIT design
        '[data-testid="eventItem"]',        // Another BIT pattern
        '.events-list .event',              // Common pattern
        '.events-container .event-row',     // Another common pattern
        'div[class*="EventItem"]',          // React component naming pattern
        'div[class*="event-item"]',         // Common class naming
        'div[class*="tour-date"]',          // Tour date listings
        'div[class*="show-listing"]',       // Show listings
        'table tr[data-event-id]'           // Table-based layouts
      ];
      
      for (const selector of alternativeSelectors) {
        const elements = $(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);
        
        if (elements.length > 0) {
          // Process these elements
          processEventElements($, elements, artistName, events);
          break;
        }
      }
      
      // If still no events, try to find the correct artist URL if we landed on a search page
      if (events.length === 0) {
        console.log('Looking for artist links on search page...');
        const artistLinks = $('a[href^="/a/"]');
        
        if (artistLinks.length > 0) {
          console.log(`Found ${artistLinks.length} artist links`);
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
      }
    } else {
      // Process event elements we found with the first selector
      processEventElements($, eventElements, artistName, events);
    }
    
    // If still no events found, try to extract from the HTML directly
    if (events.length === 0) {
      console.log('No events found with selectors, trying to extract from script tags...');
      
      // Try to find event data in script tags (sometimes it's in JSON format)
      const scriptTags = $('script').filter((_, el) => {
        const content = $(el).html() || '';
        return content.includes('event') && content.includes('venue') && content.includes('date');
      });
      
      console.log(`Found ${scriptTags.length} potential script tags with event data`);
      
      scriptTags.each((_, el) => {
        try {
          const content = $(el).html() || '';
          
          // Try to extract JSON objects from the script content
          const jsonMatch = content.match(/(\{.*\})/g);
          if (jsonMatch) {
            for (const match of jsonMatch) {
              try {
                const data = JSON.parse(match);
                
                if (data.events || data.upcomingEvents || data.upcoming_events) {
                  const eventList = data.events || data.upcomingEvents || data.upcoming_events;
                  console.log(`Found JSON data with ${eventList.length} events`);
                  
                  // Process event data from JSON
                  for (const event of eventList) {
                    if (event.date || event.datetime || event.eventDate) {
                      const date = formatDate(event.date || event.datetime || event.eventDate);
                      
                      if (!date) continue;
                      
                      const venueName = event.venue?.name || event.venueName || '';
                      const venueCity = event.venue?.city || event.city || '';
                      
                      if (!venueName || !venueCity) continue;
                      
                      events.push({
                        date,
                        time: event.time || event.startTime || '',
                        artistName,
                        venueName,
                        venueCity,
                        venueRegion: event.venue?.region || event.region || '',
                        venueCountry: event.venue?.country || event.country || '',
                        eventUrl: event.url || ''
                      });
                    }
                  }
                }
              } catch (e) {
                // Ignore JSON parsing errors
              }
            }
          }
        } catch (e) {
          console.error('Error processing script tag:', e);
        }
      });
    }
    
    console.log(`\nFound ${events.length} events in total for ${artistName}`);
    return events;
  } catch (error) {
    console.error(`Error scraping artist events: ${error}`);
    return [];
  }
}

/**
 * Process event elements from cheerio selection
 */
function processEventElements($: cheerio.CheerioAPI, elements: cheerio.Cheerio, artistName: string, events: BandsintownEvent[]): void {
  elements.each((_, element) => {
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
      
      // Dump the element text for debugging
      console.log(`\nEvent element text: ${$el.text().trim().substring(0, 100)}...`);
      
      if (dateText) console.log(`Date text: ${dateText}`);
      if (venueName) console.log(`Venue name: ${venueName}`);
      if (location) console.log(`Location: ${location}`);
      
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
        console.log('Skipping event due to missing essential data');
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
      
      console.log(`Added event: ${date} at ${venueName} in ${venueCity}`);
    } catch (error) {
      console.error('Error processing event element:', error);
    }
  });
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
async function loadPage(url: string): Promise<cheerio.CheerioAPI> {
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
 * Main function
 */
async function main() {
  try {
    // Get artist name from command line arguments
    const artistName = process.argv[2];
    
    if (!artistName) {
      console.error('Please provide an artist name');
      console.log('Usage: npx tsx server/test-bandsintown-scraper.ts "Artist Name"');
      process.exit(1);
    }
    
    // Scrape events for the artist
    const events = await scrapeArtistEvents(artistName);
    
    // Display results
    console.log('\n=== RESULTS ===');
    console.log(`Found ${events.length} events for ${artistName}`);
    
    if (events.length > 0) {
      console.log('\nEvent Details:');
      events.forEach((event, index) => {
        console.log(`\nEvent #${index + 1}:`);
        console.log(`Date: ${event.date}${event.time ? ' at ' + event.time : ''}`);
        console.log(`Venue: ${event.venueName}`);
        console.log(`Location: ${event.venueCity}${event.venueRegion ? ', ' + event.venueRegion : ''}${event.venueCountry ? ', ' + event.venueCountry : ''}`);
        if (event.eventUrl) console.log(`URL: ${event.eventUrl}`);
      });
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
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