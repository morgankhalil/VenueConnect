import { db } from '../db';
import { users, venues, venueNetwork, events, artists, tours, tourVenues } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { SyncLogger } from './sync-logger';
import axios from 'axios';
import { setTimeout } from 'timers/promises';

interface VenueFilter {
  minCapacity?: number;
  maxCapacity?: number;
  cities?: string[];
  states?: string[];
}

interface VenueData {
  name: string;
  city: string;
  region?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  bandsintownId: string;
  address?: string;
  country?: string;
  zipCode?: string;
  description?: string;
  ownerId?: number;
}

interface ArtistData {
  name: string;
  imageUrl?: string;
  bandsintownId: string;
  popularity?: number;
}

interface EventData {
  datetime: string;
  status?: string;
  sourceId: string;
  artist: ArtistData;
}

export class SeedManager {
  private logger: SyncLogger;
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between API calls

  constructor() {
    this.logger = new SyncLogger('SeedManager');
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) throw new Error('BANDSINTOWN_API_KEY is required');
    this.apiKey = apiKey;
  }

  private async makeApiRequest<T>(url: string): Promise<T> {
    try {
      const response = await axios.get(url, {
        params: { app_id: this.apiKey },
        headers: { 'Accept': 'application/json' }
      });
      await setTimeout(this.rateLimitDelay); // Rate limiting
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 5 seconds...');
        await setTimeout(5000);
        return this.makeApiRequest(url);
      }
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  async clearTable(tableName: string) {
    this.logger.log(`Clearing table: ${tableName}`);
    switch (tableName) {
      case 'events':
        await db.delete(events);
        break;
      case 'tourVenues':
        await db.delete(tourVenues);
        break;
      case 'tours':
        await db.delete(tours);
        break;
      case 'venueNetwork':
        await db.delete(venueNetwork);
        break;
      case 'artists':
        await db.delete(artists);
        break;
      case 'venues':
        await db.delete(venues);
        break;
      case 'users':
        await db.delete(users);
        break;
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }

  async clearDatabase() {
    this.logger.log('Starting database clear');
    // Clear tables in correct dependency order
    const tables = ['events', 'tourVenues', 'tours', 'venueNetwork', 'artists', 'venues', 'users'];
    for (const table of tables) {
      await this.clearTable(table);
    }
    this.logger.log('Database cleared successfully');
  }

  async validateVenue(venueData: any) {
    const required = ['name', 'city', 'state'];
    for (const field of required) {
      if (!venueData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check for duplicate venue
    const existing = await db.select()
      .from(venues)
      .where(
        and(
          eq(venues.name, venueData.name),
          eq(venues.city, venueData.city)
        )
      );

    return existing.length === 0;
  }

  async seedVenue(venueData: any) {
    try {
      const isValid = await this.validateVenue(venueData);
      if (!isValid) {
        this.logger.log(`Skipping duplicate venue: ${venueData.name}`, 'warn');
        return null;
      }

      const [venue] = await db.insert(venues).values({
        name: venueData.name,
        address: venueData.address || `${venueData.name}, ${venueData.city}`,
        city: venueData.city,
        state: venueData.state,
        country: venueData.country || 'US',
        zipCode: venueData.zipCode || '',
        latitude: venueData.latitude || 0,
        longitude: venueData.longitude || 0,
        capacity: venueData.capacity || 500,
        description: venueData.description || `Venue: ${venueData.name}`,
        ownerId: venueData.ownerId || 1
      }).returning();

      this.logger.log(`Seeded venue: ${venue.name}`);
      return venue;
    } catch (error) {
      this.logger.log(`Error seeding venue ${venueData.name}: ${error}`, 'error');
      throw error;
    }
  }

  async getFilteredVenues(filter: VenueFilter) {
    let query = db.select().from(venues);

    if (filter.minCapacity) {
      query = query.where(venues.capacity >= filter.minCapacity);
    }
    if (filter.maxCapacity) {
      query = query.where(venues.capacity <= filter.maxCapacity);
    }
    if (filter.states?.length) {
      query = query.where(venues.state.in(filter.states));
    }
    if (filter.cities?.length) {
      query = query.where(venues.city.in(filter.cities));
    }

    return await query;
  }


  async getVenueEvents(venueId: string): Promise<EventData[]> {
    this.logger.log(`Fetching events for venue ${venueId}...`);
    return this.makeApiRequest<EventData[]>(
      `https://rest.bandsintown.com/venues/${venueId}/events`
    );
  }

  async seedEvent(venue: any, eventData: EventData): Promise<void> {
    try {
      const eventDate = new Date(eventData.datetime);
      const artist = await this.seedArtist(eventData.artist);

      // Check if event exists
      const existingEvent = await db.select()
        .from(events)
        .where(eq(events.sourceId, eventData.sourceId))
        .limit(1);

      if (existingEvent.length) {
        this.logger.log(`Event already exists for ${artist.name} at ${venue.name}, skipping...`);
        return;
      }

      await db.insert(events).values({
        artistId: artist.id,
        venueId: venue.id,
        date: eventDate.toISOString().split('T')[0],
        startTime: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        status: eventData.status || 'confirmed',
        sourceId: eventData.sourceId,
        sourceName: 'bandsintown'
      });

      this.logger.log(`Added event: ${artist.name} at ${venue.name}`);
    } catch (error) {
      this.logger.log(`Failed to seed event: ${error}`, 'error');
      throw error;
    }
  }

  async seedArtist(artistData: ArtistData): Promise<any> {
    try {
      // Check if artist exists
      const existingArtist = await db.select()
        .from(artists)
        .where(eq(artists.bandsintownId, artistData.bandsintownId))
        .limit(1);

      if (existingArtist.length) return existingArtist[0];

      const [artist] = await db.insert(artists).values({
        name: artistData.name,
        imageUrl: artistData.imageUrl,
        bandsintownId: artistData.bandsintownId,
        popularity: artistData.popularity || 50
      }).returning();

      this.logger.log(`Added artist: ${artistData.name}`);
      return artist;
    } catch (error) {
      this.logger.log(`Failed to seed artist ${artistData.name}: ${error}`, 'error');
      throw error;
    }
  }

  async createVenueNetwork(venueList: any[]) {
    this.logger.log('Creating venue network connections');

    for (let i = 0; i < venueList.length; i++) {
      for (let j = i + 1; j < venueList.length; j++) {
        try {
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

          this.logger.log(`Created network: ${venueList[i].name} <-> ${venueList[j].name}`);
        } catch (error) {
          this.logger.log(`Error creating network connection: ${error}`, 'error');
        }
      }
    }
  }

  async run(venueData: VenueData[]) {
    try {
      this.logger.log('Starting seed process...');
      await this.clearDatabase();

      const seededVenues = [];
      const failedVenues = [];
      let totalEvents = 0;

      // 1. Seed Venues
      for (const venue of venueData) {
        try {
          this.logger.log(`Processing venue: ${venue.name}`);
          const seededVenue = await this.seedVenue(venue);
          
          if (seededVenue) {
            seededVenues.push(seededVenue);
            
            // 2. Get Venue Events and create them (which will create artists)
            try {
              const events = await this.getVenueEvents(venue.bandsintownId);
              for (const eventData of events) {
                try {
                  await this.seedEvent(seededVenue, eventData);
                  totalEvents++;
                } catch (eventError) {
                  this.logger.log(`Failed to seed event for ${venue.name}: ${eventError}`, 'error');
                }
              }
            } catch (eventsError) {
              this.logger.log(`Failed to fetch events for ${venue.name}: ${eventsError}`, 'error');
            }
          }
        } catch (venueError) {
          this.logger.log(`Failed to process venue ${venue.name}: ${venueError}`, 'error');
          failedVenues.push(venue.name);
        }
      }

      // 3. Create Venue Network after all venues are seeded
      if (seededVenues.length > 0) {
        try {
          await this.createVenueNetwork(seededVenues);
        } catch (networkError) {
          this.logger.log(`Failed to create venue network: ${networkError}`, 'error');
        }
      }

      this.logger.log('\nSeeding completed with summary:', 'info');
      this.logger.log(`- Venues seeded successfully: ${seededVenues.length}`, 'info');
      this.logger.log(`- Failed venues: ${failedVenues.length}`, 'info');
      this.logger.log(`- Total events created: ${totalEvents}`, 'info');
      
      if (failedVenues.length > 0) {
        this.logger.log(`Failed venues: ${failedVenues.join(', ')}`, 'warning');
      }

    } catch (error) {
      this.logger.log('Seeding process failed:', 'error');
      throw error;
    }
  }
}