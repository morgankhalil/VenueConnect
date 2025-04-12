/**
 * Test Genre Utilities
 * 
 * This script tests the genre utility functions to ensure they're correctly 
 * retrieving and managing genre relationships.
 */
import { db } from './db';
import { artists, genres, venues } from '../shared/schema';
import {
  getArtistGenres,
  getGenreByName,
  getGenreBySlug,
  getArtistsByGenre,
  getVenueGenres,
  getVenuesByGenre,
  getChildGenres,
  getGenreWithChildren,
  findRelatedGenresByArtistOverlap
} from './helpers/genre-utils';

async function testGenreUtils() {
  try {
    console.log('Starting genre utility tests...');
    
    // ==========================================
    // Test getting genre by name and slug
    // ==========================================
    const rockGenre = await getGenreByName('Rock');
    if (rockGenre) {
      console.log(`Found genre by name: ${rockGenre.name} (id: ${rockGenre.id})`);
    } else {
      console.error('Failed to find Rock genre by name');
    }
    
    const indieRockGenre = await getGenreBySlug('indie-rock');
    if (indieRockGenre) {
      console.log(`Found genre by slug: ${indieRockGenre.name} (id: ${indieRockGenre.id})`);
    } else {
      console.error('Failed to find indie-rock genre by slug');
    }
    
    // ==========================================
    // Test genre hierarchy
    // ==========================================
    if (rockGenre) {
      console.log(`\nTesting child genres of ${rockGenre.name}:`);
      const rockSubgenres = await getChildGenres(rockGenre.id);
      console.log(`Found ${rockSubgenres.length} subgenres of Rock:`);
      rockSubgenres.forEach(subgenre => {
        console.log(`- ${subgenre.name} (id: ${subgenre.id}, slug: ${subgenre.slug})`);
      });
      
      console.log(`\nTesting getGenreWithChildren for ${rockGenre.name}:`);
      const rockWithChildren = await getGenreWithChildren(rockGenre.id);
      console.log(`Found ${rockWithChildren.length} genres (including parent):`);
      rockWithChildren.forEach(genre => {
        console.log(`- ${genre.name} (id: ${genre.id}, slug: ${genre.slug})`);
      });
    }
    
    // ==========================================
    // Test artist-genre relationships
    // ==========================================
    // Find a test artist
    const testArtist = await db.query.artists.findFirst({
      where: (artist, { eq }) => eq(artist.name, 'The Midnight')
    });
    
    if (testArtist) {
      console.log(`\nTesting genre relationships for artist: ${testArtist.name} (id: ${testArtist.id})`);
      
      // Get genres for this artist
      const artistGenres = await getArtistGenres(testArtist.id);
      console.log(`Found ${artistGenres.length} genres for ${testArtist.name}:`);
      artistGenres.forEach(genre => {
        console.log(`- ${genre.name} (id: ${genre.id}, slug: ${genre.slug})`);
      });
      
      // Find a genre to test with
      if (artistGenres.length > 0) {
        const testGenre = artistGenres[0];
        console.log(`\nTesting artists with genre: ${testGenre.name} (id: ${testGenre.id})`);
        
        // Get artists with this genre
        const artistsWithGenre = await getArtistsByGenre(testGenre.id);
        console.log(`Found ${artistsWithGenre.length} artists with genre ${testGenre.name}:`);
        artistsWithGenre.slice(0, 5).forEach(artist => {
          console.log(`- ${artist.name} (id: ${artist.id})`);
        });
        
        if (artistsWithGenre.length > 5) {
          console.log(`  ... and ${artistsWithGenre.length - 5} more`);
        }
      }
    }
    
    // ==========================================
    // Test venue-genre relationships
    // ==========================================
    // Find a test venue
    const testVenue = await db.query.venues.findFirst({
      where: (venue, { eq }) => eq(venue.name, 'The Fillmore')
    });
    
    if (testVenue) {
      console.log(`\nTesting genre relationships for venue: ${testVenue.name} (id: ${testVenue.id})`);
      
      // Get genres for this venue
      const venueGenres = await getVenueGenres(testVenue.id);
      console.log(`Found ${venueGenres.length} genres for ${testVenue.name}:`);
      venueGenres.forEach(genre => {
        console.log(`- ${genre.name} (id: ${genre.id}, slug: ${genre.slug}, isPrimary: ${genre.isPrimary})`);
      });
      
      // Find a genre to test with
      if (venueGenres.length > 0) {
        const testGenre = venueGenres[0];
        console.log(`\nTesting venues with genre: ${testGenre.name} (id: ${testGenre.id})`);
        
        // Get venues with this genre
        const venuesWithGenre = await getVenuesByGenre(testGenre.id);
        console.log(`Found ${venuesWithGenre.length} venues with genre ${testGenre.name}:`);
        venuesWithGenre.slice(0, 5).forEach(venue => {
          console.log(`- ${venue.name} (id: ${venue.id})`);
        });
        
        if (venuesWithGenre.length > 5) {
          console.log(`  ... and ${venuesWithGenre.length - 5} more`);
        }
      }
    }
    
    // ==========================================
    // Test related genres by artist overlap
    // ==========================================
    if (indieRockGenre) {
      console.log(`\nTesting related genres to ${indieRockGenre.name} by artist overlap:`);
      const relatedGenres = await findRelatedGenresByArtistOverlap(indieRockGenre.id, 5);
      console.log(`Found ${relatedGenres.length} related genres:`);
      relatedGenres.forEach(relation => {
        console.log(`- ${relation.name} (id: ${relation.id}, overlap: ${relation.overlap} artists)`);
      });
    }
    
    console.log('\nGenre utility tests completed successfully.');
  } catch (error) {
    console.error('Error during genre utility tests:', error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
testGenreUtils();