
import axios from 'axios';
import { EventProvider, SyncOptions } from './event-provider';

export class ConcertsTrackerProvider implements EventProvider {
  private apiKey: string;
  private baseUrl = 'https://concerts-artists-events-tracker.p.rapidapi.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getArtistEvents(artistName: string, options?: SyncOptions): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          keyword: artistName,
          type: 'event,venue'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        }
      });

      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching artist events:', error);
      return [];
    }
  }

  async getVenueEvents(venueId: string, options?: SyncOptions): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/venue`, {
        params: {
          name: venueId,
          countryCode: 'US'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        }
      });

      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching venue events:', error);
      return [];
    }
  }

  async searchVenues(query: string, options?: SyncOptions): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          keyword: query,
          type: 'venue'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        }
      });

      return response.data.venues || [];
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  }
}
