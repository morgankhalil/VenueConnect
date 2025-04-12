
import { describe, it, expect, jest } from '@jest/globals';
import { processBandsintownEventWebhook } from '../webhooks/webhook-handler';

describe('Webhook Handler', () => {
  it('should process a valid Bandsintown event webhook', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {
        venue: {
          name: 'Test Venue',
          city: 'New York',
          country: 'US',
          capacity: 500
        },
        artist: {
          name: 'Test Artist',
          genres: ['rock'],
          tracker_count: 1000
        },
        datetime: '2024-04-10T20:00:00',
        offers: [{
          type: 'tickets',
          url: 'http://example.com/tickets',
          status: 'available'
        }]
      }
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });

  it('should handle missing data gracefully', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {
        venue: {
          name: 'Test Venue',
          city: 'New York',
          country: 'US'
        },
        artist: {
          name: 'Test Artist'
        },
        datetime: '2024-04-10T20:00:00'
      }
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });
});
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { events, artists, venues } from '../shared/schema';

// Create a router for webhooks
const webhookRouter = Router();

/**
 * Process webhook events from Bandsintown
 */
webhookRouter.post('/webhooks/bandsintown', async (req: Request, res: Response) => {
  const payload = req.body; // The data sent by the webhook
  const { event_type, data } = payload;

  try {
    console.log(`Received event type: ${event_type}`);
    
    switch (event_type) {
      case 'event.created':
        // Logic for handling new event creation
        await handleEventCreated(data);
        break;

      case 'event.updated':
        // Logic for handling event updates
        await handleEventUpdated(data);
        break;

      case 'event.canceled':
        // Logic for handling event cancellations
        await handleEventCanceled(data);
        break;

      default:
        console.warn(`Unhandled event type: ${event_type}`);
        break;
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Handle event creation
 */
async function handleEventCreated(data: any) {
  // Implement logic to add artist, venue and the event to the database.
  const artistId = await addOrUpdateArtist(data.artist);
  const venueId = await addOrUpdateVenue(data.venue);
  
  // Add the new event to the database
  await db.insert(events).values({
    artistId,
    venueId,
    date: data.datetime,
    status: 'confirmed',
    sourceId: data.id,
    sourceName: 'bandsintown'
  });
  console.log(`Event created for ${data.artist.name} at ${data.venue.name}.`);
}

/**
 * Handle event updates
 */
async function handleEventUpdated(data: any) {
  // Implement logic to update the existing event in the database
}

/**
 * Handle event cancellations
 */
async function handleEventCanceled(data: any) {
  // Implement logic to update the status of the existing event to 'cancelled'
}

// Export the router
export default webhookRouter;