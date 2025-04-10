
import axios from 'axios';
import { db } from '../db';
import { events, artists, venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function syncArtistEventsFromBandsInTown(artistName: string) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    const response = await axios.get(`https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events`, {
      params: { 
        app_id: apiKey
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

export async function syncVenueEventsFromBandsInTown(venueId: string, venueName: string) {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  try {
    // First update the venue's Bandsintown ID
    await db.update(venues)
      .set({ bandsintownId: venueId })
      .where(eq(venues.name, venueName));

    const response = await axios.get(`https://rest.bandsintown.com/venues/${venueId}/events`, {
      params: { 
        app_id: apiKey
      },
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data.length;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching venue events:', error);
    throw error;
  }
}
