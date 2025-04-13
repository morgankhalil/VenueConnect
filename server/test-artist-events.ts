/**
 * Test script for fetching artist events from Bandsintown API
 * This allows us to test the API connection and see what data is available
 */

import axios from 'axios';
import { db } from './db';
import { artists, events } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { SyncLogger } from './utils/logging';
import { setTimeout } from 'timers/promises';

const logger = new SyncLogger('ArtistTest');

// Check for API key before starting
if (!process.env.BANDSINTOWN_API_KEY) {
  logger.error('BANDSINTOWN_API_KEY environment variable is not set. This script requires a valid API key.');
  process.exit(1);
}

const BANDSINTOWN_API_KEY = process.env.BANDSINTOWN_API_KEY;
const BANDSINTOWN_BASE_URL = 'https://rest.bandsintown.com';

/**
 * Get events for a specific artist from Bandsintown
 */
async function getArtistEvents(artistName: string) {
  try {
    logger.info(`Fetching events for artist: ${artistName}`);
    const encodedName = encodeURIComponent(artistName);
    const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}/events?app_id=${BANDSINTOWN_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (!response.data || !Array.isArray(response.data)) {
      logger.warn(`No valid event data returned for artist: ${artistName}`);
      return [];
    }
    
    logger.info(`Found ${response.data.length} events for artist ${artistName}`);
    
    // Log some sample data
    if (response.data.length > 0) {
      logger.info('Sample event data:');
      logger.info(JSON.stringify(response.data[0], null, 2));
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      logger.error(`Authentication error: Invalid API key or unauthorized access for artist ${artistName}`);
    } else if (error.response && error.response.status === 429) {
      logger.warn(`Rate limited when fetching events for artist ${artistName}`);
    } else if (error.response && error.response.status === 404) {
      logger.warn(`Artist not found on Bandsintown: ${artistName}`);
    } else {
      logger.error(`Error fetching events for artist ${artistName}: ${error.message}`);
    }
    return [];
  }
}

/**
 * Get information about a specific artist from Bandsintown
 */
async function getArtistInfo(artistName: string) {
  try {
    logger.info(`Fetching info for artist: ${artistName}`);
    const encodedName = encodeURIComponent(artistName);
    const url = `${BANDSINTOWN_BASE_URL}/artists/${encodedName}?app_id=${BANDSINTOWN_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (!response.data) {
      logger.warn(`No valid artist data returned for: ${artistName}`);
      return null;
    }
    
    logger.info('Artist data:');
    logger.info(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      logger.error(`Authentication error: Invalid API key or unauthorized access for artist ${artistName}`);
    } else if (error.response && error.response.status === 429) {
      logger.warn(`Rate limited when fetching info for artist ${artistName}`);
    } else if (error.response && error.response.status === 404) {
      logger.warn(`Artist not found on Bandsintown: ${artistName}`);
    } else {
      logger.error(`Error fetching info for artist ${artistName}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Add an artist to our database
 */
async function addArtist(artistName: string, artistData: any = null) {
  try {
    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName));
    
    if (existingArtist.length > 0) {
      logger.info(`Artist already exists: ${artistName} (ID: ${existingArtist[0].id})`);
      return existingArtist[0];
    }
    
    // Get artist data from Bandsintown if not provided
    let artistInfo = artistData;
    if (!artistInfo) {
      artistInfo = await getArtistInfo(artistName);
      if (!artistInfo) {
        logger.error(`Could not get information for artist: ${artistName}`);
        return null;
      }
    }
    
    // Calculate popularity based on tracker_count if available, or default to 50
    const popularity = artistInfo.tracker_count 
      ? Math.min(100, Math.max(1, Math.floor(Math.log10(artistInfo.tracker_count) * 20)))
      : 50;
    
    // Insert artist into database
    logger.info(`Adding artist to database: ${artistName}`);
    const [newArtist] = await db.insert(artists).values({
      name: artistName,
      bandsintownId: artistInfo.id || null,
      popularity: popularity,
      imageUrl: artistInfo.image_url || artistInfo.thumb_url || null,
      website: artistInfo.facebook_page_url || artistInfo.url || null,
    }).returning();
    
    logger.info(`Added artist: ${artistName} (ID: ${newArtist.id})`);
    return newArtist;
  } catch (error) {
    logger.error(`Error adding artist: ${error}`);
    return null;
  }
}

async function main() {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    const artistName = args[0] || 'La Luz';
    
    logger.info(`Starting test with artist: ${artistName}`);
    
    // Get artist info
    const artistInfo = await getArtistInfo(artistName);
    
    if (!artistInfo) {
      logger.error(`Could not get information for artist: ${artistName}`);
      return;
    }
    
    // Add artist to database
    const artist = await addArtist(artistName, artistInfo);
    
    if (!artist) {
      logger.error(`Could not add artist to database: ${artistName}`);
      return;
    }
    
    // Get artist events
    const events = await getArtistEvents(artistName);
    
    if (events.length === 0) {
      logger.warn(`No events found for artist: ${artistName}`);
    } else {
      logger.info(`Found ${events.length} events for artist: ${artistName}`);
    }
    
    logger.info('Test completed');
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
  }
}

// Run the script if it's the main module
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''));
if (isMainModule) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}