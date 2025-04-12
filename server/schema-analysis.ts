/**
 * Database Schema Analysis
 * This script analyzes the schema for redundancies and inconsistencies
 */

import { db } from './db';
import { artists, venues, events, genres, artistGenres, venueGenres, tours, tourVenues } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function analyzeTable(tableName: string) {
  console.log(`\n===== Analyzing Table: ${tableName} =====`);
  
  // Get column information
  const columnInfo = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${tableName}
    ORDER BY ordinal_position
  `);
  
  console.log('Column Structure:');
  columnInfo.rows.forEach((col: any) => {
    console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
  });
  
  // Get count
  const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
  const count = parseInt(countResult.rows[0].count as string, 10);
  console.log(`\nRow Count: ${count}`);
  
  // Get and display a sample record
  if (count > 0) {
    const sampleRecord = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)} LIMIT 1`);
    console.log('\nSample Record:');
    console.log(sampleRecord.rows[0]);
  }
  
  return count;
}

async function checkForRedundancy() {
  console.log('\n===== Checking for Redundancies =====');
  
  // Check for artists with both array genres and junction table entries
  const artistsWithBoth = await db.execute(sql`
    SELECT a.id, a.name, array_length(a.genres, 1) as array_genre_count, 
           COUNT(ag.artist_id) as junction_genre_count
    FROM artists a
    LEFT JOIN artist_genres ag ON a.id = ag.artist_id
    GROUP BY a.id, a.name, a.genres
    HAVING array_length(a.genres, 1) > 0 AND COUNT(ag.artist_id) > 0
  `);
  
  console.log('\nArtists with both array genres and junction table entries:');
  console.log(`Found ${artistsWithBoth.rows.length} artists with both types of genre storage`);
  
  if (artistsWithBoth.rows.length > 0) {
    artistsWithBoth.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (ID: ${row.id}): ${row.array_genre_count} array genres, ${row.junction_genre_count} junction entries`);
    });
  }
  
  // Check for inconsistencies between array genres and junction table
  console.log('\nAnalyzing inconsistencies between array genres and junction genres...');
  
  const artistsWithInconsistentGenres = [];
  for (const row of artistsWithBoth.rows) {
    // Get array genres
    const artistData = await db.execute(sql`SELECT genres FROM artists WHERE id = ${row.id}`);
    const arrayGenres = artistData.rows[0].genres;
    
    // Get junction genres
    const junctionGenresResult = await db.execute(sql`
      SELECT g.name
      FROM genres g
      JOIN artist_genres ag ON g.id = ag.genre_id
      WHERE ag.artist_id = ${row.id}
    `);
    
    const junctionGenres = junctionGenresResult.rows.map((g: any) => g.name);
    
    // Convert array genres to match junction genre format (may need adjustment)
    let normalizedArrayGenres: string[] = [];
    if (Array.isArray(arrayGenres)) {
      normalizedArrayGenres = arrayGenres.map((g: string) => g.replace(/_/g, ' '));
    }
    
    // Check for mismatches
    const arrayOnly = normalizedArrayGenres.filter(g => !junctionGenres.includes(g));
    const junctionOnly = junctionGenres.filter(g => !normalizedArrayGenres.includes(g));
    
    if (arrayOnly.length > 0 || junctionOnly.length > 0) {
      artistsWithInconsistentGenres.push({
        id: row.id,
        name: row.name,
        arrayOnly,
        junctionOnly
      });
    }
  }
  
  console.log('\nArtists with inconsistent genres between array and junction table:');
  console.log(`Found ${artistsWithInconsistentGenres.length} artists with inconsistent genres`);
  
  if (artistsWithInconsistentGenres.length > 0) {
    artistsWithInconsistentGenres.forEach(artist => {
      console.log(`  - ${artist.name} (ID: ${artist.id}):`);
      if (artist.arrayOnly.length > 0) {
        console.log(`    * Array only: ${artist.arrayOnly.join(', ')}`);
      }
      if (artist.junctionOnly.length > 0) {
        console.log(`    * Junction only: ${artist.junctionOnly.join(', ')}`);
      }
    });
  }
  
  // Check seed files for any hardcoded genre enum values
  console.log('\nSeed files should be inspected for hardcoded genre enum values');
  console.log('Recommended files to check:');
  console.log('  - server/seed-artists-with-genres.ts');
  console.log('  - server/seed-public-events.ts');
  console.log('  - Any other files that create or modify artist records');
}

async function analyzeSeedMethods() {
  console.log('\n===== Analyzing Seed Methods =====');
  
  // List all seed files that affect genre data
  console.log('\nThe following seed files affect genre data:');
  console.log('1. server/seed-artists-with-genres.ts - Creates artist-genre relationships');
  console.log('2. server/seed-public-events.ts - May set array genres');
  
  // Check the methods used
  console.log('\nThe current approach uses:');
  console.log('- A junction table (artistGenres) for proper many-to-many relationships');
  console.log('- Legacy array column storage (artist.genres) for backward compatibility');
  
  console.log('\nRecommendation:');
  console.log('- Focus on using junction tables exclusively');
  console.log('- Phase out the array column storage where possible');
  console.log('- Update seed scripts to avoid setting the array column');
}

async function main() {
  try {
    console.log('Database Schema Analysis');
    console.log('=======================');
    
    // Analyze main tables
    await analyzeTable('artists');
    await analyzeTable('venues');
    await analyzeTable('events');
    await analyzeTable('genres');
    await analyzeTable('artist_genres');
    await analyzeTable('venue_genres');
    
    // Check for redundancies
    await checkForRedundancy();
    
    // Analyze seed methods
    await analyzeSeedMethods();
    
    console.log('\n===== Summary =====');
    console.log('1. The database uses both junction tables and array columns for genres');
    console.log('2. This creates potential for inconsistencies and redundancies');
    console.log('3. The recommended approach is to standardize on junction tables');
    console.log('4. Update seed scripts and queries to phase out array column usage');
    
  } catch (error) {
    console.error('Error during schema analysis:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });