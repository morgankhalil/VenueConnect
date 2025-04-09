
import { db } from './db';
import { users, venues, artists, events, predictions, venueNetwork, collaborativeOpportunities, collaborativeParticipants } from '../shared/schema';

async function seed() {
  try {
    // Get or create demo user
    let user = (await db.select().from(users).where(eq(users.username, 'demo')))[0];
    
    if (!user) {
      [user] = await db.insert(users).values({
        username: 'demo',
        password: 'demo123', // In production, this should be hashed
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'venue_manager'
      }).returning();
    }

    // Clear existing demo data
    await db.delete(events);
    await db.delete(venues);
    await db.delete(artists);
    
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
        name: 'Japanese Breakfast',
        genres: ['indie', 'pop'],
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
    const predictionData = [
      {
        artistId: insertedArtists[0].id,
        venueId: insertedVenues[0].id,
        suggestedDate: new Date(2025, 1, 18).toISOString(),
        confidenceScore: 92,
        status: 'pending',
        reasoning: 'Strong match based on venue capacity and artist routing'
      },
      {
        artistId: insertedArtists[1].id,
        venueId: insertedVenues[0].id,
        suggestedDate: new Date(2025, 2, 15).toISOString(),
        confidenceScore: 88,
        status: 'pending',
        reasoning: 'Artist has performed at similar venues in the region'
      }
    ];

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

    // Insert collaborative opportunities
    const [opportunity] = await db.insert(collaborativeOpportunities).values({
      artistId: insertedArtists[1].id,
      creatorVenueId: insertedVenues[0].id,
      dateRangeStart: new Date(2025, 2, 15).toISOString(),
      dateRangeEnd: new Date(2025, 2, 30).toISOString(),
      status: 'pending'
    }).returning();

    // Insert collaborative participants
    await db.insert(collaborativeParticipants).values([
      {
        opportunityId: opportunity.id,
        venueId: insertedVenues[0].id,
        status: 'pending'
      },
      {
        opportunityId: opportunity.id,
        venueId: insertedVenues[1].id,
        status: 'pending'
      }
    ]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
