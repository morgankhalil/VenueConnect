import { db } from '../db';
import { venues, artists, events as eventsTable } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { SyncLogger } from '../core/sync-logger';
import { ConcertDataWebhookPayload } from './interfaces';

const logger = new SyncLogger('ConcertDataHandler');

/**
 * Process the concert data webhook
 * This handler receives concert information from external sources
 * and adds or updates the data in the database.
 * 
 * @param payload The webhook payload
 */
export async function processConcertDataWebhook(payload: ConcertDataWebhookPayload): Promise<void> {
  try {
    logger.log(`Processing ${payload.event_type} webhook`, 'info');

    switch (payload.event_type) {
      case 'event.created':
        await handleEventCreated(payload.data);
        break;
      case 'event.updated':
        await handleEventUpdated(payload.data);
        break;
      case 'event.canceled':
        await handleEventCanceled(payload.data);
        break;
      default:
        logger.log(`Unknown event type: ${payload.event_type}`, 'warning');
        break;
    }

    logger.log(`Successfully processed ${payload.event_type} webhook`, 'info');
  } catch (error) {
    logger.log(`Error processing concert data webhook: ${error}`, 'error');
    throw error;
  }
}

/**
 * Handle event creation
 * @param data Event data
 */
async function handleEventCreated(data: ConcertDataWebhookPayload['data']): Promise<void> {
  // 1. Add or find artist
  const artistId = await addOrUpdateArtist(data.artist);
  
  // 2. Add or find venue
  const venueId = await addOrUpdateVenue(data.venue);
  
  // 3. Check if event already exists
  const existingEvents = await db.select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.sourceId, data.id),
        eq(eventsTable.sourceName, 'concert-data-webhook')
      )
    )
    .limit(1);

  if (existingEvents.length > 0) {
    logger.log(`Event ${data.id} already exists, updating instead`, 'info');
    await handleEventUpdated(data);
    return;
  }

  // 4. Create event
  const dateTime = new Date(data.datetime);
  const dateString = dateTime.toISOString().split('T')[0];
  const timeString = dateTime.toTimeString().split(' ')[0].substring(0, 5);

  await db.insert(eventsTable).values({
    artistId,
    venueId,
    date: dateString,
    startTime: timeString,
    status: data.status || 'confirmed',
    sourceId: data.id,
    sourceName: 'concert-data-webhook'
  });

  logger.log(`Created new event: ${data.artist.name} at ${data.venue.title} on ${dateString}`, 'info');
}

/**
 * Handle event update
 * @param data Event data
 */
async function handleEventUpdated(data: ConcertDataWebhookPayload['data']): Promise<void> {
  // 1. Find the event
  const existingEvents = await db.select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.sourceId, data.id),
        eq(eventsTable.sourceName, 'concert-data-webhook')
      )
    )
    .limit(1);

  if (existingEvents.length === 0) {
    logger.log(`Event ${data.id} not found, creating instead`, 'info');
    await handleEventCreated(data);
    return;
  }

  // 2. Add or find artist
  const artistId = await addOrUpdateArtist(data.artist);
  
  // 3. Add or find venue
  const venueId = await addOrUpdateVenue(data.venue);

  // 4. Update event
  const dateTime = new Date(data.datetime);
  const dateString = dateTime.toISOString().split('T')[0];
  const timeString = dateTime.toTimeString().split(' ')[0].substring(0, 5);

  await db.update(eventsTable)
    .set({
      artistId,
      venueId,
      date: dateString,
      startTime: timeString,
      status: data.status || 'confirmed'
    })
    .where(eq(eventsTable.id, existingEvents[0].id));

  logger.log(`Updated event: ${data.artist.name} at ${data.venue.title} on ${dateString}`, 'info');
}

/**
 * Handle event cancellation
 * @param data Event data
 */
async function handleEventCanceled(data: ConcertDataWebhookPayload['data']): Promise<void> {
  // 1. Find the event
  const existingEvents = await db.select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.sourceId, data.id),
        eq(eventsTable.sourceName, 'concert-data-webhook')
      )
    )
    .limit(1);

  if (existingEvents.length === 0) {
    logger.log(`Event ${data.id} not found for cancellation`, 'warning');
    return;
  }

  // 2. Update event status
  await db.update(eventsTable)
    .set({
      status: 'cancelled'
    })
    .where(eq(eventsTable.id, existingEvents[0].id));

  logger.log(`Canceled event: ${existingEvents[0].id}`, 'info');
}

/**
 * Add or update artist in the database
 * @param artistData Artist data
 * @returns Artist ID
 */
async function addOrUpdateArtist(artistData: ConcertDataWebhookPayload['data']['artist']): Promise<number> {
  // Check if artist exists
  const existingArtists = await db.select()
    .from(artists)
    .where(eq(artists.name, artistData.name))
    .limit(1);

  if (existingArtists.length > 0) {
    // Update existing artist
    if (artistData.image_url) {
      await db.update(artists)
        .set({
          imageUrl: artistData.image_url
        })
        .where(eq(artists.id, existingArtists[0].id));
    }
    return existingArtists[0].id;
  }

  // Create new artist
  const [newArtist] = await db.insert(artists).values({
    name: artistData.name,
    imageUrl: artistData.image_url,
    bandsintownId: artistData.id,
    genres: ['rock'], // Default genre
    popularity: 50 // Default popularity
  }).returning();

  logger.log(`Added artist: ${artistData.name}`, 'info');
  return newArtist.id;
}

/**
 * Add or update venue in the database
 * @param venueData Venue data
 * @returns Venue ID
 */
async function addOrUpdateVenue(venueData: ConcertDataWebhookPayload['data']['venue']): Promise<number> {
  // Check if venue exists
  const existingVenues = await db.select()
    .from(venues)
    .where(
      and(
        eq(venues.name, venueData.title),
        eq(venues.city, venueData.city)
      )
    )
    .limit(1);

  if (existingVenues.length > 0) {
    // Update existing venue if needed (capacity, coordinates, etc.)
    const updates: Record<string, any> = {};
    let needsUpdate = false;

    if (venueData.capacity && existingVenues[0].capacity !== venueData.capacity) {
      updates.capacity = venueData.capacity;
      needsUpdate = true;
    }

    if (venueData.lat && existingVenues[0].latitude !== venueData.lat) {
      updates.latitude = venueData.lat;
      needsUpdate = true;
    }

    if (venueData.long && existingVenues[0].longitude !== venueData.long) {
      updates.longitude = venueData.long;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db.update(venues)
        .set(updates)
        .where(eq(venues.id, existingVenues[0].id));
      
      logger.log(`Updated venue: ${venueData.title}`, 'info');
    }

    return existingVenues[0].id;
  }

  // Create new venue
  const [newVenue] = await db.insert(venues).values({
    name: venueData.title,
    city: venueData.city,
    region: venueData.state,
    country: venueData.country || 'US',
    latitude: venueData.lat,
    longitude: venueData.long,
    capacity: venueData.capacity,
    description: `Music venue in ${venueData.city}, ${venueData.state}`
  }).returning();

  logger.log(`Added venue: ${venueData.title}`, 'info');
  return newVenue.id;
}