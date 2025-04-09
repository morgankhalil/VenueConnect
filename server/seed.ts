import { db } from './db';
import { users, venues, venueNetwork } from '../shared/schema';

async function seed() {
  try {
    // Clear all existing data
    console.log('Clearing existing data...');
    await db.delete(venueNetwork);
    await db.delete(venues);
    await db.delete(users);
    console.log('Database cleared successfully');

    // Create demo users
    const [demoUser] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    // Create multiple small/medium venues similar to Bug Jar
    const venueData = [
      {
        name: 'Bug Jar',
        address: '219 Monroe Ave',
        city: 'Rochester',
        state: 'NY',
        zipCode: '14607',
        country: 'USA',
        capacity: 400,
        latitude: 43.1497,
        longitude: -77.5976,
        description: 'Intimate venue known for indie rock and punk shows',
        ownerId: demoUser.id
      },
      {
        name: 'Middle East Upstairs',
        address: '472 Massachusetts Ave',
        city: 'Cambridge',
        state: 'MA',
        zipCode: '02139',
        country: 'USA',
        capacity: 194,
        latitude: 42.3647,
        longitude: -71.1042,
        description: 'Intimate rock club featuring indie and local acts',
        ownerId: demoUser.id
      },
      {
        name: 'Great Scott',
        address: '1222 Commonwealth Ave',
        city: 'Boston',
        state: 'MA',
        zipCode: '02134',
        country: 'USA',
        capacity: 240,
        latitude: 42.3502,
        longitude: -71.1340,
        description: 'Long-running rock club with indie and alternative shows',
        ownerId: demoUser.id
      },
      {
        name: 'Mercury Lounge',
        address: '217 E Houston St',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        country: 'USA',
        capacity: 250,
        latitude: 40.7222,
        longitude: -73.9867,
        description: 'Historic Lower East Side venue known for indie rock',
        ownerId: demoUser.id
      },
      {
        name: 'Boot & Saddle',
        address: '1131 S Broad St',
        city: 'Philadelphia',
        state: 'PA',
        zipCode: '19147',
        country: 'USA',
        capacity: 150,
        latitude: 39.9336,
        longitude: -75.1685,
        description: 'Intimate venue featuring indie and alternative acts',
        ownerId: demoUser.id
      },
      {
        name: 'Empty Bottle',
        address: '1035 N Western Ave',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60622',
        country: 'USA',
        capacity: 400,
        latitude: 41.9002,
        longitude: -87.6872,
        description: 'Longtime indie rock club with an intimate setting',
        ownerId: demoUser.id
      }
    ];

    const venues = await db.insert(venues).values(venueData).returning();

    // Create venue network connections
    for (let i = 0; i < venues.length; i++) {
      for (let j = i + 1; j < venues.length; j++) {
        await db.insert(venueNetwork).values({
          venueId: venues[i].id,
          connectedVenueId: venues[j].id,
          status: 'active',
          trustScore: Math.floor(Math.random() * 30) + 70, // 70-100
          collaborativeBookings: Math.floor(Math.random() * 5) // 0-5 initial collaborations
        });
      }
    }

    console.log('Database seeded successfully with venues');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();