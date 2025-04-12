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
          type: 'event'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        },
        timeout: 60000 // 60 second timeout
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching artist events:', error);
      return [];
    }
  }

  async getVenueEvents(venueId: string, options?: SyncOptions): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          keyword: venueId,
          type: 'venue'
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
        },
        timeout: 60000 // 60 second timeout
      });

      return response.data.data || [];
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
        },
        timeout: 60000 // 60 second timeout
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  }
}