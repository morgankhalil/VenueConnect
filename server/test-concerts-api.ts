/**
 * Test script for Bandsintown API and fallback scraper
 * 
 * This script attempts to fetch concert data for an artist 
 * first using the Bandsintown API, and if that fails, it falls back 
 * to scraping the Bandsintown website directly.
 * 
 * Usage:
 *   npx tsx server/test-concerts-api.ts "Artist Name"
 */
import axios from 'axios';
import * as dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import { scrapeArtistEvents } from './bandsintown-scraper';

// Load environment variables
dotenv.config();

// Get the Bandsintown API key from environment variables
const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;

interface BandsintownArtist {
  id: string;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  facebook_page_url: string;
  mbid: string;
  tracker_count: number;
  upcoming_event_count: number;
  support_url?: string;
  artist_optin_show_phone_number?: boolean;
}

interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  description: string;
  venue: {
    name: string;
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
}

/**
 * Fetch artist information from Bandsintown API
 */
async function fetchArtistInfo(artistName: string): Promise<BandsintownArtist | null> {
  try {
    if (!BANDSINTOWN_API_KEY) {
      console.error("Error: Bandsintown API key not found in environment variables");
      return null;
    }

    const encodedArtistName = encodeURIComponent(artistName);
    const url = `https://rest.bandsintown.com/artists/${encodedArtistName}?app_id=${BANDSINTOWN_API_KEY}`;

    console.log(`Fetching artist info for ${artistName} from Bandsintown API`);
    console.log(`URL: ${url}`);

    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching artist info: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    return null;
  }
}

/**
 * Fetch artist events from Bandsintown API
 */
async function fetchArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
  try {
    if (!BANDSINTOWN_API_KEY) {
      throw new Error("Bandsintown API key not found in environment variables");
    }

    const encodedArtistName = encodeURIComponent(artistName);
    const url = `https://rest.bandsintown.com/artists/${encodedArtistName}/events?app_id=${BANDSINTOWN_API_KEY}`;

    console.log(`Fetching events for ${artistName} from Bandsintown API`);
    console.log(`URL: ${url}`);

    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching artist events: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    return [];
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
      console.log('Usage: npx tsx server/test-concerts-api.ts "Artist Name"');
      process.exit(1);
    }

    console.log(`Testing search endpoint for ${artistName} events`);
    
    // First, try to get artist info from Bandsintown API
    const artistInfo = await fetchArtistInfo(artistName);
    
    if (artistInfo) {
      console.log('\n=== ARTIST INFO FROM API ===');
      console.log(`Name: ${artistInfo.name}`);
      console.log(`Upcoming events: ${artistInfo.upcoming_event_count}`);
      console.log(`URL: ${artistInfo.url}`);
      console.log(`Image: ${artistInfo.image_url}`);
      
      // If artist has upcoming events, try to fetch them
      if (artistInfo.upcoming_event_count > 0) {
        console.log(`\nAttempting to fetch ${artistInfo.upcoming_event_count} events from API...`);
        
        const apiEvents = await fetchArtistEvents(artistName);
        
        if (apiEvents && apiEvents.length > 0) {
          console.log('\n=== EVENTS FROM API ===');
          console.log(`Found ${apiEvents.length} events from API`);
          
          // Display a sample of events
          const sampleSize = Math.min(apiEvents.length, 5);
          console.log(`\nShowing first ${sampleSize} events:`);
          
          for (let i = 0; i < sampleSize; i++) {
            const event = apiEvents[i];
            const date = new Date(event.datetime).toLocaleDateString();
            
            console.log(`\nEvent #${i + 1}:`);
            console.log(`Date: ${date}`);
            console.log(`Venue: ${event.venue.name}`);
            console.log(`Location: ${event.venue.city}, ${event.venue.region}, ${event.venue.country}`);
            console.log(`URL: ${event.url}`);
          }
          
          // Success! We have the data from the API
          return;
        } else {
          console.log(`API reported ${artistInfo.upcoming_event_count} events but returned empty result`);
        }
      } else {
        console.log('Artist has no upcoming events according to the API');
      }
    } else {
      console.log('Failed to get artist info from API');
    }
    
    // If we reached here, the API didn't work or didn't have the data
    // Fall back to scraping
    console.log('\n=== FALLING BACK TO WEB SCRAPING ===');
    console.log(`Attempting to scrape events for ${artistName} from Bandsintown website...`);
    
    const scrapedEvents = await scrapeArtistEvents(artistName);
    
    if (scrapedEvents && scrapedEvents.length > 0) {
      console.log('\n=== EVENTS FROM WEB SCRAPING ===');
      console.log(`Found ${scrapedEvents.length} events from web scraping`);
      
      // Display events
      scrapedEvents.forEach((event, index) => {
        console.log(`\nEvent #${index + 1}:`);
        console.log(`Date: ${event.date}${event.time ? ' at ' + event.time : ''}`);
        console.log(`Venue: ${event.venueName}`);
        console.log(`Location: ${event.venueCity}${event.venueRegion ? ', ' + event.venueRegion : ''}${event.venueCountry ? ', ' + event.venueCountry : ''}`);
        if (event.eventUrl) console.log(`URL: ${event.eventUrl}`);
      });
    } else {
      console.log(`No events found for ${artistName} through web scraping either`);
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