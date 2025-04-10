
import { db } from './db';
import { users, venues, venueNetwork, events, artists, tours } from '../shared/schema';
import { syncVenueEventsFromBandsInTown } from './data-sync/bands-in-town-sync';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Core venue data with known Bandsintown IDs
const CORE_VENUES = [
  {
    name: 'The Bowery Ballroom',
    address: '6 Delancey St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    capacity: 575,
    latitude: 40.7204,
    longitude: -73.9934,
    description: 'Historic Manhattan venue known for indie rock shows',
    bandsintownId: '1847-the-bowery-ballroom',
    website: 'https://boweryballroom.com',
    contactEmail: 'info@boweryballroom.com'
  },
  {
    name: 'The 9:30 Club',
    address: '815 V St NW',
    city: 'Washington',
    state: 'DC',
    country: 'USA',
    capacity: 1200,
    latitude: 38.9178,
    longitude: -77.0230,
    description: 'Legendary DC music venue',
    bandsintownId: '209-9-30-club',
    website: 'https://930.com',
    contactEmail: 'info@930.com'
  },
  {
    name: 'House of Blues',
    address: '329 N Dearborn St',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    capacity: 1800,
    latitude: 41.8879,
    longitude: -87.6295,
    description: 'Famous blues and rock venue',
    bandsintownId: '1847-house-of-blues-chicago',
    website: 'https://houseofblues.com/chicago',
    contactEmail: 'info@hob.com'
  }
];

async function clearDatabase() {
  console.log('Clearing existing data...');
  await db.delete(venueNetwork);
  await db.delete(events);
  await db.delete(tours);
  await db.delete(artists);
  await db.delete(venues);
  await db.delete(users);
  console.log('Database cleared');
}

async function createVenueManager() {
  console.log('Creating venue manager...');
  const [manager] = await db.insert(users).values({
    username: 'manager',
    password: 'venue123',
    name: 'Demo User',
    email: 'manager@venues.com',
    role: 'venue_manager'
  }).returning();
  return manager;
}

async function seedVenues(manager: any) {
  console.log('Seeding venues...');
  const insertedVenues = [];
  
  for (const venue of CORE_VENUES) {
    const [newVenue] = await db.insert(venues).values({
      ...venue,
      ownerId: manager.id
    }).returning();
    insertedVenues.push(newVenue);
  }
  
  return insertedVenues;
}

async function createVenueNetwork(venues: any[]) {
  console.log('Creating venue network...');
  for (let i = 0; i < venues.length; i++) {
    for (let j = i + 1; j < venues.length; j++) {
      const distance = Math.sqrt(
        Math.pow(venues[i].latitude - venues[j].latitude, 2) +
        Math.pow(venues[i].longitude - venues[j].longitude, 2)
      );
      
      const trustScore = Math.max(70, Math.min(95, 100 - (distance * 2)));
      
      await db.insert(venueNetwork).values({
        venueId: venues[i].id,
        connectedVenueId: venues[j].id,
        status: 'active',
        trustScore: Math.floor(trustScore),
        collaborativeBookings: Math.floor(Math.random() * 10) + 1
      });
    }
  }
}

async function syncEvents(venues: any[]) {
  console.log('Syncing events from Bandsintown...');
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
    return;
  }

  for (const venue of venues) {
    if (!venue.bandsintownId) continue;
    
    try {
      console.log(`Syncing events for ${venue.name}`);
      const eventCount = await syncVenueEventsFromBandsInTown(venue.bandsintownId, venue.name);
      console.log(`Created ${eventCount} events for ${venue.name}`);
    } catch (error) {
      console.error(`Error syncing events for ${venue.name}:`, error);
    }
  }
}

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    await clearDatabase();
    const manager = await createVenueManager();
    const venues = await seedVenues(manager);
    await createVenueNetwork(venues);
    await syncEvents(venues);
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding process
seed();
