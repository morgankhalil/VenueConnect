import { db } from './db';
import { tours, venues, artists, events } from '../shared/schema';

async function testDatabaseConnection() {
  console.log('Testing database connection and queries...');
  try {
    // Test venue query
    console.log('Testing venue query...');
    const venuesResult = await db.select().from(venues).limit(5);
    console.log(`Found ${venuesResult.length} venues`);
    
    // Test artist query
    console.log('Testing artist query...');
    const artistsResult = await db.select().from(artists).limit(5);
    console.log(`Found ${artistsResult.length} artists`);
    
    // Test events query
    console.log('Testing events query...');
    const eventsResult = await db.select().from(events).limit(5);
    console.log(`Found ${eventsResult.length} events`);
    
    // Test tours query
    console.log('Testing tours query...');
    const toursResult = await db.select().from(tours).limit(5);
    console.log(`Found ${toursResult.length} tours`);
    
    // Join query to test relations
    console.log('Testing join query...');
    const eventsWithVenueAndArtist = await db.select({
      eventId: events.id,
      eventDate: events.date,
      artistName: artists.name,
      venueName: venues.name
    })
    .from(events)
    .leftJoin(artists, events.artistId, artists.id)
    .leftJoin(venues, events.venueId, venues.id)
    .limit(5);
    
    console.log(`Found ${eventsWithVenueAndArtist.length} events with venue and artist information`);
    if (eventsWithVenueAndArtist.length > 0) {
      console.log('Sample event:', eventsWithVenueAndArtist[0]);
    }
    
    console.log('All database tests completed successfully!');
  } catch (error) {
    console.error('Error testing database:', error);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);