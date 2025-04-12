
import dotenv from 'dotenv';
import { db } from './db';
import { venues, artists, events } from '../shared/schema';
import axios from 'axios';
import { eq, and } from 'drizzle-orm';

dotenv.config();

async function searchArtistEvents(artistName: string) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY not found in environment variables');
  }

  try {
    const response = await axios.get('https://concerts-artists-events-tracker.p.rapidapi.com/search', {
      params: {
        keyword: artistName,
        type: 'event,venue'
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'concerts-artists-events-tracker.p.rapidapi.com'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}

async function addArtistToDatabase(artistData: any) {
  const existingArtists = await db.select()
    .from(artists)
    .where(eq(artists.name, artistData.name))
    .limit(1);

  if (existingArtists.length > 0) {
    console.log(`Artist '${artistData.name}' already exists`);
    return existingArtists[0].id;
  }

  const newArtists = await db.insert(artists).values({
    name: artistData.name,
    imageUrl: artistData.image,
    websiteUrl: null,
    genres: ['rock'],
    popularity: artistData.tracker_count || 50
  }).returning();

  console.log(`Added artist: ${artistData.name}`);
  return newArtists[0].id;
}

async function addVenueToDatabase(venueData: any) {
  const existingVenues = await db.select()
    .from(venues)
    .where(
      and(
        eq(venues.name, venueData.name),
        eq(venues.city, venueData.city || '')
      )
    )
    .limit(1);

  if (existingVenues.length > 0) {
    console.log(`Venue '${venueData.name}' already exists`);
    return existingVenues[0].id;
  }

  const newVenues = await db.insert(venues).values({
    name: venueData.name,
    city: venueData.city || '',
    state: venueData.state || '',
    country: venueData.country || 'US',
    latitude: venueData.latitude || null,
    longitude: venueData.longitude || null,
    capacity: Math.floor(Math.random() * 1000) + 100,
    address: venueData.address || '',
    zipCode: venueData.zipCode || '',
    description: `Music venue in ${venueData.city || 'Unknown City'}`,
    status: 'active'
  }).returning();

  console.log(`Added venue: ${venueData.name}`);
  return newVenues[0].id;
}

async function addEventToDatabase(eventData: any, artistId: number, venueId: number) {
  const eventDate = new Date(eventData.starts_at);
  const dateString = eventDate.toISOString().split('T')[0];
  const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

  const existingEvents = await db.select()
    .from(events)
    .where(
      and(
        eq(events.artistId, artistId),
        eq(events.venueId, venueId),
        eq(events.date, dateString)
      )
    )
    .limit(1);

  if (existingEvents.length > 0) {
    console.log(`Event already exists for ${dateString}`);
    return;
  }

  await db.insert(events).values({
    artistId,
    venueId,
    date: dateString,
    startTime: timeString,
    status: 'confirmed',
    ticketUrl: null,
    sourceId: eventData.id.toString(),
    sourceName: 'concerts-tracker'
  });

  console.log(`Added event on ${dateString}`);
}

async function seedFromConcertsAPI() {
  const artistsToSearch = ['La Luz']; // Add more artists as needed

  let stats = {
    artists: 0,
    venues: 0,
    events: 0
  };

  for (const artistName of artistsToSearch) {
    console.log(`\nProcessing artist: ${artistName}`);
    
    const data = await searchArtistEvents(artistName);
    if (!data) continue;

    // Add artist
    const artistId = await addArtistToDatabase({
      name: artistName,
      image: data.events?.[0]?.image
    });
    stats.artists++;

    // Process events and venues
    for (const event of data.events || []) {
      if (!event.venue_id) continue;

      const venueId = await addVenueToDatabase({
        name: event.venue_name || 'Unknown Venue',
        city: event.venue_city,
        state: event.venue_state,
        country: event.venue_country
      });
      stats.venues++;

      await addEventToDatabase(event, artistId, venueId);
      stats.events++;
    }
  }

  console.log('\nSeeding completed!');
  console.log(`Added ${stats.artists} artists`);
  console.log(`Added ${stats.venues} venues`);
  console.log(`Added ${stats.events} events`);
}

seedFromConcertsAPI();
