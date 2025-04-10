import axios from 'axios';
import { db } from '../db';
import { venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { EventProvider, SyncOptions } from './event-provider';
import { eq } from 'drizzle-orm';

export class BandsInTownProvider implements EventProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
}

export async function syncVenuesFromBandsInTown(sourceVenueId: number, radius: number = 250, limit: number = 100) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  // Get source venue details
  const sourceVenue = await db.select().from(venues).where(eq(venues.id, sourceVenueId)).limit(1);
  if (!sourceVenue.length) {
    throw new Error(`Source venue with ID ${sourceVenueId} not found`);
  }

  try {
    const response = await axios.get(`https://rest.bandsintown.com/venues/search`, {
      params: {
        query: sourceVenue[0].name,
        location: `${sourceVenue[0].latitude},${sourceVenue[0].longitude}`,
        radius: radius,
        limit: limit,
        app_id: apiKey
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching venues:', error);
    throw error;
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