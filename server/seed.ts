import { db } from './db';
import { 
  users, venues, artists, events, predictions, inquiries, 
  venueNetwork, collaborativeOpportunities, collaborativeParticipants,
  webhookConfigurations
} from '../shared/schema';
import { syncArtistFromBandsInTown, syncArtistEventsFromBandsInTown } from './data-sync/bands-in-town-sync';

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

    // Create demo users
    const [demoUser] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      password: 'admin123',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }).returning();

    // Create multiple venues across different cities
    const venueData = [
      {
        name: 'Brooklyn Steel',
        address: '319 Frost St',
        city: 'Brooklyn',
        state: 'NY',
        zipCode: '11222',
        country: 'USA',
        capacity: 1800,
        latitude: 40.7156,
        longitude: -73.9384,
        description: 'Modern venue known for indie and electronic shows',
        ownerId: demoUser.id
      },
      {
        name: 'Union Transfer',
        address: '1026 Spring Garden St',
        city: 'Philadelphia',
        state: 'PA',
        zipCode: '19123',
        country: 'USA',
        capacity: 1200,
        latitude: 39.9615,
        longitude: -75.1532,
        description: 'Historic venue in a former railway baggage handling facility',
        ownerId: demoUser.id
      },
      {
        name: 'Black Cat',
        address: '1811 14th St NW',
        city: 'Washington',
        state: 'DC',
        zipCode: '20009',
        country: 'USA',
        capacity: 700,
        latitude: 38.9147,
        longitude: -77.0318,
        description: 'Iconic DC venue featuring indie rock and punk shows',
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
          collaborativeBookings: Math.floor(Math.random() * 15) + 5 // 5-20
        });
      }
    }

    // Sync real artists that commonly play these types of venues
    const artistNames = [
      'The National',
      'Japanese Breakfast',
      'Big Thief',
      'Kurt Vile',
      'Mitski',
      'Spoon',
      'Angel Olsen',
      'Beach House',
      'Parquet Courts',
      'Sharon Van Etten',
      'Car Seat Headrest',
      'Snail Mail',
      'Lucy Dacus',
      'Real Estate',
      'The War on Drugs'
    ];

    const sampleArtists = [];
    for (const name of artistNames) {
      try {
        const artist = await syncArtistFromBandsInTown(name);
        if (artist) {
          sampleArtists.push(artist);
          console.log(`Added artist: ${artist.name}`);

          // Also sync events for this artist
          const events = await syncArtistEventsFromBandsInTown(name);
          console.log(`Synced ${events.length} events for ${artist.name}`);
        }
      } catch (err) {
        console.error(`Error syncing artist ${name}:`, err);
      }
    }

    // Insert webhook configurations
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
      }
    ]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();