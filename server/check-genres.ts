import { db } from './db';
import { genres } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking genre structure...');
    
    // Get all genres
    const allGenres = await db.select().from(genres);
    console.log(`Total genres: ${allGenres.length}`);
    
    // Get top-level genres (parentId is null)
    const topLevelGenres = allGenres.filter(genre => genre.parentId === null);
    console.log(`\nTop-level genres (${topLevelGenres.length}):`);
    console.log(JSON.stringify(topLevelGenres, null, 2));
    
    // Find genre hierarchy
    const genreHierarchy = [];
    
    for (const topGenre of topLevelGenres) {
      const children = allGenres.filter(genre => genre.parentId === topGenre.id);
      genreHierarchy.push({
        parent: topGenre,
        children: children
      });
    }
    
    console.log('\nGenre hierarchy:');
    for (const item of genreHierarchy) {
      console.log(`\n${item.parent.name} (ID: ${item.parent.id}):`);
      if (item.children.length > 0) {
        for (const child of item.children) {
          console.log(`  - ${child.name} (ID: ${child.id})`);
        }
      } else {
        console.log('  No subgenres');
      }
    }
    
    // Get top 10 most used genres for artists
    const topArtistGenres = await db.execute(sql`
      SELECT g.id, g.name, COUNT(ag.artist_id) as artist_count
      FROM genres g
      JOIN artist_genres ag ON g.id = ag.genre_id
      GROUP BY g.id, g.name
      ORDER BY artist_count DESC
      LIMIT 10
    `);
    
    console.log('\nTop artist genres:');
    console.log(JSON.stringify(topArtistGenres.rows, null, 2));
    
    // Get top 10 most used genres for venues
    const topVenueGenres = await db.execute(sql`
      SELECT g.id, g.name, COUNT(vg.venue_id) as venue_count
      FROM genres g
      JOIN venue_genres vg ON g.id = vg.genre_id
      GROUP BY g.id, g.name
      ORDER BY venue_count DESC
      LIMIT 10
    `);
    
    console.log('\nTop venue genres:');
    console.log(JSON.stringify(topVenueGenres.rows, null, 2));
    
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