/**
 * Type definitions for webhook payloads
 */

/**
 * Concert data webhook payload
 */
export interface ConcertDataWebhookPayload {
  event_type: 'event.created' | 'event.updated' | 'event.canceled';
  data: {
    id: string;
    datetime: string;
    title?: string;
    status?: string;
    artist: {
      id: string;
      name: string;
      image_url?: string;
    };
    venue: {
      id: string;
      title: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      long: number;
      address?: string;
      postal_code?: string;
      capacity?: number;
    };
  };
}

/**
 * Bandsintown event webhook payload
 */
export interface BandsintownEventWebhook {
  event_type: 'event.created' | 'event.updated' | 'event.canceled';
  data: {
    id: string;
    datetime: string;
    title?: string;
    status?: string;
    artist: {
      id: string;
      name: string;
      image_url?: string;
    };
    venue: {
      id: string;
      name: string;
      city: string;
      region: string;
      country: string;
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Generic webhook payload
 */
export interface GenericWebhookPayload {
  event_type: string;
  data: any;
  timestamp: string;
  source: string;
}