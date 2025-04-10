
import axios from 'axios';
import { EventProvider, SyncOptions } from './event-provider';

interface PredictHQEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  start: string;
  end: string;
  location: [number, number];
  venue?: {
    name: string;
    location: [number, number];
    address?: string;
    city?: string;
    country?: string;
  };
  predicted_attendance?: number;
  labels?: string[];
}

export class PredictHQProvider implements EventProvider {
  private apiKey: string;
  private baseUrl = 'https://api.predicthq.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getArtistEvents(artistName: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      q: artistName,
      category: 'concerts,performances',
      limit: options?.limit || 100,
      ...options
    });

    const response = await this.makeRequest('/events/', params);
    return this.mapEvents(response.results);
  }

  async getVenueEvents(venueId: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      place_id: venueId,
      category: 'concerts,performances',
      limit: options?.limit || 100,
      ...options
    });

    const response = await this.makeRequest('/events/', params);
    return this.mapEvents(response.results);
  }

  async searchVenues(query: string, options?: SyncOptions) {
    const params = this.buildSearchParams({
      q: query,
      type: 'venue',
      limit: options?.limit || 100,
      ...options
    });

    const response = await this.makeRequest('/places/', params);
    return this.mapVenues(response.results);
  }

  private mapEvents(events: PredictHQEvent[]) {
    return events.map(event => ({
      sourceId: event.id,
      sourceName: 'predicthq',
      name: event.title,
      description: event.description,
      date: event.start.split('T')[0],
      startTime: event.start.split('T')[1].substring(0, 5),
      status: 'confirmed',
      predictedAttendance: event.predicted_attendance,
      venue: event.venue ? {
        name: event.venue.name,
        latitude: event.venue.location[0],
        longitude: event.venue.location[1],
        address: event.venue.address,
        city: event.venue.city,
        country: event.venue.country
      } : null,
      genres: event.labels || []
    }));
  }

  private mapVenues(venues: any[]) {
    return venues.map(venue => ({
      sourceId: venue.id,
      sourceName: 'predicthq',
      name: venue.name,
      address: venue.address,
      city: venue.city,
      country: venue.country,
      latitude: venue.location[0],
      longitude: venue.location[1]
    }));
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
