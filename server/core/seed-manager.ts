
import { db } from '../db';
import { venues, events, artists, venueNetwork } from '../../shared/schema';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';

interface VenueData {
  name: string;
  city: string;
  region?: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  bandsintownId: string;
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
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between API calls
  private stats = {
    venues: 0,
    events: 0,
    artists: 0,
    networkConnections: 0
  };

  constructor() {
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) throw new Error('BANDSINTOWN_API_KEY is required');
    this.apiKey = apiKey;
  }

  async clearDatabase() {
    console.log('Clearing database in correct order...');
    await db.delete(events);
    await db.delete(venueNetwork);
    await db.delete(artists);
    await db.delete(venues);
    console.log('Database cleared');
  }

  private async makeApiRequest<T>(url: string): Promise<T> {
    try {
      const response = await axios.get(url, {
        params: { app_id: this.apiKey },
        headers: { 'Accept': 'application/json' }
      });
      await setTimeout(this.rateLimitDelay); // Rate limiting
      return response.data;
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  async seedVenue(venueId: string): Promise<any> {
    try {
      console.log(`Fetching venue data for ${venueId}...`);
      const data = await this.makeApiRequest<VenueData>(
        `https://rest.bandsintown.com/venues/${venueId}`
      );
      
      const [venue] = await db.insert(venues).values({
        name: data.name,
        city: data.city,
        state: data.region,
        capacity: data.capacity || 0,
        latitude: data.latitude,
        longitude: data.longitude,
        bandsintownId: venueId
      }).returning();

      this.stats.venues++;
      return venue;
    } catch (error) {
      console.error(`Failed to seed venue ${venueId}:`, error);
      throw error;
    }
  }

  async getVenueEvents(venueId: string): Promise<EventData[]> {
    console.log(`Fetching events for venue ${venueId}...`);
    return this.makeApiRequest<EventData[]>(
      `https://rest.bandsintown.com/venues/${venueId}/events`
    );
  }

  async seedArtist(artistData: ArtistData): Promise<any> {
    try {
      // Check if artist already exists
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

      this.stats.artists++;
      return artist;
    } catch (error) {
      console.error(`Failed to seed artist ${artistData.name}:`, error);
      throw error;
    }
  }

  async seedEvent(venue: any, eventData: EventData, artist: any): Promise<void> {
    try {
      const eventDate = new Date(eventData.datetime);
      
      await db.insert(events).values({
        artistId: artist.id,
        venueId: venue.id,
        date: eventDate.toISOString().split('T')[0],
        startTime: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        status: eventData.status || 'confirmed',
        sourceId: eventData.sourceId,
        sourceName: 'bandsintown'
      });

      this.stats.events++;
    } catch (error) {
      console.error(`Failed to seed event:`, error);
      throw error;
    }
  }

  async createVenueNetwork(venues: any[]): Promise<void> {
    console.log('Creating venue network connections...');
    
    for (let i = 0; i < venues.length; i++) {
      for (let j = i + 1; j < venues.length; j++) {
        const venue1 = venues[i];
        const venue2 = venues[j];
        
        if (!venue1.latitude || !venue2.latitude) continue;

        // Calculate approximate distance
        const distance = Math.sqrt(
          Math.pow(venue1.latitude - venue2.latitude, 2) +
          Math.pow(venue1.longitude - venue2.longitude, 2)
        );

        // Trust score inversely proportional to distance
        const trustScore = Math.max(70, Math.min(95, 100 - (distance * 2)));

        await db.insert(venueNetwork).values({
          venueId: venue1.id,
          connectedVenueId: venue2.id,
          status: 'active',
          trustScore: Math.floor(trustScore)
        });

        this.stats.networkConnections++;
      }
    }
  }

  async run(venueIds: Record<string, string>) {
    try {
      console.log('Starting seed process...');
      await this.clearDatabase();
      
      const seededVenues = [];
      
      // 1. Seed Venues
      for (const [venueName, venueId] of Object.entries(venueIds)) {
        console.log(`Processing venue: ${venueName}`);
        const venue = await this.seedVenue(venueId);
        seededVenues.push(venue);
        
        // 2. Get Venue Events
        const events = await this.getVenueEvents(venueId);
        
        // 3. Process Events and Artists
        for (const eventData of events) {
          if (!eventData.artist) continue;
          
          // 4. Seed Artist from Event
          const artist = await this.seedArtist(eventData.artist);
          
          // 5. Create Event
          await this.seedEvent(venue, eventData, artist);
        }
      }

      // 6. Create Venue Network
      await this.createVenueNetwork(seededVenues);

      console.log('\nSeeding completed successfully!');
      console.log('Statistics:');
      console.log(`- Venues seeded: ${this.stats.venues}`);
      console.log(`- Events created: ${this.stats.events}`);
      console.log(`- Artists added: ${this.stats.artists}`);
      console.log(`- Network connections: ${this.stats.networkConnections}`);

    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }
}
