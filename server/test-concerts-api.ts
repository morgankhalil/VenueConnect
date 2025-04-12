/**
 * Test script for concert event fetching
 * This script allows testing without requiring actual API keys
 */

import axios from 'axios';
import { db } from './db';
import { artists, events, artistGenres, genres } from '../shared/schema';
import { eq, and, inArray, gt, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

// Test artist to look up
const TEST_ARTIST_NAME = "La Luz";

/**
 * Get artist info with their genre relationships
 */
async function getArtistWithGenres(artistName: string) {
  try {
    // Get the artist
    const artist = await db.query.artists.findFirst({
      where: eq(artists.name, artistName)
    });
    
    if (!artist) {
      console.error(`Artist "${artistName}" not found in database`);
      return null;
    }
    
    // Get the artist's genres
    const artistGenreRelations = await db
      .select({
        genreId: artistGenres.genreId
      })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, artist.id));
    
    const genreIds = artistGenreRelations.map(relation => relation.genreId);
    
    let artistGenreInfo = [];
    if (genreIds.length > 0) {
      // Get genre details
      artistGenreInfo = await db
        .select({
          id: genres.id,
          name: genres.name,
          slug: genres.slug,
          parentId: genres.parentId
        })
        .from(genres)
        .where(inArray(genres.id, genreIds));
    }
    
    return {
      artist,
      genres: artistGenreInfo
    };
  } catch (error) {
    console.error('Error getting artist with genres:', error);
    return null;
  }
}

/**
 * Search SongKick for artist events
 * This is a web scraping fallback when we don't have API keys
 */
async function searchSongkickEvents(artistName: string) {
  try {
    console.log(`Searching Songkick for ${artistName} events...`);
    const encodedName = encodeURIComponent(artistName);
    const url = `https://www.songkick.com/search?query=${encodedName}&type=upcoming`;
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Find all event listings
    const events = [];
    $('.event-listings .event-listing').each((i, el) => {
      const eventDate = $(el).find('.event-listing-date').text().trim();
      const eventVenue = $(el).find('.event-listing-venue').text().trim();
      const eventLocation = $(el).find('.event-listing-location').text().trim();
      
      events.push({
        date: eventDate,
        venue: eventVenue,
        location: eventLocation,
        url: 'https://www.songkick.com' + $(el).find('a.event-link').attr('href')
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error scraping Songkick:', error.message);
    return [];
  }
}

/**
 * Test search endpoint for artist events
 */
async function testSearchEndpoint(artistName: string) {
  try {
    console.log(`Testing search endpoint for ${artistName} events`);
    
    // Call the local search API endpoint
    const response = await axios.get('http://localhost:5000/api/events/search', {
      params: { query: artistName }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, response.data);
    
    return response.data;
  } catch (error) {
    console.error('Test failed:', error.message);
    return null;
  }
}

/**
 * Main function to test artist event fetching
 */
async function main() {
  console.log(`Testing artist events for: ${TEST_ARTIST_NAME}`);
  
  // Get artist with genre info
  const artistInfo = await getArtistWithGenres(TEST_ARTIST_NAME);
  console.log('Artist info:', artistInfo);
  
  // Try SongKick as a fallback for getting concert data
  const songkickEvents = await searchSongkickEvents(TEST_ARTIST_NAME);
  console.log('Songkick events:', songkickEvents);
  
  // Test our search endpoint which uses Bandsintown data if available
  await testSearchEndpoint(TEST_ARTIST_NAME);
  
  process.exit(0);
}

main();