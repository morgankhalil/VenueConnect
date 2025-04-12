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
    const tables = ['events', 'tourVenues', 'tours', 'venueNetwork', 'artists', 'users', 'venues'];
    for (const table of tables) {
      await this.clearTable(table);
    }
    this.logger.log('Database cleared successfully');
  }

  isValidVenueData(venueData: any): boolean {
    const requiredFields = ['name', 'city', 'state', 'bandsintownId'];
    return requiredFields.every(field => venueData.hasOwnProperty(field));
  }

  async seedVenue(venueData: any) {
    // Validate required venue data
    if (!this.isValidVenueData(venueData)) {
      this.logger.log(`Invalid venue data for: ${venueData.name}`, 'error');
      return null;
    }

    try {
      this.logger.log(`Processing venue: ${venueData.name}`);

      // Check for existing venue to prevent duplicates
      const existingVenue = await db.query.venues.findFirst({
        where: eq(venues.bandsintownId, venueData.bandsintownId)
      });

      if (existingVenue) {
        this.logger.log(`Venue already exists: ${venueData.name}`, 'warning');
        return existingVenue;
      }

      const seededVenue = await db.insert(venues).values({
        name: venueData.name,
        capacity: venueData.capacity || 0,
        latitude: venueData.latitude,
        longitude: venueData.longitude,
        bandsintownId: venueData.bandsintownId,
        city: venueData.city,
        state: venueData.state,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.log(`Successfully seeded venue: ${venueData.name}`, 'info');
      return seededVenue[0];
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

  async seedEvent(venue: any, eventData: EventData, stats: any): Promise<void> {
    try {
      if (!eventData.datetime || !eventData.artist || !eventData.sourceId) {
        stats.invalidData++;
        this.logger.log(`Invalid event data received`, 'warning');
        return;
      }

      const eventDate = new Date(eventData.datetime);
      if (isNaN(eventDate.getTime())) {
        stats.errors.validation++;
        this.logger.log(`Invalid date format: ${eventData.datetime}`, 'warning');
        return;
      }

      let artist;
      try {
        artist = await this.seedArtist(eventData.artist);
      } catch (artistError) {
        stats.errors.api++;
        this.logger.log(`Failed to seed artist: ${artistError}`, 'error');
        return;
      }

      // Check if event exists
      const existingEvent = await db.select()
        .from(events)
        .where(eq(events.sourceId, eventData.sourceId))
        .limit(1);

      if (existingEvent.length) {
        stats.duplicates++;
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

      stats.totalEvents++;
      this.logger.log(`Added event: ${artist.name} at ${venue.name}`);
    } catch (error) {
      stats.errors.database++;
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

      const stats = {
        seededVenues: [],
        failedVenues: [],
        totalEvents: 0,
        invalidData: 0,
        duplicates: 0,
        errors: {
          api: 0,
          database: 0,
          validation: 0
        }
      };

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
      this.logger.log(`- Venues seeded successfully: ${stats.seededVenues.length}`, 'info');
      this.logger.log(`- Failed venues: ${stats.failedVenues.length}`, 'info');
      this.logger.log(`- Invalid data entries: ${stats.invalidData}`, 'info');
      this.logger.log(`- Duplicate venues skipped: ${stats.duplicates}`, 'info');
      this.logger.log(`- Total events created: ${stats.totalEvents}`, 'info');
      this.logger.log('\nErrors:', 'info');
      this.logger.log(`- API errors: ${stats.errors.api}`, 'info');
      this.logger.log(`- Database errors: ${stats.errors.database}`, 'info');
      this.logger.log(`- Validation errors: ${stats.errors.validation}`, 'info');

      if (stats.failedVenues.length > 0) {
        this.logger.log(`Failed venues: ${stats.failedVenues.join(', ')}`, 'warning');
      }

      return stats;

    } catch (error) {
      this.logger.log('Seeding process failed:', 'error');
      throw error;
    }
  }
}