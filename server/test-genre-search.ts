import { db } from './db';
import { artists, events, venues, artistGenres, genres } from '../shared/schema';
import { eq, inArray, sql } from 'drizzle-orm';

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
    
    // Test 3: Demonstrate a SQL query that could fetch venues by genre compatibility
    const artistId = 182; // La Luz ID from earlier query
    console.log('\nFinding compatible venues for La Luz (ID: 182)');
    
    // First, get La Luz's genres
    const artistGenreIds = await db
      .select({ genreId: artistGenres.genreId })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, artistId));
      
    const artistGenreIdList = artistGenreIds.map(g => g.genreId);
    console.log(`Artist has ${artistGenreIdList.length} genres: ${JSON.stringify(artistGenreIdList)}`);
    
    // Find venues with matching genres
    const compatibleVenueIds = await db
      .select({ venueId: venues.id })
      .from(venues)
      .innerJoin(venueGenres, eq(venues.id, venueGenres.venueId))
      .where(inArray(venueGenres.genreId, artistGenreIdList))
      .groupBy(venues.id);
      
    console.log(`Found ${compatibleVenueIds.length} compatible venues`);
    
    if (compatibleVenueIds.length > 0) {
      const venueIdList = compatibleVenueIds.map(v => v.venueId);
      const compatibleVenues = await db
        .select({
          id: venues.id,
          name: venues.name,
          city: venues.city,
          region: venues.region,
          capacity: venues.capacity,
          primaryGenre: venues.primaryGenre
        })
        .from(venues)
        .where(inArray(venues.id, venueIdList));
        
      console.log('\nCompatible venues:');
      console.log(JSON.stringify(compatibleVenues, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing genre search:', error);
  }
}

// For joining with venue genres
import { venueGenres } from '../shared/schema';

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });