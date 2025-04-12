import { db } from './db';
import { artists, events, venues, genres } from '../shared/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { artistGenres, venueGenres } from '../shared/schema';

async function main() {
  try {
    console.log('Testing genre-based search capabilities...');
    
    // Test 1: Find all artists in the indie rock genre
    const indieRockId = 25; // From our previous query, indie rock has ID 25
    const indieRockArtistIds = await db
      .select({ artistId: artistGenres.artistId })
      .from(artistGenres)
      .where(eq(artistGenres.genreId, indieRockId));
      
    console.log(`Found ${indieRockArtistIds.length} artists with indie rock genre`);
    
    if (indieRockArtistIds.length > 0) {
      // Get artist details
      const artistIdList = indieRockArtistIds.map(a => a.artistId);
      const indieRockArtists = await db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(inArray(artists.id, artistIdList));
        
      console.log('\nIndie rock artists (IDs and names only):');
      console.log(JSON.stringify(indieRockArtists, null, 2));
      
      // Get events for these indie rock artists
      const indieRockEvents = await db
        .select({
          eventId: events.id,
          eventDate: events.date,
          venueName: venues.name,
          venueCity: venues.city,
          artistName: artists.name
        })
        .from(events)
        .innerJoin(artists, eq(events.artistId, artists.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(inArray(events.artistId, artistIdList));
        
      console.log('\nEvents for indie rock artists:');
      console.log(JSON.stringify(indieRockEvents, null, 2));
    }
    
    // Test 2: Find all artists in any rock subgenre
    const rockId = 1; // Rock is the parent genre
    const rockSubgenres = await db
      .select()
      .from(genres)
      .where(eq(genres.parentId, rockId));
      
    console.log(`\nFound ${rockSubgenres.length} rock subgenres`);
    console.log(JSON.stringify(rockSubgenres.map(g => g.name), null, 2));
    
    if (rockSubgenres.length > 0) {
      const rockSubgenreIds = rockSubgenres.map(g => g.id);
      
      // Get artists in any rock subgenre
      const rockSubgenreArtistIds = await db
        .select({ artistId: artistGenres.artistId })
        .from(artistGenres)
        .where(inArray(artistGenres.genreId, rockSubgenreIds));
        
      const uniqueArtistIds = [...new Set(rockSubgenreArtistIds.map(a => a.artistId))];
      console.log(`Found ${uniqueArtistIds.length} artists in rock subgenres`);
      
      if (uniqueArtistIds.length > 0) {
        const rockSubgenreArtists = await db
          .select()
          .from(artists)
          .where(inArray(artists.id, uniqueArtistIds));
          
        console.log('\nArtists in rock subgenres:');
        console.log(JSON.stringify(rockSubgenreArtists, null, 2));
      }
    }
    
    // Test 3: Get La Luz's specific genres
    const artistId = 182; // La Luz ID from earlier query
    console.log('\nGetting genre data for La Luz (ID: 182)');
    
    // First, get La Luz's genres with genre names
    const artistGenreData = await db.execute(sql`
      SELECT g.id, g.name, g."parentId" 
      FROM genres g
      JOIN "artistGenres" ag ON g.id = ag."genreId"
      WHERE ag."artistId" = ${artistId}
    `);
      
    console.log('\nLa Luz genres:');
    console.log(JSON.stringify(artistGenreData.rows, null, 2));
    
    // Get La Luz's events
    const artistEvents = await db
      .select({
        eventId: events.id,
        eventDate: events.date,
        venueName: venues.name,
        venueCity: venues.city,
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.artistId, artistId));
      
    console.log('\nLa Luz events:');
    console.log(JSON.stringify(artistEvents, null, 2));
    
    // Get venues that have event matches with La Luz
    const venueIds = artistEvents.map(e => e.venueName);
    console.log(`\nLa Luz has events at ${venueIds.length} venues: ${venueIds.join(', ')}`);
    
    // Display more details about those genres (parent genres)
    const genreIds = artistGenreData.rows.map((g: any) => g.id);
    if (genreIds.length > 0) {
      // For any genres with parents, find the parent genre names
      // We need to use individual parameters for each ID
      const placeholders = genreIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT g.id, g.name, p.id as "parentId", p.name as "parentName"
        FROM genres g
        JOIN genres p ON g."parentId" = p.id
        WHERE g.id IN (${placeholders})
      `;
      const parentGenres = await db.execute(query, genreIds);
      
      console.log('\nParent genres for La Luz:');
      console.log(JSON.stringify(parentGenres.rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing genre search:', error);
  }
}

// Already imported above

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });