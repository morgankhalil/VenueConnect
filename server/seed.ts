import { db } from './db';
import { venues, artists, events, venueNetwork } from '../shared/schema';

async function seed() {
  // Clear existing data
  await db.delete(events);
  await db.delete(venueNetwork);
  await db.delete(venues);
  await db.delete(artists);

  // Insert demo venue
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