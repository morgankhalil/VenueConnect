import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { events, artists, venues } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { SyncLogger } from '../core/sync-logger';


// Interface for webhook payload from Bandsintown
interface BandsintownEventWebhook {
  event_type: 'event.created' | 'event.updated' | 'event.canceled';
  timestamp: string;
  data: {
    id: string;
    artist: {
      name: string;
      url: string;
      mbid?: string;
      image_url?: string;
    };
    venue: {
      name: string;
      latitude: number;
      longitude: number;
      city: string;
      region?: string;
      country: string;
    };
    datetime: string;
    title?: string;
    lineup?: string[];
    description?: string;
    status?: 'confirmed' | 'cancelled';
  };
}

/**
 * Validates webhook signature (if provided)
 * @param req Express request
 * @param webhookSecret Secret for validating webhook
 * @returns boolean indicating if signature is valid
 */
export function validateWebhookSignature(
  req: Request,
  webhookSecret: string
): boolean {
  // If we don't have a webhook secret, skip validation
  if (!webhookSecret) return true;

  const signature = req.headers['x-webhook-signature'] as string;

  if (!signature) {
    console.warn('Webhook signature missing');
    return false;
  }

  // Create HMAC using webhook secret
  const hmac = crypto.createHmac('sha256', webhookSecret);

  // Add request body to HMAC
  hmac.update(JSON.stringify(req.body));

  // Get computed signature
  const computedSignature = hmac.digest('hex');

  // Compare signatures
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );

  if (!isValid) {
    console.warn('Webhook signature validation failed');
  }

  return isValid;
}

/**
 * Process Bandsintown event webhook
 * @param payload Webhook payload
 */
export async function processBandsintownEventWebhook(
  payload: BandsintownEventWebhook
): Promise<void> {
  const logger = new SyncLogger('BandsintownWebhook');
  try {
    const { event_type, data } = payload;
    logger.log(`Processing Bandsintown webhook: ${event_type}`, 'info');

    // Get or create artist
    let artist = await db.select().from(artists).where(eq(artists.name, data.artist.name)).limit(1);

    if (!artist.length) {
      // Create artist if it doesn't exist
      const [newArtist] = await db.insert(artists).values({
        name: data.artist.name,
        genres: ['rock'], // Default genre, should be updated with real data
        popularity: 50, // Default popularity score
        imageUrl: data.artist.image_url || null,
        websiteUrl: data.artist.url || null,
        description: `Artist from Bandsintown: ${data.artist.name}`
      }).returning();

      artist = [newArtist];
    }

    // Get or create venue
    let venue = await db.select().from(venues).where(
      eq(venues.name, data.venue.name)
    ).limit(1);

    if (!venue.length) {
      // Create venue if it doesn't exist
      const [newVenue] = await db.insert(venues).values({
        name: data.venue.name,
        address: `${data.venue.name}, ${data.venue.city}`,
        city: data.venue.city,
        state: data.venue.region || '',
        country: data.venue.country || 'US',
        zipCode: '',
        latitude: data.venue.latitude,
        longitude: data.venue.longitude,
        capacity: 500, // Default capacity
        description: `Venue from Bandsintown webhook: ${data.venue.name} in ${data.venue.city}`,
        ownerId: 1 // Default owner ID - in a real system this should be handled better
      }).returning();

      venue = [newVenue];
    }

    // Handle the event based on event_type
    switch (event_type) {
      case 'event.created':
        // Create new event
        await db.insert(events).values({
          artistId: artist[0].id,
          venueId: venue[0].id,
          date: data.datetime, // Use string date directly
          startTime: new Date(data.datetime).toLocaleTimeString(), // Extract time
          status: 'confirmed',
          sourceId: data.id || null,
          sourceName: 'bandsintown'
        });
        break;

      case 'event.updated':
        // Update existing event if it exists
        // Find event by artist, venue and source ID if available
        let existingEvents;

        if (data.id) {
          existingEvents = await db.select().from(events).where(eq(events.sourceId, data.id));
        } else {
          // If no source ID, use artist and venue IDs
          existingEvents = await db.select().from(events).where(
            and(
              eq(events.artistId, artist[0].id),
              eq(events.venueId, venue[0].id)
            )
          );
        }

        if (existingEvents.length > 0) {
          // Find closest date match if we have multiple results
          let eventToUpdate = existingEvents[0];

          if (existingEvents.length > 1) {
            const eventDate = new Date(data.datetime);
            eventToUpdate = existingEvents.reduce((closest, current) => {
              const closestDiff = Math.abs(new Date(closest.date).getTime() - eventDate.getTime());
              const currentDiff = Math.abs(new Date(current.date).getTime() - eventDate.getTime());
              return currentDiff < closestDiff ? current : closest;
            });
          }

          // Update the event with the new information
          await db.update(events)
            .set({
              date: data.datetime,
              startTime: new Date(data.datetime).toLocaleTimeString(),
              status: 'confirmed'
            })
            .where(eq(events.id, eventToUpdate.id));
        }
        break;

      case 'event.canceled':
        // Mark event as cancelled if it exists
        // Similar approach to the update case
        let cancelEvents;

        if (data.id) {
          cancelEvents = await db.select().from(events).where(eq(events.sourceId, data.id));
        } else {
          // If no source ID, use artist and venue IDs
          cancelEvents = await db.select().from(events).where(
            and(
              eq(events.artistId, artist[0].id),
              eq(events.venueId, venue[0].id)
            )
          );
        }

        if (cancelEvents.length > 0) {
          // Find closest date match if we have multiple results
          let eventToCancel = cancelEvents[0];

          if (cancelEvents.length > 1) {
            const eventDate = new Date(data.datetime);
            eventToCancel = cancelEvents.reduce((closest, current) => {
              const closestDiff = Math.abs(new Date(closest.date).getTime() - eventDate.getTime());
              const currentDiff = Math.abs(new Date(current.date).getTime() - eventDate.getTime());
              return currentDiff < closestDiff ? current : closest;
            });
          }

          // Update the event status
          await db.update(events)
            .set({
              status: 'cancelled'
            })
            .where(eq(events.id, eventToCancel.id));
        }
        break;
    }

    console.log(`Successfully processed ${event_type} webhook`);
  } catch (error) {
    console.error('Error processing Bandsintown webhook:', error);
    throw error;
  }
}

/**
 * Express middleware for handling webhooks
 */
export function webhookMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const logger = new SyncLogger('WebhookHandler');
    try {
      logger.log('Received webhook request', 'info');
      
      // Get webhook secret from environment variables
      const webhookSecret = process.env.BANDSINTOWN_WEBHOOK_SECRET || '';

      // Validate webhook signature if a secret is configured
      if (webhookSecret && !validateWebhookSignature(req, webhookSecret)) {
        logger.log('Invalid webhook signature', 'error');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      // Determine webhook type from headers or path
      const webhookType = req.headers['x-webhook-type'] || req.path.split('/').pop();

      // Process webhook based on type
      if (webhookType === 'bandsintown') {
        await processBandsintownEventWebhook(req.body as BandsintownEventWebhook);
      } else {
        console.warn(`Unknown webhook type: ${webhookType}`);
        return res.status(400).json({ error: 'Unknown webhook type' });
      }

      // Return success
      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      logger.log(`Webhook processing failed: ${error}`, 'error');
      next(error);
    }
  };
}

//Dummy function for testing purposes.  Replace with your actual sync logic.
async function runDailySync() {
  console.log("Running dummy sync");
  //Simulate a potential error
  //throw new Error("Dummy Sync Error");
  return;
}