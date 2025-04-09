
import { db } from './db';
import { users, venues, artists, events, predictions, venueNetwork, collaborativeOpportunities, collaborativeParticipants, inquiries } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  try {
    // Clear existing data
    await db.delete(collaborativeParticipants);
    await db.delete(collaborativeOpportunities);
    await db.delete(predictions);
    await db.delete(inquiries);
    await db.delete(events);
    await db.delete(venueNetwork);
    await db.delete(venues);
    await db.delete(artists);
    await db.delete(users);

    // Create demo user
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
      },
      {
        name: '9:30 Club',
        address: '815 V St NW',
        city: 'Washington',
        state: 'DC',
        zipCode: '20001',
        country: 'USA',
        capacity: 1200,
        latitude: 38.9172,
        longitude: -77.0250,
        ownerId: user.id
      },
      {
        name: 'First Avenue',
        address: '701 N 1st Ave',
        city: 'Minneapolis',
        state: 'MN',
        zipCode: '55403',
        country: 'USA',
        capacity: 1550,
        latitude: 44.9781,
        longitude: -93.2763,
        ownerId: user.id
      }
    ];

    const insertedVenues = await db.insert(venues).values(venueData).returning();

    // Insert demo artists with more realistic data
    const artistData = [
      {
        name: 'Fleet Foxes',
        genres: ['indie', 'folk'],
        popularity: 89
      },
      {
        name: 'Japanese Breakfast',
        genres: ['indie', 'pop'],
        popularity: 88
      },
      {
        name: 'Khruangbin',
        genres: ['rock', 'world'],
        popularity: 85
      },
      {
        name: 'The National',
        genres: ['indie', 'rock'],
        popularity: 90
      },
      {
        name: 'Big Thief',
        genres: ['indie', 'folk'],
        popularity: 87
      }
    ];

    const insertedArtists = await db.insert(artists).values(artistData).returning();

    // Insert more varied events
    const eventTypes = ['confirmed', 'hold', 'opportunity', 'inquiry'];
    const events = [];
    
    for (let i = 0; i < 20; i++) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 90));
      
      events.push({
        artistId: insertedArtists[Math.floor(Math.random() * insertedArtists.length)].id,
        venueId: insertedVenues[Math.floor(Math.random() * insertedVenues.length)].id,
        date: eventDate.toISOString(),
        startTime: '20:00',
        status: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        ticketUrl: 'https://example.com/tickets'
      });
    }

    await db.insert(events).values(events);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
