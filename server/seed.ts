
import { db } from './db';
import { users, venues, artists, events, predictions, inquiries, venueNetwork, collaborativeOpportunities, collaborativeParticipants } from '../shared/schema';

async function seed() {
  try {
    // Clear all existing data
    console.log('Clearing existing data...');
    await db.delete(collaborativeParticipants);
    await db.delete(collaborativeOpportunities);
    await db.delete(predictions);
    await db.delete(inquiries);
    await db.delete(events);
    await db.delete(venueNetwork);
    await db.delete(venues);
    await db.delete(artists);
    await db.delete(users);
    console.log('Database cleared successfully');

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

    // Insert demo venues
    const venueData = [
      {
        name: 'Bug Jar',
        address: '219 Monroe Ave',
        city: 'Rochester',
        state: 'NY',
        zipCode: '14607',
        country: 'USA',
        capacity: 300,
        latitude: 43.1517,
        longitude: -77.5959,
        description: 'The Bug Jar is a legendary Rochester music venue known for its indie and alternative shows',
        contactEmail: 'info@bugjar.com',
        contactPhone: '585-454-2966',
        website: 'http://bugjar.com',
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
