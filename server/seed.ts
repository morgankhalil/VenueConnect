
import { db } from './db';
import { users, venues, venueNetwork, events, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Core artists for seeding
const CORE_ARTISTS = [
  {
    name: 'Arctic Monkeys',
    genres: ['indie rock', 'alternative'],
    popularity: 85,
    imageUrl: null,
    description: 'British rock band formed in Sheffield'
  },
  {
    name: 'The Strokes',
    genres: ['indie rock', 'garage rock'],
    popularity: 80,
    imageUrl: null,
    description: 'American rock band from New York City'
  }
];

interface VenueFilter {
  minCapacity?: number;
  maxCapacity?: number;
  city?: string;
  state?: string;
}

async function clearDatabase() {
  console.log('Clearing existing data...');
  await db.delete(events);
  await db.delete(venueNetwork);
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

async function getFilteredVenues(filter: VenueFilter) {
  let query = db.select().from(venues);
  
  if (filter.minCapacity) {
    query = query.where(venues.capacity >= filter.minCapacity);
  }
  if (filter.maxCapacity) {
    query = query.where(venues.capacity <= filter.maxCapacity);
  }
  if (filter.city) {
    query = query.where(eq(venues.city, filter.city));
  }
  if (filter.state) {
    query = query.where(eq(venues.state, filter.state));
  }
  
  return await query;
}

async function seedArtists() {
  console.log('Seeding artists...');
  const insertedArtists = [];
  
  for (const artist of CORE_ARTISTS) {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    console.log(`Created artist: ${artist.name}`);
    insertedArtists.push(newArtist);
  }
  
  return insertedArtists;
}

async function createVenueNetwork(venueList: any[]) {
  console.log('Creating venue network connections...');
  
  for (let i = 0; i < venueList.length; i++) {
    for (let j = i + 1; j < venueList.length; j++) {
      const distance = Math.sqrt(
        Math.pow(venueList[i].latitude - venueList[j].latitude, 2) +
        Math.pow(venueList[i].longitude - venueList[j].longitude, 2)
      );
      
      const trustScore = Math.max(70, Math.min(95, 100 - (distance * 2)));
      
      await db.insert(venueNetwork).values({
        venueId: venueList[i].id,
        connectedVenueId: venueList[j].id,
        status: 'active',
        trustScore: Math.floor(trustScore),
        collaborativeBookings: Math.floor(Math.random() * 10) + 1
      });
      
      console.log(`Created network connection: ${venueList[i].name} <-> ${venueList[j].name}`);
    }
  }
}

async function seedEvents(venueList: any[], artistList: any[]) {
  console.log('Seeding sample events...');
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);
  
  for (const artist of artistList) {
    for (const venue of venueList) {
      const eventDate = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      );
      
      await db.insert(events).values({
        artistId: artist.id,
        venueId: venue.id,
        date: eventDate.toISOString().split('T')[0],
        startTime: '20:00',
        status: 'confirmed',
        sourceName: 'manual'
      });
      
      console.log(`Created event: ${artist.name} at ${venue.name} on ${eventDate.toISOString().split('T')[0]}`);
    }
  }
}

async function seed(filter: VenueFilter = { minCapacity: 500, maxCapacity: 5000 }) {
  try {
    console.log('Starting database seeding...');
    console.log('Using venue filter:', filter);
    
    await clearDatabase();
    const manager = await createVenueManager();
    
    // Get filtered venues
    const venueList = await getFilteredVenues(filter);
    console.log(`Found ${venueList.length} venues matching criteria`);
    
    if (venueList.length === 0) {
      console.error('No venues found matching the criteria. Seeding stopped.');
      process.exit(1);
    }
    
    const artistList = await seedArtists();
    await createVenueNetwork(venueList);
    await seedEvents(venueList, artistList);
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// You can customize the filter when running the seed function
seed({
  minCapacity: 500,
  maxCapacity: 3000,
  // city: 'New York',     // Optional: Filter by city
  // state: 'NY'          // Optional: Filter by state
});
