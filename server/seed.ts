
import { db } from './db';
import { users, venues, artists, events, predictions, venueNetwork } from '../shared/schema';

async function seed() {
  try {
    // Insert demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123', // In production, this should be hashed
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    // Insert demo venues
    const venueData = [
      {
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        ownerId: user.id
      },
      {
        name: 'The Fillmore',
        address: '456 Fillmore St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94117',
        country: 'USA',
        capacity: 1150,
        latitude: 37.7749,
        longitude: -122.4194,
        ownerId: user.id
      }
    ];
    
    const insertedVenues = await db.insert(venues).values(venueData).returning();

    // Insert demo artists
    const artistData = [
      {
        name: 'The Black Keys',
        genres: ['rock', 'blues'],
        popularity: 85
      },
      {
        name: 'Tame Impala',
        genres: ['indie', 'psychedelic'],
        popularity: 88
      },
      {
        name: 'Khruangbin',
        genres: ['funk', 'world'],
        popularity: 82
      }
    ];

    const insertedArtists = await db.insert(artists).values(artistData).returning();

    // Insert demo events
    const today = new Date();
    const eventData = insertedArtists.map((artist, index) => ({
      artistId: artist.id,
      venueId: insertedVenues[0].id,
      date: new Date(today.getFullYear(), today.getMonth() + index, 15).toISOString(),
      startTime: '20:00',
      status: index === 0 ? 'confirmed' : index === 1 ? 'hold' : 'opportunity'
    }));

    await db.insert(events).values(eventData);

    // Insert demo predictions
    const predictionData = insertedArtists.map((artist, index) => ({
      artistId: artist.id,
      venueId: insertedVenues[0].id,
      suggestedDate: new Date(today.getFullYear(), today.getMonth() + 2 + index, 1).toISOString(),
      confidenceScore: 75 + index * 5,
      status: 'pending',
      reasoning: 'Routing opportunity based on tour schedule'
    }));

    await db.insert(predictions).values(predictionData);

    // Insert demo venue network connections
    const networkData = {
      venueId: insertedVenues[0].id,
      connectedVenueId: insertedVenues[1].id,
      status: 'active',
      trustScore: 85,
      collaborativeBookings: 12
    };

    await db.insert(venueNetwork).values(networkData);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
