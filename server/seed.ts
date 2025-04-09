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

    // Create demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    // Insert Bug Jar venue
    const [venue] = await db.insert(venues).values({
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
    }).returning();

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();