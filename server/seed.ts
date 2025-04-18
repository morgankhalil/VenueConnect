import { db } from './db';
import { users, venues, venueNetwork, events, artists, tours, tourVenues } from '../shared/schema';
import { eq, lessThanOrEqual, greaterThanOrEqual } from 'drizzle-orm';
import dotenv from 'dotenv';
import { SeedManager } from './core/seed-manager';

// Load environment variables
dotenv.config();

// Major US markets with detailed city listings
const MAJOR_MARKETS = [
  { city: 'New York', state: 'NY' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Austin', state: 'TX' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Portland', state: 'OR' },
  { city: 'Boston', state: 'MA' },
  { city: 'Philadelphia', state: 'PA' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Miami', state: 'FL' },
  { city: 'Denver', state: 'CO' },
  { city: 'Minneapolis', state: 'MN' },
  { city: 'Detroit', state: 'MI' },
  { city: 'San Francisco', state: 'CA' }
];

interface VenueFilter {
  minCapacity?: number;
  maxCapacity?: number;
  cities?: string[];
  states?: string[];
}

class SeedManager {
    async clearDatabase() {
        console.log('Clearing existing data...');
        // Clear tables in correct dependency order
        await db.delete(events);
        await db.delete(tourVenues);
        await db.delete(tours);
        await db.delete(venueNetwork);
        await db.delete(artists);
        await db.delete(venues);
        await db.delete(users);
        console.log('Database cleared');
    }

    async createVenueManager() {
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

    async getFilteredVenues(filter: VenueFilter) {
        let query = db.select().from(venues);

        if (filter.minCapacity) {
            query = query.where(greaterThanOrEqual(venues.capacity, filter.minCapacity));
        }
        if (filter.maxCapacity) {
            query = query.where(lessThanOrEqual(venues.capacity, filter.maxCapacity));
        }

        // Filter for major markets
        if (filter.states?.length) {
            query = query.where(venues.state.in(filter.states));
        }

        return await query;
    }

    async createVenueNetwork(venueList: any[]) {
        console.log('Creating venue network connections...');

        for (let i = 0; i < venueList.length; i++) {
            for (let j = i + 1; j < venueList.length; j++) {
                // Calculate approximate distance using lat/long
                const distance = Math.sqrt(
                    Math.pow(venueList[i].latitude - venueList[j].latitude, 2) +
                    Math.pow(venueList[i].longitude - venueList[j].longitude, 2)
                );

                // Trust score inversely proportional to distance
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

    async seedEvents(venueList: any[], artistList: any[]) {
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

    async run(filter: VenueFilter = { minCapacity: 50, maxCapacity: 500 }) {
        console.log('Starting database seeding...');
        console.log('Using venue filter:', filter);

        // Add major market states to filter
        filter.states = MAJOR_MARKETS.map(market => market.state);

        await this.clearDatabase();
        const manager = await this.createVenueManager();

        // Get filtered venues
        const venueList = await this.getFilteredVenues(filter);
        console.log(`Found ${venueList.length} venues matching criteria`);

        if (venueList.length === 0) {
            console.error('No venues found matching the criteria. Seeding stopped.');
            process.exit(1);
        }

        await this.createVenueNetwork(venueList);
        const artistList = await db.select().from(artists); // Added to seed events.
        await this.seedEvents(venueList, artistList); //Added to seed events

        console.log('Database seeding completed successfully');
    }
}


async function seed() {
  try {
    const manager = new SeedManager();
    await manager.run();
  } catch (error) {
    console.error('Seed process failed:', error);
    process.exit(1);
  }
}

seed();