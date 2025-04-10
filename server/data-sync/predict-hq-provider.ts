
import axios from 'axios';
import { EventProvider, SyncOptions } from './event-provider';

export class PredictHQProvider implements EventProvider {
  private apiKey: string;
  private baseUrl = 'https://api.predicthq.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getArtistEvents(artistName: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      q: artistName,
      category: 'concerts',
      ...options
    });

    const response = await this.makeRequest('/events/', params);
    return response.results;
  }

  async getVenueEvents(venueId: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      place_id: venueId,
      ...options
    });

    const response = await this.makeRequest('/events/', params);
    return response.results;
  }

  async searchVenues(query: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      q: query,
      ...options
    });

    const response = await this.makeRequest('/places/', params);
    return response.results;
  }

  private buildSearchParams(options: any) {
    const params: Record<string, any> = {
      ...options
    };

    if (options.startDate) {
      params.start = options.startDate;
    }
    if (options.endDate) {
      params.end = options.endDate;
    }
    if (options.location) {
      params.within = `${options.location.radius}km@${options.location.latitude},${options.location.longitude}`;
    }
    if (options.limit) {
      params.limit = options.limit;
    }

    return params;
  }

  private async makeRequest(endpoint: string, params: Record<string, any>) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('PredictHQ API error:', error);
      throw error;
    }
  }
}
