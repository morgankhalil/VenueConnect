import dotenv from 'dotenv';
import { db } from './db';
import { venues, venueNetwork, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Define types for Bandsintown API responses
interface BandsInTownVenue {
  id?: string;
  name: string;
  city: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface BandsInTownArtist {
  id: string;
  name: string;
  url: string;
  image_url?: string;
  thumb_url?: string;
  facebook_page_url?: string;
  mbid?: string;
  tracker_count?: number;
  upcoming_event_count?: number;
}

interface BandsInTownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime?: string;
  datetime: string;
  description?: string;
  venue: BandsInTownVenue;
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
  title?: string;
  artist?: BandsInTownArtist;
  status?: 'confirmed' | 'cancelled';
}

/**
 * Known Bandsintown venue IDs mapping
 * Each ID is in the format Bandsintown uses for API calls
 */
const knownVenueIds: Record<string, string> = {
  'The Bug Jar': '10068739-the-bug-jar',
  'The Bowery Ballroom': '1847-the-bowery-ballroom',
  'The 9:30 Club': '209-9-30-club',
  'The Troubadour': '1941-the-troubadour',
  'The Fillmore': '1941-the-fillmore',
  'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
  'The Ryman Auditorium': '1941-ryman-auditorium',
  'House of Blues': '1941-house-of-blues-chicago'
};

/**
 * Fetch events for a venue from Bandsintown
 */
async function fetchVenueEvents(venueName: string, venueId: string): Promise<BandsInTownEvent[]> {
  const apiKey = process.env.BANDSINTOWN_API_KEY;
  if (!apiKey) {
    throw new Error('Bandsintown API key is not configured');
  }

  console.log(`Fetching events for venue: ${venueName} (${venueId})`);

  try {
    // Fetch events for the specific venue
    const apiEndpoint = `https://rest.bandsintown.com/venues/${venueId}/events`;

    const response = await axios.get(apiEndpoint, {
      params: { 
        app_id: apiKey
      },
      headers: { 
        'Accept': 'application/json'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.log(`No valid event data returned for ${venueName}`);
      return [];
    }

    const eventsData = response.data;
    console.log(`Retrieved ${eventsData.length} events for venue ${venueName}`);
    return eventsData;
  } catch (error: any) {
      console.error(`Error fetching events for venue ${venueName}:`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else {
        console.error('Error:', error.message);
      }
      return [];
    }
}

/**
 * Process events and save them to the database
 * Also extract and save artists from these events
 */
async function processEvents(venueDbId: number, events: BandsInTownEvent[]): Promise<{
  eventsAdded: number;
  artistsAdded: number;
}> {
  let eventsAdded = 0;
  let artistsAdded = 0;
  const processedArtists = new Set<string>();

  for (const eventData of events) {
    if (!eventData.artist || !eventData.datetime) {
      console.log('Skipping event with missing artist or datetime data');
      continue;
    }

    // Process artist data
    const artistName = eventData.artist.name;
    if (!processedArtists.has(artistName)) {
      // Check if artist already exists
      let artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);

      if (!artist.length) {
        // Create new artist
        const [newArtist] = await db.insert(artists).values({
          name: artistName,
          genres: ['rock'], // Default genre as Bandsintown doesn't provide this
          popularity: eventData.artist.tracker_count 
            ? Math.min(100, Math.floor(eventData.artist.tracker_count / 1000)) 
            : 50,
          imageUrl: eventData.artist.image_url,
          websiteUrl: eventData.artist.url,
          bandsintownId: eventData.artist.id,
          description: `Artist from Bandsintown: ${artistName}`
        }).returning();

        artist = [newArtist];
        artistsAdded++;
        console.log(`Added new artist: ${artistName}`);
      }

      processedArtists.add(artistName);

      // Process datetime
      const eventDate = new Date(eventData.datetime);
      const dateString = eventDate.toISOString().split('T')[0];
      const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

      // Check if event already exists
      const existingEvents = await db.select()
        .from(events)
        .where(
          and(
            eq(events.artistId, artist[0].id),
            eq(events.venueId, venueDbId),
            eq(events.date, dateString)
          )
        )
        .limit(1);

      if (existingEvents.length > 0) {
        // Update existing event with fresh data
        await db.update(events)
          .set({
            status: eventData.status || 'confirmed',
            ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
            sourceId: eventData.id,
            sourceName: 'bandsintown'
          })
          .where(eq(events.id, existingEvents[0].id));

        console.log(`Updated existing event: ${artistName} on ${dateString}`);
      } else {
        // Create new event
        await db.insert(events).values({
          artistId: artist[0].id,
          venueId: venueDbId,
          date: dateString,
          startTime: timeString,
          status: eventData.status || 'confirmed',
          ticketUrl: eventData.offers && eventData.offers.length > 0 ? eventData.offers[0].url : null,
          sourceId: eventData.id,
          sourceName: 'bandsintown'
        });

        eventsAdded++;
        console.log(`Added new event: ${artistName} on ${dateString}`);
      }
    }
  }

  return { eventsAdded, artistsAdded };
}

/**
 * Main function to seed events and artists
 */
async function seedEventsAndArtists() {
  try {
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      console.error('ERROR: BANDSINTOWN_API_KEY environment variable is not set');
      console.error('Please set the BANDSINTOWN_API_KEY environment variable before running this script.');
      process.exit(1);
    }

    console.log('Starting Bandsintown events and artists seeding...');

    // Get all venues from database
    const venueList = await db.select().from(venues);
    console.log(`Found ${venueList.length} venues in database`);

    const results = {
      processedVenues: 0,
      totalEvents: 0,
      totalArtists: 0,
      skippedVenues: 0
    };

    // Process each venue
    for (const venue of venueList) {
      // Check if we have a known Bandsintown ID for this venue
      const bandsintownId = knownVenueIds[venue.name];

      if (!bandsintownId) {
        console.log(`No Bandsintown ID known for venue: ${venue.name} - skipping`);
        results.skippedVenues++;
        continue;
      }

      try {
        console.log(`Attempting to fetch events for ${venue.name} with ID ${bandsintownId}...`);
        const venueEvents = await fetchVenueEvents(venue.name, bandsintownId);

        console.log(`API Response for ${venue.name}:`, JSON.stringify(venueEvents, null, 2));

        if (venueEvents.length === 0) {
          console.log(`No events found for venue: ${venue.name}`);
          continue;
        }

        // Process and save the events and artists
        const { eventsAdded, artistsAdded } = await processEvents(venue.id, venueEvents);

        results.processedVenues++;
        results.totalEvents += eventsAdded;
        results.totalArtists += artistsAdded;

        console.log(`Processed ${venue.name}: added ${eventsAdded} events and ${artistsAdded} artists`);
      } catch (error) {
        console.error(`Error processing venue ${venue.name}:`, error);
      }
    }

    // Print summary
    console.log('\nSeeding completed!');
    console.log(`Processed ${results.processedVenues} venues`);
    console.log(`Added ${results.totalEvents} events`);
    console.log(`Added ${results.totalArtists} artists`);
    console.log(`Skipped ${results.skippedVenues} venues (no Bandsintown ID)`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding events and artists:', error);
    process.exit(1);
  }
}

// Run the script
seedEventsAndArtists();