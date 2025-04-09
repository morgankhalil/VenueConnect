import { db } from './db';
import { users, venues, venueNetwork } from '../shared/schema';

async function seed() {
  try {
    console.log('Database connection initialized');

    // Clear all existing data
    console.log('Clearing existing data...');
    await db.delete(venueNetwork);
    await db.delete(venues);
    await db.delete(users);
    console.log('Database cleared successfully');

    // Create demo user
    const [demoUser] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    // Create initial venues
    const venueDataList = [
      {
        name: "Bug Jar",
        address: "219 Monroe Ave",
        city: "Rochester",
        state: "NY",
        zipCode: "14607",
        country: "US",
        capacity: 400,
        latitude: 43.1497,
        longitude: -77.5976,
        contactEmail: "info@bugjar.com",
        contactPhone: "585-454-2966",
        website: "http://bugjar.com",
        description: "The Bug Jar is a music venue in Rochester, NY",
        ownerId: demoUser.id
      }
    ];

    const insertedVenues = await db.insert(venues).values(venueDataList).returning();

    console.log('Database seeded successfully with venues');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

seed().catch(console.error);