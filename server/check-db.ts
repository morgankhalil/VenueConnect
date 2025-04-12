
import { db } from './db';
import { artists, events } from '../shared/schema';

async function checkDatabase() {
  console.log('Checking database contents...');
  
  const artistCount = await db.select().from(artists);
  console.log(`Found ${artistCount.length} artists:`);
  for (const artist of artistCount) {
    console.log(`- ${artist.name}`);
  }

  const eventCount = await db.select().from(events);
  console.log(`\nFound ${eventCount.length} events:`);
  for (const event of eventCount) {
    console.log(`- Artist ID: ${event.artistId}, Venue ID: ${event.venueId}, Date: ${event.date}`);
  }
}

checkDatabase();
