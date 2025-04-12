/**
 * Genre Data Consistency Check
 * 
 * This script analyzes the genre data across both storage methods (array columns and junction tables)
 * and identifies any inconsistencies or missing relationships.
 */

import { db } from './db';
import { artists, venues, genres, artistGenres, venueGenres } from '../shared/schema';
import { sql, eq, inArray } from 'drizzle-orm';

// Helper function to convert genre enum values to match genre names in the genres table
function normalizeGenreName(enumGenre: string): string {
  return enumGenre.replace(/_/g, ' ');
}

async function getGenreIdByName(genreName: string): Promise<number | null> {
  const normalizedName = genreName.toLowerCase().replace(/\s+/g, ' ').trim();
  const slug = normalizedName.replace(/\s+/g, '-');
  
  const result = await db
    .select({ id: genres.id })
    .from(genres)
    .where(sql`LOWER(${genres.name}) = ${normalizedName} OR ${genres.slug} = ${slug}`)
    .limit(1);
  
  return result.length > 0 ? result[0].id : null;
}

async function checkArtistGenreConsistency() {
  console.log('\n---- Artist Genre Consistency Check ----');
  
  // Get all artists and their array genres
  const artistsWithArrayGenres = await db
    .select({
      id: artists.id,
      name: artists.name,
      arrayGenres: artists.genres
    })
    .from(artists)
    .where(sql`array_length(${artists.genres}, 1) > 0`);
  
  console.log(`Found ${artistsWithArrayGenres.length} artists with array genres`);
  
  // Check each artist
  let inconsistencyCount = 0;
  let missingJunctionCount = 0;
  
  for (const artist of artistsWithArrayGenres) {
    // Get the artist's junction table genres
    const junctionGenres = await db
      .select({
        genreId: artistGenres.genreId,
        genreName: genres.name
      })
      .from(artistGenres)
      .innerJoin(genres, eq(artistGenres.genreId, genres.id))
      .where(eq(artistGenres.artistId, artist.id));
    
    if (junctionGenres.length === 0) {
      console.log(`\n❌ Artist "${artist.name}" (${artist.id}) has array genres but NO junction table entries`);
      console.log(`  Array genres: ${artist.arrayGenres.join(', ')}`);
      missingJunctionCount++;
      continue;
    }
    
    // Check for inconsistencies
    const junctionGenreNames = junctionGenres.map(g => g.genreName.toLowerCase());
    const normalizedArrayGenres = artist.arrayGenres.map(g => normalizeGenreName(g).toLowerCase());
    
    const inArrayButNotJunction = normalizedArrayGenres.filter(g => !junctionGenreNames.includes(g));
    const inJunctionButNotArray = junctionGenreNames.filter(g => !normalizedArrayGenres.includes(g));
    
    if (inArrayButNotJunction.length > 0 || inJunctionButNotArray.length > 0) {
      console.log(`\n⚠️ Artist "${artist.name}" (${artist.id}) has inconsistent genres:`);
      
      if (inArrayButNotJunction.length > 0) {
        console.log(`  In array but not junction: ${inArrayButNotJunction.join(', ')}`);
      }
      
      if (inJunctionButNotArray.length > 0) {
        console.log(`  In junction but not array: ${inJunctionButNotArray.join(', ')}`);
      }
      
      inconsistencyCount++;
    }
  }
  
  // Check for artists with junction entries but no array genres
  const artistsWithJunctionOnly = await db
    .select({
      id: artistGenres.artistId,
      name: artists.name
    })
    .from(artistGenres)
    .innerJoin(artists, eq(artistGenres.artistId, artists.id))
    .where(sql`array_length(${artists.genres}, 1) IS NULL OR array_length(${artists.genres}, 1) = 0`)
    .groupBy(artistGenres.artistId, artists.name);
  
  console.log(`\nFound ${artistsWithJunctionOnly.length} artists with junction genres but empty array genres`);
  
  // Summary
  console.log('\nSummary:');
  console.log(`- ${inconsistencyCount} artists have inconsistent genres between storage methods`);
  console.log(`- ${missingJunctionCount} artists have array genres but no junction entries`);
  console.log(`- ${artistsWithJunctionOnly.length} artists have junction entries but no array genres`);
}

async function checkVenueGenreConsistency() {
  console.log('\n---- Venue Genre Consistency Check ----');
  
  // Get all venues with primary genre set
  const venuesWithPrimaryGenre = await db
    .select({
      id: venues.id,
      name: venues.name,
      primaryGenre: venues.primaryGenre,
      secondaryGenres: venues.secondaryGenres
    })
    .from(venues)
    .where(sql`${venues.primaryGenre} IS NOT NULL`);
  
  console.log(`Found ${venuesWithPrimaryGenre.length} venues with primary genre set`);
  
  // Check each venue
  let inconsistencyCount = 0;
  let missingJunctionCount = 0;
  
  for (const venue of venuesWithPrimaryGenre) {
    // Get the venue's junction table genres
    const junctionGenres = await db
      .select({
        genreId: venueGenres.genreId,
        genreName: genres.name,
        isPrimary: venueGenres.isPrimary
      })
      .from(venueGenres)
      .innerJoin(genres, eq(venueGenres.genreId, genres.id))
      .where(eq(venueGenres.venueId, venue.id));
    
    if (junctionGenres.length === 0) {
      console.log(`\n❌ Venue "${venue.name}" (${venue.id}) has primary/secondary genres but NO junction table entries`);
      console.log(`  Primary genre: ${venue.primaryGenre}`);
      console.log(`  Secondary genres: ${venue.secondaryGenres ? venue.secondaryGenres.join(', ') : 'none'}`);
      missingJunctionCount++;
      continue;
    }
    
    // Check for inconsistencies with primary genre
    const primaryJunctionGenre = junctionGenres.find(g => g.isPrimary)?.genreName?.toLowerCase();
    const normalizedPrimaryGenre = venue.primaryGenre ? normalizeGenreName(venue.primaryGenre).toLowerCase() : null;
    
    if (primaryJunctionGenre && normalizedPrimaryGenre && primaryJunctionGenre !== normalizedPrimaryGenre) {
      console.log(`\n⚠️ Venue "${venue.name}" (${venue.id}) has inconsistent primary genre:`);
      console.log(`  Column primary genre: ${normalizedPrimaryGenre}`);
      console.log(`  Junction primary genre: ${primaryJunctionGenre}`);
      inconsistencyCount++;
    }
    
    // Check for inconsistencies with secondary genres
    if (venue.secondaryGenres && venue.secondaryGenres.length > 0) {
      const secondaryJunctionGenres = junctionGenres
        .filter(g => !g.isPrimary)
        .map(g => g.genreName.toLowerCase());
      
      const normalizedSecondaryGenres = venue.secondaryGenres.map(g => normalizeGenreName(g).toLowerCase());
      
      const inArrayButNotJunction = normalizedSecondaryGenres.filter(g => !secondaryJunctionGenres.includes(g));
      const inJunctionButNotArray = secondaryJunctionGenres.filter(g => !normalizedSecondaryGenres.includes(g));
      
      if (inArrayButNotJunction.length > 0 || inJunctionButNotArray.length > 0) {
        console.log(`\n⚠️ Venue "${venue.name}" (${venue.id}) has inconsistent secondary genres:`);
        
        if (inArrayButNotJunction.length > 0) {
          console.log(`  In array but not junction: ${inArrayButNotJunction.join(', ')}`);
        }
        
        if (inJunctionButNotArray.length > 0) {
          console.log(`  In junction but not array: ${inJunctionButNotArray.join(', ')}`);
        }
        
        inconsistencyCount++;
      }
    }
  }
  
  // Check for venues with junction entries but no column genres
  const venuesWithJunctionOnly = await db
    .select({
      id: venueGenres.venueId,
      name: venues.name
    })
    .from(venueGenres)
    .innerJoin(venues, eq(venueGenres.venueId, venues.id))
    .where(sql`${venues.primaryGenre} IS NULL`)
    .groupBy(venueGenres.venueId, venues.name);
  
  console.log(`\nFound ${venuesWithJunctionOnly.length} venues with junction genres but no primary genre`);
  
  // Summary
  console.log('\nSummary:');
  console.log(`- ${inconsistencyCount} venues have inconsistent genres between storage methods`);
  console.log(`- ${missingJunctionCount} venues have column genres but no junction entries`);
  console.log(`- ${venuesWithJunctionOnly.length} venues have junction entries but no column genres`);
}

async function main() {
  try {
    console.log('Genre Data Consistency Check');
    console.log('===========================');
    
    await checkArtistGenreConsistency();
    await checkVenueGenreConsistency();
    
    console.log('\nCheck complete!');
  } catch (error) {
    console.error('Error during consistency check:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });