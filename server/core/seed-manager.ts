
import { db } from '../db';
import { venues, events, artists, venueNetwork } from '../../shared/schema';
import axios from 'axios';
import { eq } from 'drizzle-orm';

export class SeedManager {
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between API calls

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
  }

  async seedVenue(venueId: string) {
    try {
      const response = await axios.get(`https://rest.bandsintown.com/venues/${venueId}`, {
        params: { app_id: this.apiKey },
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.data) throw new Error('No venue data received');
      
      const [venue] = await db.insert(venues).values({
        name: response.data.name,
        city: response.data.city,
        state: response.data.region,
        capacity: response.data.capacity || 0,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        bandsintownId: venueId
      }).returning();

      return venue;
    } catch (error) {
      console.error(`Failed to seed venue ${venueId}:`, error);
      throw error;
    }
  }

  async getVenueEvents(venueId: string) {
    try {
      const response = await axios.get(`https://rest.bandsintown.com/venues/${venueId}/events`, {
        params: { app_id: this.apiKey },
        headers: { 'Accept': 'application/json' }
      });
      
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      return response.data || [];
    } catch (error) {
      console.error(`Failed to get events for venue ${venueId}:`, error);
      return [];
    }
  }

  async seedArtistFromEvent(artistData: any) {
    try {
      const existingArtist = await db.select()
        .from(artists)
        .where(eq(artists.name, artistData.name))
        .limit(1);

      if (existingArtist.length) return existingArtist[0];

      const [artist] = await db.insert(artists).values({
        name: artistData.name,
        imageUrl: artistData.image_url,
        bandsintownId: artistData.id,
        popularity: artistData.tracker_count || 0
      }).returning();

      return artist;
    } catch (error) {
      console.error(`Failed to seed artist ${artistData.name}:`, error);
      throw error;
    }
  }

  async seedEventForVenue(venue: any, eventData: any, artist: any) {
    try {
      const eventDate = new Date(eventData.datetime);
      
      await db.insert(events).values({
        artistId: artist.id,
        venueId: venue.id,
        date: eventDate.toISOString().split('T')[0],
        startTime: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        status: eventData.status || 'confirmed',
        sourceId: eventData.id,
        sourceName: 'bandsintown'
      });
    } catch (error) {
      console.error(`Failed to seed event for ${venue.name}:`, error);
      throw error;
    }
  }

  async run() {
    try {
      await this.clearDatabase();
      
      // Known venue IDs - consider moving to config
      const venueIds = {
        'The Bug Jar': '10068739-the-bug-jar',
        'The Bowery Ballroom': '1847-the-bowery-ballroom',
        'The 9:30 Club': '209-9-30-club'
      };

      for (const [venueName, venueId] of Object.entries(venueIds)) {
        console.log(`Processing venue: ${venueName}`);
        
        // 1. Seed venue
        const venue = await this.seedVenue(venueId);
        
        // 2. Get venue events
        const events = await this.getVenueEvents(venueId);
        
        // 3. Process each event and extract artists
        for (const eventData of events) {
          if (!eventData.artist) continue;
          
          // 4. Seed artist from event
          const artist = await this.seedArtistFromEvent(eventData.artist);
          
          // 5. Create event
          await this.seedEventForVenue(venue, eventData, artist);
        }
        
        // Rate limiting between venues
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }

      console.log('Seeding completed successfully');
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }
}
