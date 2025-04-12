import { db } from '../db';
import { venues, artists, events } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { SyncLogger } from './sync-logger';

interface ConcertsVenue {
  id: string;
  title: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  long: number;
  address: string;
  postal_code: string;
  capacity?: number;
}

interface ConcertsEvent {
  id: string;
  title: string;
  datetime: string;
  venue: ConcertsVenue;
  status: string;
  artist: {
    id: string;
    name: string;
    image_url?: string;
  };
}

export class ConcertsApiSeeder {
  private logger: SyncLogger;
  private apiKey: string;
  private artistMap: Map<string, string> = new Map();
  private readonly ARTIST_MAP_FILE = 'server/data/artist-mappings.json';

  constructor() {
    this.logger = new SyncLogger('ConcertsApiSeeder');
    const apiKey = process.env.CONCERTS_API_KEY;
    if (!apiKey) throw new Error('CONCERTS_API_KEY environment variable is required');
    this.apiKey = apiKey;
  }

  private async searchArtistEvents(artistName: string, retries = 3): Promise<ConcertsEvent[]> {
    try {
      this.logger.log(`Requesting events for artist: ${artistName}`);
      
      // Use RapidAPI endpoint with proper API key
      const response = await axios.get('https://concerts-artists-events-tracker.p.rapidapi.com/search', {
        params: {
          keyword: artistName,
          type: 'event'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        },
        timeout: 30000, // 30 second timeout (shorter to fail faster on issues)
        validateStatus: status => status < 500 // Only retry on 5xx errors
      });
      
      if (!response.data || !response.data.data) {
        this.logger.log(`No data returned for ${artistName}`, 'warning');
        return [];
      }
      
      this.logger.log(`Found ${response.data.data.length} events for ${artistName}`);
      return response.data.data || [];
    } catch (error: any) {
      // Check for rate limiting specifically
      if (axios.isAxiosError(error) && error.response && (error.response.status === 429 || error.response.status === 403)) {
        this.logger.log(`API rate limit reached for ${artistName}. Status: ${error.response.status}`, 'error');
        
        if (retries > 0) {
          // Rate limit - wait longer before retrying (exponential backoff)
          const waitTime = 2000 * Math.pow(2, 4-retries);
          this.logger.log(`Rate limit hit. Waiting ${waitTime}ms before retry ${4-retries}/3`, 'info');
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.searchArtistEvents(artistName, retries - 1);
        }
      } else if (retries > 0 && (axios.isAxiosError(error) && 
                (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET'))) {
        // Network issues - retry with backoff
        this.logger.log(`Network error: ${error.code}. Retry ${4-retries}/3 for ${artistName}`, 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.searchArtistEvents(artistName, retries - 1);
      }
      
      this.logger.log(`Failed to fetch events for ${artistName}: ${error.message || error}`, 'error');
      return [];
    }
  }

  async addVenueToDatabase(venue: ConcertsVenue) {
    try {
      // Check for existing venue
      const existingVenue = await db.select().from(venues)
        .where(eq(venues.name, venue.title))
        .limit(1);

      if (existingVenue.length > 0) {
        return existingVenue[0].id;
      }

      // Add new venue
      const [newVenue] = await db.insert(venues).values({
        name: venue.title,
        city: venue.city,
        state: venue.state,
        country: venue.country || 'US',
        latitude: venue.lat,
        longitude: venue.long,
        address: venue.address,
        zipCode: venue.postal_code,
        capacity: venue.capacity || Math.floor(Math.random() * 1000) + 200,
        description: `Music venue in ${venue.city}, ${venue.state}`
      }).returning();

      this.logger.log(`Added venue: ${venue.title}`);
      return newVenue.id;
    } catch (error) {
      this.logger.log(`Failed to add venue ${venue.title}: ${error}`, 'error');
      throw error;
    }
  }

  async addArtistToDatabase(artist: { id: string; name: string; image_url?: string }) {
    try {
      // Check for existing artist
      const existingArtist = await db.select().from(artists)
        .where(eq(artists.name, artist.name))
        .limit(1);

      if (existingArtist.length > 0) {
        return existingArtist[0].id;
      }

      // Add new artist
      const [newArtist] = await db.insert(artists).values({
        name: artist.name,
        imageUrl: artist.image_url,
        bandsintownId: artist.id,
        popularity: 50
      }).returning();

      this.logger.log(`Added artist: ${artist.name}`);
      return newArtist.id;
    } catch (error) {
      this.logger.log(`Failed to add artist ${artist.name}: ${error}`, 'error');
      throw error;
    }
  }

  private async loadArtistMap() {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.ARTIST_MAP_FILE, 'utf-8');
      const mappings = JSON.parse(data);
      this.artistMap = new Map(Object.entries(mappings));
    } catch (error) {
      this.logger.log('No existing artist mappings found, creating new file');
      this.artistMap = new Map();
    }
  }

  private async saveArtistMap() {
    const fs = await import('fs/promises');
    const mappings = Object.fromEntries(this.artistMap);
    await fs.writeFile(this.ARTIST_MAP_FILE, JSON.stringify(mappings, null, 2));
  }

  private async verifyArtist(artistName: string, artistData: any): Promise<boolean> {
    await this.loadArtistMap();

    // Check existing mapping
    if (this.artistMap.has(artistName)) {
      return this.artistMap.get(artistName) === artistData.name;
    }

    // Exact match check
    if (artistData.name.toLowerCase() === artistName.toLowerCase()) {
      this.artistMap.set(artistName, artistData.name);
      await this.saveArtistMap();
      return true;
    }

    // Fuzzy match check
    const fuzzysort = (await import('fuzzysort')).default;
    const fuzzyResult = fuzzysort.single(artistName.toLowerCase(), artistData.name.toLowerCase());
    const fuzzyScore = fuzzyResult ? fuzzyResult.score : -Infinity;
    const isCloseMatch = fuzzyScore > -10; // Adjust threshold as needed

    if (isCloseMatch) {
      this.logger.log(`Found close match: "${artistData.name}" for "${artistName}" (score: ${fuzzyScore})`);

      // In an interactive environment, you could prompt for confirmation
      // For now, we'll accept close matches and log them
      this.logger.log(`Accepting match: ${artistData.name} for ${artistName}`);
      this.artistMap.set(artistName, artistData.name);
      await this.saveArtistMap();
      return true;
    }

    this.logger.log(`No match found for "${artistName}" (best match: "${artistData.name}")`);
    return false;
  }

  async seedFromArtist(artistName: string) {
    this.logger.log(`Processing artist: ${artistName}`);
    const events = await this.searchArtistEvents(artistName);

    let stats = {
      venues: 0,
      events: 0,
      artists: 0
    };

    if (events.length === 0) {
      this.logger.log(`No events found for ${artistName}`);
      return stats;
    }

    // Add artist
    const artistData = events[0].artist;
    const isVerified = await this.verifyArtist(artistName, artistData);

    if (isVerified) {
      const artistId = await this.addArtistToDatabase({
        id: events[0].artist.id,
        name: artistName,
        image_url: events[0].artist.image_url
      });
      stats.artists++;

      // Process events
      for (const event of events) {
        if (!event.venue) continue;

        try {
          const venueId = await this.addVenueToDatabase(event.venue);
          stats.venues++;

          // Add event
          await db.insert(events).values({
            artistId,
            venueId,
            date: event.datetime.split('T')[0],
            startTime: event.datetime.split('T')[1].substring(0, 5),
            status: event.status || 'confirmed',
            sourceId: event.id,
            sourceName: 'concerts-api'
          });

          stats.events++;
          this.logger.log(`Added event on ${event.datetime.split('T')[0]}`);
        } catch (error) {
          this.logger.log(`Failed to process event: ${error}`, 'error');
        }
      }
    } else {
      this.logger.log(`Artist verification failed for ${artistName}, skipping.`);
    }

    return stats;
  }
}