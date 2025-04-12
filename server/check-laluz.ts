import { db } from './db';
import { artists, artistGenres, genres, events, venues } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking La Luz artist data...');
    
    // Get La Luz artist info
    const laLuzArtist = await db.select().from(artists).where(eq(artists.name, 'La Luz'));
    
    if (laLuzArtist.length > 0) {
      console.log('Found La Luz artist:');
      console.log(JSON.stringify(laLuzArtist[0], null, 2));
      
      // Get the genre IDs for this artist
      const artistGenreIds = await db.select({
        genreId: artistGenres.genreId
      })
      .from(artistGenres)
      .where(eq(artistGenres.artistId, laLuzArtist[0].id));
      
      console.log('\nArtist genre IDs:');
      console.log(JSON.stringify(artistGenreIds, null, 2));
      
      if (artistGenreIds.length > 0) {
        // Get genre details for each genre ID
        const genreDetails = [];
        for (const genreIdObj of artistGenreIds) {
          const genre = await db.select().from(genres).where(eq(genres.id, genreIdObj.genreId));
          if (genre.length > 0) {
            genreDetails.push(genre[0]);
          }
        }
        
        console.log('\nGenre details:');
        console.log(JSON.stringify(genreDetails, null, 2));
      } else {
        console.log('No genres found for La Luz');
      }
      
      // Get events for La Luz
      const artistEvents = await db
        .select({
          id: artists.id,
          name: artists.name,
          eventId: events.id,
          eventDate: events.date,
          venueName: venues.name,
          venueCity: venues.city
        })
        .from(artists)
        .innerJoin(events, eq(events.artistId, artists.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(eq(artists.name, 'La Luz'));
        
      console.log('\nLa Luz events:');
      console.log(JSON.stringify(artistEvents, null, 2));
      
    } else {
      console.log('La Luz artist not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });