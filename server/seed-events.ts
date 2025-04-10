
import { db } from './db';
import { venues, events, artists } from '../shared/schema';

async function seedEvents() {
  try {
    // Clear existing events
    await db.delete(events);
    await db.delete(artists);
    
    console.log('Seeding events for real venues...');

    // Real artists that play at indie/rock venues
    const artistsData = [
      {
        name: 'The War On Drugs',
        genres: ['rock', 'indie'],
        imageUrl: 'https://i.scdn.co/image/ab6761610000e5eb4581485760699998364cc679',
        popularity: 85
      },
      {
        name: 'Japanese Breakfast',
        genres: ['indie', 'rock'],
        imageUrl: 'https://i.scdn.co/image/ab6761610000e5eb3d24621e44ef334e17b7a111',
        popularity: 75
      },
      {
        name: 'Big Thief',
        genres: ['indie', 'folk'],
        imageUrl: 'https://i.scdn.co/image/ab6761610000e5eb7d6ead05d6fbcd0a6f795280',
        popularity: 70
      },
      {
        name: 'Spoon',
        genres: ['rock', 'indie'],
        imageUrl: 'https://i.scdn.co/image/ab6761610000e5eb7d9f5c15389aa9ad28815925',
        popularity: 80
      }
    ];

    // Insert artists
    console.log('Inserting artists...');
    const insertedArtists = await db.insert(artists).values(artistsData).returning();

    // Get all venues
    const venueResults = await db.select().from(venues);
    console.log(`Found ${venueResults.length} venues to create events for`);

    // Create events for next 6 months
    const events_to_create = [];
    const today = new Date();
    
    for (const artist of insertedArtists) {
      // Create 2-3 events per artist at different venues
      const numEvents = Math.floor(Math.random() * 2) + 2;
      const usedVenues = new Set();
      
      for (let i = 0; i < numEvents; i++) {
        // Pick a random venue that hasn't been used for this artist
        let venue;
        do {
          venue = venueResults[Math.floor(Math.random() * venueResults.length)];
        } while (usedVenues.has(venue.id));
        usedVenues.add(venue.id);

        // Random date in next 6 months
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + Math.floor(Math.random() * 180));
        
        // Random time between 7 PM and 11 PM
        const hour = Math.floor(Math.random() * 4) + 19;
        const minute = Math.floor(Math.random() * 12) * 5;
        
        events_to_create.push({
          artistId: artist.id,
          venueId: venue.id,
          date: eventDate.toISOString().split('T')[0],
          startTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          status: 'confirmed',
          ticketUrl: `https://example.com/tickets/${venue.id}/${artist.id}`,
          sourceId: `manual-seed-${artist.id}-${venue.id}`,
          sourceName: 'seed'
        });
      }
    }

    // Insert all events
    console.log(`Creating ${events_to_create.length} events...`);
    const insertedEvents = await db.insert(events).values(events_to_create).returning();
    
    console.log('Event seeding completed successfully');
    console.log(`Created ${insertedEvents.length} events`);
    
  } catch (error) {
    console.error('Error during event seeding:', error);
    process.exit(1);
  }
}

seedEvents();
