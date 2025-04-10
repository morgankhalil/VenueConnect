import axios from 'axios';
import { db } from '../db';
import { venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { EventProvider, SyncOptions } from './event-provider';

export class BandsInTownProvider implements EventProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
}

export async function syncArtistEventsFromBandsInTown(artistName: string) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    const response = await axios.get(`https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching artist events:', error);
    throw error;
  }
}

export async function syncVenueFromBandsInTown(venueId: string, venueName: string) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    // First get venue details
    const response = await axios.get(`https://rest.bandsintown.com/venues/${venueId}`, {
      params: { app_id: apiKey },
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data) {
      // Update venue with Bandsintown data
      await db.update(venues)
        .set({ 
          bandsintownId: venueId,
          lastSyncedAt: new Date()
        })
        .where(eq(venues.name, venueName));

      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`Error syncing venue ${venueName}:`, error);
    throw error;
  }
}