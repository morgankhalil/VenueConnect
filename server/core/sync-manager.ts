import { db } from '../db';
import { events, artists, venues } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import { SyncLogger } from './sync-logger';

export class SyncManager {
  private apiKey: string;
  private rateLimitDelay = 1000; // 1 second between API calls
  private stats = {
    eventsUpdated: 0,
    artistsUpdated: 0,
    venuesUpdated: 0,
    errors: 0
  };
  private logger: SyncLogger;

  private init() {
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) throw new Error('BANDSINTOWN_API_KEY is required');
    this.apiKey = apiKey;
    this.logger = new SyncLogger();
  }

  private async makeApiRequest<T>(url: string): Promise<T> {
    try {
      this.logger.log(`Making API request to: ${url}`, 'info');
      const response = await axios.get(url, {
        params: { app_id: this.apiKey },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VenueNetwork/1.0'
        }
      });
      await setTimeout(this.rateLimitDelay);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 5 seconds...');
        await setTimeout(5000);
        return this.makeApiRequest(url);
      }
      throw error;
    }
  }

  async syncVenue(venueId: string) {
    try {
      this.logger.log(`Starting sync for venue ${venueId}`, 'info');
      const data = await this.makeApiRequest(
        `https://rest.bandsintown.com/venues/${venueId}/events`
      );

      // Update venue events
      for (const event of data) {
        await this.syncEvent(event);
      }

      await db.update(venues)
        .set({ lastSyncedAt: new Date() })
        .where(eq(venues.bandsintownId, venueId));

      this.stats.venuesUpdated++;
    } catch (error) {
      console.error(`Failed to sync venue ${venueId}:`, error);
      this.stats.errors++;
    }
  }

  async syncEvent(eventData: any) {
    try {
      const artist = await this.syncArtist(eventData.artist);
      const eventDate = new Date(eventData.datetime);

      const [existingEvent] = await db.select()
        .from(events)
        .where(eq(events.sourceId, eventData.id));

      if (existingEvent) {
        await db.update(events)
          .set({
            status: eventData.status || 'confirmed',
            lastSyncedAt: new Date()
          })
          .where(eq(events.id, existingEvent.id));
      } else {
        await db.insert(events).values({
          artistId: artist.id,
          venueId: eventData.venue.id,
          date: eventDate.toISOString().split('T')[0],
          startTime: eventDate.toTimeString().split(' ')[0].substring(0, 5),
          status: eventData.status || 'confirmed',
          sourceId: eventData.id,
          sourceName: 'bandsintown',
          lastSyncedAt: new Date()
        });
      }

      this.stats.eventsUpdated++;
    } catch (error) {
      console.error('Failed to sync event:', error);
      this.stats.errors++;
    }
  }

  async syncArtist(artistData: any) {
    try {
      const [existingArtist] = await db.select()
        .from(artists)
        .where(eq(artists.bandsintownId, artistData.id));

      if (existingArtist) {
        await db.update(artists)
          .set({
            popularity: artistData.tracker_count
              ? Math.min(100, Math.floor(artistData.tracker_count / 1000))
              : existingArtist.popularity,
            lastSyncedAt: new Date()
          })
          .where(eq(artists.id, existingArtist.id));
        return existingArtist;
      }

      const [newArtist] = await db.insert(artists).values({
        name: artistData.name,
        imageUrl: artistData.image_url,
        bandsintownId: artistData.id,
        popularity: artistData.tracker_count
          ? Math.min(100, Math.floor(artistData.tracker_count / 1000))
          : 50,
        lastSyncedAt: new Date()
      }).returning();

      this.stats.artistsUpdated++;
      return newArtist;
    } catch (error) {
      console.error(`Failed to sync artist ${artistData.name}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  async run() {
    try {
      console.log('Starting sync process...');

      const venueList = await db.select().from(venues);

      for (const venue of venueList) {
        if (venue.bandsintownId) {
          await this.syncVenue(venue.bandsintownId);
        }
      }

      console.log('\nSync completed!');
      console.log('Statistics:', this.stats);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }
}