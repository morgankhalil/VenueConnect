import { db } from './db';
import { venues, events, artists } from '../shared/schema';
import { syncVenueEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seedEvents() {
  try {
    // Clear existing events and artists
    await db.delete(events);
    await db.delete(artists);

    console.log('Seeding events for real venues...');

    // Get all venues from the database
    const allVenues = await db.select().from(venues);
    console.log(`Found ${allVenues.length} venues to create events for`);

    // Known Bandsintown venue IDs
    const venueIds = {
      'The Bug Jar': '2069739-the-bug-jar',
      'The Bowery Ballroom': '1847-the-bowery-ballroom',
      'The 9:30 Club': '209-9-30-club',
      'The Troubadour': '1941-the-troubadour',
      'The Fillmore': '1155-the-fillmore',
      'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
      'The Ryman Auditorium': '897-ryman-auditorium',
      'House of Blues': '1847-house-of-blues-chicago'
    };

    let totalEventsCreated = 0;

    // Process each venue
    for (const venue of allVenues) {
      const venueId = venueIds[venue.name];

      if (!venueId) {
        console.log(`No Bandsintown ID found for venue: ${venue.name}`);
        continue;
      }

      console.log(`Processing venue: ${venue.name} (${venueId})`);

      try {
        const eventCount = await syncVenueEventsFromBandsInTown(venueId);
        console.log(`Created ${eventCount} events for ${venue.name}`);
        totalEventsCreated += eventCount;
      } catch (error) {
        console.error(`Error syncing events for ${venue.name}:`, error);
      }
    }

    console.log(`Event seeding completed successfully`);
    console.log(`Created ${totalEventsCreated} events`);

  } catch (error) {
    console.error('Error during event seeding:', error);
    process.exit(1);
  }
}

seedEvents();