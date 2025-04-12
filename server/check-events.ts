import { db } from './db';
import { events, venues, artists } from '../shared/schema';

async function main() {
  try {
    console.log('Checking events database...');
    
    // Get total events count
    const eventsList = await db.select().from(events);
    console.log(`Total events: ${eventsList.length}`);
    
    if (eventsList.length > 0) {
      // Sample the first event
      const sampleEvent = eventsList[0];
      console.log('\nSample event:');
      console.log(JSON.stringify(sampleEvent, null, 2));
      
      // Get venue info
      const venueInfo = await db.select().from(venues).where(eq(venues.id, sampleEvent.venueId));
      console.log('\nVenue info:');
      console.log(JSON.stringify(venueInfo[0], null, 2));
      
      // Get artist info
      const artistInfo = await db.select().from(artists).where(eq(artists.id, sampleEvent.artistId));
      console.log('\nArtist info:');
      console.log(JSON.stringify(artistInfo[0], null, 2));
      
      // Try getting details with a join
      console.log('\nAttempting to get event details with joins...');
      const eventDetails = await db
        .select({
          eventId: events.id,
          date: events.date,
          venueName: venues.name,
          venueCity: venues.city,
          artistName: artists.name
        })
        .from(events)
        .where(eq(events.id, sampleEvent.id))
        .innerJoin(venues, eq(events.venueId, venues.id))
        .innerJoin(artists, eq(events.artistId, artists.id));
      
      console.log('\nJoin results:');
      console.log(JSON.stringify(eventDetails, null, 2));
      
      // Get events grouped by venues
      console.log('\nEvents by venue:');
      const venueEventCounts = await db
        .select({
          venueId: events.venueId,
          eventCount: sql`count(*)`
        })
        .from(events)
        .groupBy(events.venueId);
      
      console.log(JSON.stringify(venueEventCounts, null, 2));
    }
  } catch (error) {
    console.error('Error checking events:', error);
  }
}

// Import needed for joins
import { eq, sql } from 'drizzle-orm';

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });