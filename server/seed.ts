import { db } from './db';
import { venues, artists, events, venueNetwork } from '../shared/schema';

async function seed() {
  // Clear existing data
  await db.delete(events);
  await db.delete(venueNetwork);
  await db.delete(venues);
  await db.delete(artists);

  // Insert demo venue
  // Seed main venue
  const demoVenue = await db.insert(venues).values({
    id: 1,
    name: "The Echo Lounge",
    address: "435 W Town St",
    city: "Columbus",
    state: "OH",
    zipCode: "43215",
    country: "USA",
    capacity: 1000,
    latitude: 39.9612,
    longitude: -82.9988,
    contactEmail: "booking@echocolumbus.com",
    contactPhone: "(614) 555-0123",
    website: "https://echocolumbus.com",
    description: "The Echo Lounge is a premier music venue in Columbus, featuring state-of-the-art sound systems and an intimate atmosphere for performances."
  }).returning();

  console.log("Seeded demo venue:", demoVenue);
}

seed().catch(console.error);

  // Seed connected venues
  const connectedVenues = await db.insert(venues).values([
    {
      name: 'The Blue Room',
      address: '123 Music Ave',
      city: 'Nashville',
      state: 'TN',
      zipCode: '37203',
      country: 'USA',
      capacity: 800,
      latitude: 36.1627,
      longitude: -86.7816,
      contactEmail: 'booking@blueroom.com',
      contactPhone: '(615) 555-0123',
      website: 'https://blueroom.com',
      description: 'Historic Nashville music venue known for launching country music careers.'
    },
    {
      name: 'The Sound Garden',
      address: '456 Pike St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA',
      capacity: 1200,
      latitude: 47.6062,
      longitude: -122.3321,
      contactEmail: 'info@soundgarden.com',
      contactPhone: '(206) 555-0123',
      website: 'https://soundgarden.com',
      description: 'Premier rock venue in the heart of Seattle.'
    }
  ]).returning();

  // Create network connections
  await db.insert(venueNetwork).values([
    {
      venueId: demoVenue[0].id,
      connectedVenueId: connectedVenues[0].id,
      status: 'active',
      trustScore: 85,
      collaborativeBookings: 12
    },
    {
      venueId: demoVenue[0].id,
      connectedVenueId: connectedVenues[1].id,
      status: 'active',
      trustScore: 90,
      collaborativeBookings: 8
    }
  ]);

  console.log('Seeded connected venues:', connectedVenues);
