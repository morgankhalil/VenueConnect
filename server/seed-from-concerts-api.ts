import dotenv from 'dotenv';
import { db } from './db';
import { ConcertsApiSeeder } from './core/concerts-api-seeder';
import { venues, artists, events as eventsTable } from '../shared/schema';
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
    region: venueData.state || '',
    country: venueData.country || 'US',
    latitude: venueData.latitude || null,
    longitude: venueData.longitude || null,
    capacity: Math.floor(Math.random() * 1000) + 100,
    description: `Music venue in ${venueData.city || 'Unknown City'}`
  }).returning();

  console.log(`Added venue: ${venueData.name}`);
  return newVenues[0].id;
}

async function addEventToDatabase(eventData: any, artistId: number, venueId: number) {
  const eventDate = new Date(eventData.starts_at);
  const dateString = eventDate.toISOString().split('T')[0];
  const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

  const existingEvents = await db.select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.artistId, artistId),
        eq(eventsTable.venueId, venueId),
        eq(eventsTable.date, dateString)
      )
    )
    .limit(1);

  if (existingEvents.length > 0) {
    console.log(`Event already exists for ${dateString}`);
    return;
  }

  await db.insert(eventsTable).values({
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

async function seedFromConcertsApi(artistNames: string[] = ['Taylor Swift', 'Coldplay', 'Adele', 'BTS', 'Ed Sheeran']) {
  console.log('Database connection initialized');

  const seeder = new ConcertsApiSeeder();
  const totalStats = {
    venues: 0,
    events: 0,
    artists: 0,
    errors: 0,
    skipped: 0
  };

  // Define a delay function to respect rate limits
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Process first 3 artists
  const artistsToProcess = artistNames.slice(0, 3);
  console.log(`Processing ${artistsToProcess.length} artists due to API rate limits`);

  for (const artistName of artistsToProcess) {
    try {
      console.log(`Starting to process artist: ${artistName}`);
      
      // Add delay before API call to avoid rate limits
      await delay(1000);
      
      const stats = await seeder.seedFromArtist(artistName);
      
      totalStats.venues += stats.venues;
      totalStats.events += stats.events;
      totalStats.artists += stats.artists;
      
      console.log(`Successfully processed artist: ${artistName}`);
      console.log(`Current stats - Artists: ${totalStats.artists}, Venues: ${totalStats.venues}, Events: ${totalStats.events}`);
    } catch (error: any) {
      console.error(`Failed to process artist ${artistName}:`, error);
      
      // Check if it's a rate limit error
      if (error.response && (error.response.status === 429 || error.response.status === 403)) {
        console.log('API rate limit reached. Waiting before continuing...');
        totalStats.skipped++;
        
        // Wait longer for rate limit errors
        await delay(5000);
      } else {
        totalStats.errors++;
      }
    }
    
    // Add delay between artists to prevent rate limiting
    await delay(2000);
  }

  console.log('\nSeeding completed!');
  console.log(`Added ${totalStats.artists} artists`);
  console.log(`Added ${totalStats.venues} venues`);
  console.log(`Added ${totalStats.events} events`);
  console.log(`Errors: ${totalStats.errors}`);
  console.log(`Skipped due to rate limits: ${totalStats.skipped}`);
}

// Run the seeder
seedFromConcertsApi().catch(console.error);