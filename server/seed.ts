
import { db } from './db';
import { users, venues, venueNetwork, events, artists } from '../shared/schema';
import { eq } from 'drizzle-orm';
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
  }
];

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

async function seedVenues(manager: any) {
  console.log('Seeding venues...');
  const insertedVenues = [];
  
  for (const venue of CORE_VENUES) {
    const [newVenue] = await db.insert(venues).values({
      ...venue,
      ownerId: manager.id
    }).returning();
    console.log(`Created venue: ${venue.name}`);
    insertedVenues.push(newVenue);
  }
  
  return insertedVenues;
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

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    await clearDatabase();
    const manager = await createVenueManager();
    const venueList = await seedVenues(manager);
    const artistList = await seedArtists();
    await createVenueNetwork(venueList);
    await seedEvents(venueList, artistList);
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding process
seed();
