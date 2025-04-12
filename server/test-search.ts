/**
 * Test script for search endpoint
 */
import axios from 'axios';
import { db } from './db';
import { artists, artistGenres, genres } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get artist details from database
 */
async function getArtistDetails(artistName: string) {
  try {
    const artist = await db
      .select({
        id: artists.id,
        name: artists.name,
        imageUrl: artists.imageUrl
      })
      .from(artists)
      .where(eq(artists.name, artistName))
      .limit(1);
    
    if (artist.length === 0) {
      console.log(`Artist "${artistName}" not found in database`);
      return null;
    }
    
    console.log('Found artist in database:', artist[0]);
    return artist[0];
  } catch (error) {
    console.error('Error fetching artist from database:', error);
    return null;
  }
}

/**
 * Get artist genres from database
 */
async function getArtistGenres(artistId: number) {
  try {
    const genreRelations = await db
      .select({
        genreId: artistGenres.genreId
      })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, artistId));
    
    if (genreRelations.length === 0) {
      console.log('No genres found for artist');
      return [];
    }
    
    const genreIds = genreRelations.map(rel => rel.genreId);
    
    const artistGenreInfo = await db
      .select({
        id: genres.id,
        name: genres.name,
        slug: genres.slug
      })
      .from(genres)
      .where(eq(genres.id, genreIds[0])); // Just get the first genre for testing
    
    console.log('Artist genres:', artistGenreInfo);
    return artistGenreInfo;
  } catch (error) {
    console.error('Error fetching artist genres:', error);
    return [];
  }
}

/**
 * Test artist search endpoint
 */
async function testArtistSearch(query: string) {
  try {
    console.log(`Testing artist search endpoint for "${query}"...`);
    const params = new URLSearchParams({
      query: query,
      page: '1',
      limit: '10'
    });
    const response = await axios.get(`http://localhost:5000/api/artists/search?${params.toString()}`);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.data.artists && response.data.artists.length > 0) {
      console.log('Found artists:', response.data.artists.map((a: any) => a.name).join(', '));
    } else {
      console.log('No artists found');
    }
    
    return response.data;
  } catch (error) {
    console.error('Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    return null;
  }
}

/**
 * Test event search endpoint
 */
async function testEventSearch(query: string, genreSlug?: string) {
  try {
    const params = new URLSearchParams({
      query: query,
      page: '1',
      limit: '10'
    });
    
    if (genreSlug) {
      params.append('genre', genreSlug);
    }
    
    console.log(`Testing search endpoint for "${query}" events...`);
    const response = await axios.get(`http://localhost:5000/api/events/search?${params.toString()}`);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.data.events && response.data.events.length > 0) {
      console.log('Found events:', response.data.events.length);
      // Display some details of the first event
      const firstEvent = response.data.events[0];
      console.log('Sample event:', {
        id: firstEvent.id,
        date: firstEvent.date,
        artist: firstEvent.artist.name,
        venue: firstEvent.venue.name
      });
    } else {
      console.log('No events found');
    }
    
    return response.data;
  } catch (error) {
    console.error('Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    return null;
  }
}

/**
 * Test genre endpoint
 */
async function testGenresEndpoint() {
  try {
    console.log('Testing genres endpoint...');
    const response = await axios.get('http://localhost:5000/api/genres');
    
    console.log('Response status:', response.status);
    console.log('Number of root genres:', response.data.genres.length);
    
    // Show first few genres
    if (response.data.genres && response.data.genres.length > 0) {
      const sampleGenres = response.data.genres.slice(0, 3);
      sampleGenres.forEach((genre: any) => {
        console.log(`Genre: ${genre.name} (${genre.subgenres.length} subgenres)`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    return null;
  }
}

async function main() {
  try {
    console.log('Database connection initialized');
    
    // Test basic search functionality
    await testArtistSearch('La Luz');
    await testEventSearch('La Luz');
    
    // Get artist details for more specific tests
    const artist = await getArtistDetails('La Luz');
    
    if (artist) {
      // Get artist genres
      const genres = await getArtistGenres(artist.id);
      
      if (genres.length > 0) {
        // Test genre filtering
        await testEventSearch('', genres[0].slug);
      }
    }
    
    // Test genre hierarchy endpoint
    await testGenresEndpoint();
    
  } catch (error) {
    console.error('Error running search tests:', error);
  } finally {
    // We don't need to close the database connection for Neon
    console.log('Tests completed');
  }
}

// Run the main function
main().catch(console.error);