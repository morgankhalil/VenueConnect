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
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      params: {
        query: sourceVenue[0].name,
        location: `${sourceVenue[0].latitude},${sourceVenue[0].longitude}`,
        radius: radius,
        limit: limit
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
    // Get events from 2 years ago to 2 years in future
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);
    
    const response = await axios.get(`https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events`, {
      params: {
        app_id: apiKey,
        date: `${startDate.toISOString().split('T')[0]},${endDate.toISOString().split('T')[0]}`
      },
      headers: {
        'Accept': 'application/json'
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
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
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