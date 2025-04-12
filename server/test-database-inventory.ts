/**
 * Database Inventory Check
 * This script checks all tables in the database and reports on their contents and counts
 */

import { db } from './db';
import { artists, venues, events, genres, artistGenres, venueGenres, tours, tourVenues } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function checkTableCount(tableName: string): Promise<number> {
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
  return parseInt(result.rows[0].count as string, 10);
}

async function main() {
  try {
    console.log('Database Inventory Check');
    console.log('======================');
    
    // Get total counts for key tables
    const artistCount = await checkTableCount('artists');
    const venueCount = await checkTableCount('venues');
    const eventCount = await checkTableCount('events');
    const genreCount = await checkTableCount('genres');
    const artistGenreCount = await checkTableCount('artistGenres');
    const venueGenreCount = await checkTableCount('venueGenres');
    const tourCount = await checkTableCount('tours');
    const tourVenueCount = await checkTableCount('tourVenues');
    
    console.log(`Artists: ${artistCount}`);
    console.log(`Venues: ${venueCount}`);
    console.log(`Events: ${eventCount}`);
    console.log(`Genres: ${genreCount}`);
    console.log(`Artist-Genre Relations: ${artistGenreCount}`);
    console.log(`Venue-Genre Relations: ${venueGenreCount}`);
    console.log(`Tours: ${tourCount}`);
    console.log(`Tour Venues: ${tourVenueCount}`);
    
    // Check parent-child genre relationships
    const parentGenres = await db.select().from(genres).where(sql`"parentId" IS NULL`);
    const childGenres = await db.select().from(genres).where(sql`"parentId" IS NOT NULL`);
    
    console.log(`\nGenre Structure:`);
    console.log(`Parent Genres: ${parentGenres.length}`);
    console.log(`Child Genres: ${childGenres.length}`);
    
    // Sample of artists
    const artistSample = await db.select().from(artists).limit(5);
    console.log(`\nSample of ${artistSample.length} Artists:`);
    artistSample.forEach(artist => {
      console.log(`- ${artist.name} (ID: ${artist.id})`);
    });
    
    // Sample of venues
    const venueSample = await db.select().from(venues).limit(5);
    console.log(`\nSample of ${venueSample.length} Venues:`);
    venueSample.forEach(venue => {
      console.log(`- ${venue.name}, ${venue.city}, ${venue.region} (ID: ${venue.id})`);
    });
    
    // Sample of events
    const eventSample = await db
      .select({
        id: events.id,
        date: events.date,
        artistName: artists.name,
        venueName: venues.name
      })
      .from(events)
      .innerJoin(artists, sql`${events.artistId} = ${artists.id}`)
      .innerJoin(venues, sql`${events.venueId} = ${venues.id}`)
      .limit(5);
    
    console.log(`\nSample of ${eventSample.length} Events:`);
    eventSample.forEach(event => {
      console.log(`- ${event.date}: ${event.artistName} at ${event.venueName} (ID: ${event.id})`);
    });
    
    // Get sample of artist genres
    const artistWithGenres = await db
      .select({
        artistId: artistGenres.artistId,
        artistName: artists.name,
        genreName: genres.name
      })
      .from(artistGenres)
      .innerJoin(artists, sql`${artistGenres.artistId} = ${artists.id}`)
      .innerJoin(genres, sql`${artistGenres.genreId} = ${genres.id}`)
      .limit(10);
    
    console.log(`\nSample of Artist-Genre Relations:`);
    const artistGenreMap = new Map<string, string[]>();
    artistWithGenres.forEach(ag => {
      if (!artistGenreMap.has(ag.artistName)) {
        artistGenreMap.set(ag.artistName, []);
      }
      artistGenreMap.get(ag.artistName)?.push(ag.genreName);
    });
    
    Array.from(artistGenreMap.entries()).forEach(([artist, genres]) => {
      console.log(`- ${artist}: ${genres.join(', ')}`);
    });
    
    // Sample of tours
    if (tourCount > 0) {
      const tourSample = await db
        .select({
          id: tours.id,
          name: tours.name,
          artistName: artists.name,
          startDate: tours.startDate,
          endDate: tours.endDate
        })
        .from(tours)
        .innerJoin(artists, sql`${tours.artistId} = ${artists.id}`)
        .limit(3);
        
      console.log(`\nSample of ${tourSample.length} Tours:`);
      tourSample.forEach(tour => {
        console.log(`- ${tour.name} by ${tour.artistName} (${tour.startDate} to ${tour.endDate})`);
      });
    }
    
    // Check what's missing
    console.log('\nPotential Data Gaps:');
    if (artistCount === 0) console.log('- No artists in database');
    if (venueCount === 0) console.log('- No venues in database');
    if (eventCount === 0) console.log('- No events in database');
    if (genreCount === 0) console.log('- No genres in database');
    if (artistGenreCount === 0) console.log('- No artist-genre relationships');
    if (venueGenreCount === 0) console.log('- No venue-genre relationships');
    
    // Check for artists without genres
    const artistsWithoutGenres = await db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM "artistGenres" WHERE "artistId" = ${artists.id})`
      );
      
    if (artistsWithoutGenres.length > 0) {
      console.log(`- ${artistsWithoutGenres.length} artists without genre relationships`);
      if (artistsWithoutGenres.length <= 5) {
        artistsWithoutGenres.forEach(artist => {
          console.log(`  * ${artist.name} (ID: ${artist.id})`);
        });
      }
    }
    
    // Check for venues without genres
    const venuesWithoutGenres = await db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM "venueGenres" WHERE "venueId" = ${venues.id})`
      );
      
    if (venuesWithoutGenres.length > 0) {
      console.log(`- ${venuesWithoutGenres.length} venues without genre relationships`);
    }
    
    // Check for artists without events
    const artistsWithoutEvents = await db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM events WHERE "artistId" = ${artists.id})`
      );
      
    if (artistsWithoutEvents.length > 0) {
      console.log(`- ${artistsWithoutEvents.length} artists without events`);
    }
    
    // Check for venues without events
    const venuesWithoutEvents = await db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(
        sql`NOT EXISTS (SELECT 1 FROM events WHERE "venueId" = ${venues.id})`
      );
      
    if (venuesWithoutEvents.length > 0) {
      console.log(`- ${venuesWithoutEvents.length} venues without events`);
    }

  } catch (error) {
    console.error('Error checking database inventory:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });