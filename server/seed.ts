
import { db } from './db';
import { users, venues, venueNetwork } from '../shared/schema';

async function seed() {
  try {
    // Clear all existing data
    console.log('Clearing existing data...');
    await db.delete(venueNetwork);

import { registerBandsintownWebhook } from './webhooks/webhook-setup';

// Function to setup webhooks after seeding
async function setupWebhooks() {
  const baseUrl = process.env.BASE_URL || 'https://venue-platform.example.com';
  const webhookUrl = `${baseUrl}/api/webhooks/bandsintown`;
  
  try {
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('BANDSINTOWN_API_KEY not configured');
      return;
    }

    const result = await registerBandsintownWebhook(webhookUrl, apiKey);
    console.log('Webhook setup result:', result);
  } catch (error) {
    console.error('Error setting up webhooks:', error);
  }
}

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

    // Create multiple small/medium venues across the US
    const venueDataList = [
      // Northeast
      {
        name: 'Paradise Rock Club',
        address: '967 Commonwealth Avenue',
        city: 'Boston',
        state: 'MA',
        zipCode: '02215',
        country: 'USA',
        capacity: 933,
        latitude: 42.3490,
        longitude: -71.1300,
        description: 'Historic venue featuring indie and alternative acts',
        ownerId: demoUser.id
      },
      {
        name: 'Black Cat',
        address: '1811 14th St NW',
        city: 'Washington',
        state: 'DC',
        zipCode: '20009',
        country: 'USA',
        capacity: 400,
        latitude: 38.9150,
        longitude: -77.0314,
        description: 'Punk and indie rock venue with two stages',
        ownerId: demoUser.id
      },
      // Midwest
      {
        name: 'First Avenue',
        address: '701 First Avenue North',
        city: 'Minneapolis',
        state: 'MN',
        zipCode: '55403',
        country: 'USA',
        capacity: 500,
        latitude: 44.9784,
        longitude: -93.2759,
        description: 'Historic venue made famous by Prince',
        ownerId: demoUser.id
      },
      {
        name: 'Metro',
        address: '3730 N Clark St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60613',
        country: 'USA',
        capacity: 1100,
        latitude: 41.9498,
        longitude: -87.6588,
        description: 'Iconic Chicago venue featuring indie and alternative acts',
        ownerId: demoUser.id
      },
      // West Coast
      {
        name: 'Neumos',
        address: '925 E Pike St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98122',
        country: 'USA',
        capacity: 650,
        latitude: 47.6137,
        longitude: -122.3196,
        description: 'Capitol Hill music venue featuring indie rock',
        ownerId: demoUser.id
      },
      {
        name: 'Bottom of the Hill',
        address: '1233 17th Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94107',
        country: 'USA',
        capacity: 350,
        latitude: 37.7649,
        longitude: -122.3969,
        description: 'Intimate venue known for indie and punk shows',
        ownerId: demoUser.id
      },
      // South
      {
        name: 'Exit/In',
        address: '2208 Elliston Pl',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37203',
        country: 'USA',
        capacity: 500,
        latitude: 36.1511,
        longitude: -86.8054,
        description: 'Historic Nashville rock venue',
        ownerId: demoUser.id
      },
      {
        name: '40 Watt Club',
        address: '285 W Washington St',
        city: 'Athens',
        state: 'GA',
        zipCode: '30601',
        country: 'USA',
        capacity: 500,
        latitude: 33.9577,
        longitude: -83.3796,
        description: 'Legendary Athens music venue',
        ownerId: demoUser.id
      },
      // Southwest
      {
        name: 'Mohawk',
        address: '912 Red River St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA',
        capacity: 450,
        latitude: 30.2708,
        longitude: -97.7362,
        description: 'Multi-level venue in the heart of Austin',
        ownerId: demoUser.id
      },
      {
        name: 'Launchpad',
        address: '618 Central Ave SW',
        city: 'Albuquerque',
        state: 'NM',
        zipCode: '87102',
        country: 'USA',
        capacity: 450,
        latitude: 35.0844,
        longitude: -106.6504,
        description: 'Downtown venue featuring local and touring acts',
        ownerId: demoUser.id
      }
    ];

    const insertedVenues = await db.insert(venues).values(venueDataList).returning();

    // Create venue network connections
    for (let i = 0; i < insertedVenues.length; i++) {
      for (let j = i + 1; j < insertedVenues.length; j++) {
        await db.insert(venueNetwork).values({
          venueId: insertedVenues[i].id,
          connectedVenueId: insertedVenues[j].id,
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
