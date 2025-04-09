import { db } from './db';
import { 
  users, venues, artists, events, predictions, inquiries, 
  venueNetwork, collaborativeOpportunities, collaborativeParticipants,
  webhookConfigurations
} from '../shared/schema';

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
    await db.delete(webhookConfigurations);
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

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      password: 'admin123',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }).returning();

    // Insert predefined webhook configurations
    await db.insert(webhookConfigurations).values([
      {
        name: 'Bandsintown Event Notifications',
        description: 'Receive notifications when new events are created on Bandsintown',
        type: 'bandsintown_events',
        callbackUrl: '/api/webhooks/bandsintown/events',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          events: ['event.created', 'event.updated', 'event.canceled'],
          version: '1.0'
        })
      },
      {
        name: 'Artist Updates',
        description: 'Receive notifications about artist profile updates',
        type: 'artist_updates',
        callbackUrl: '/api/webhooks/artists/updates',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          includeImages: true,
          includeGenres: true,
          version: '1.0'
        })
      },
      {
        name: 'Venue Capacity Changes',
        description: 'Get notified when venue capacity information changes',
        type: 'venue_capacity',
        callbackUrl: '/api/webhooks/venues/capacity',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          thresholdPercentage: 10,
          notifyOnIncrease: true,
          notifyOnDecrease: true,
          version: '1.0'
        })
      }
    ]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();