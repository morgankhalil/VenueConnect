import express from 'express';
import { db } from '../db';
import { venues, events, artists } from '../../shared/schema';
import { eq, and, inArray, sql, count } from 'drizzle-orm';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { seedFromIndieOnTheMove } from '../services/indie-on-the-move-scraper';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bandsintown venue ID mapping - we can expand this list
const knownVenueIds: Record<string, string> = {
  'The Bug Jar': '10068739-the-bug-jar',
  'The Bowery Ballroom': '1847-the-bowery-ballroom',
  '9:30 Club': '209-9-30-club',
  'The Troubadour': '1941-the-troubadour',
  'The Fillmore': '1941-the-fillmore',
  'Red Rocks Amphitheatre': '598-red-rocks-amphitheatre',
  'The Ryman Auditorium': '1941-ryman-auditorium',
  'House of Blues': '1941-house-of-blues-chicago'
};

const router = express.Router();

// Interfaces
interface BandsInTownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime?: string;
  datetime: string;
  description?: string;
  venue: {
    name: string;
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
  title?: string;
  artist?: {
    name: string;
    url: string;
    mbid?: string;
    image_url?: string;
    thumb_url?: string;
    facebook_page_url?: string;
    tracker_count: number;
  };
  status?: 'confirmed' | 'cancelled';
}

// Endpoint to fetch real events for a venue
router.post('/venues/:venueId/real-events', async (req, res) => {
  try {
    const venueId = parseInt(req.params.venueId);
    
    if (isNaN(venueId)) {
      return res.status(400).json({ success: false, message: 'Invalid venue ID' });
    }
    
    // Get venue data
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId)
    });
    
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }
    
    // Check for API key
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Bandsintown API key not configured. Please set the BANDSINTOWN_API_KEY environment variable.' 
      });
    }
    
    // Find bandsintownId for the venue
    let bandsintownId = venue.bandsintownId || knownVenueIds[venue.name];
    
    // If we don't have a Bandsintown ID, use AI to try to find it
    if (!bandsintownId) {
      bandsintownId = await tryToFindVenueId(venue);
    }
    
    if (!bandsintownId) {
      return res.status(404).json({
        success: false,
        message: 'Could not find a Bandsintown ID for this venue. Please set it manually or try another venue.'
      });
    }
    
    // Fetch events from Bandsintown
    const events = await fetchVenueEvents(venue.name, bandsintownId, apiKey);
    
    if (!events || events.length === 0) {
      return res.json({ success: true, message: 'No events found for this venue', eventsFound: 0 });
    }
    
    // Process and save events
    const result = await processAndSaveEvents(events, venueId);
    
    return res.json({
      success: true,
      message: `Found ${events.length} events, saved ${result.eventsAdded} new events for ${venue.name}`,
      eventsFound: events.length,
      eventsSaved: result.eventsAdded,
      artistsAdded: result.artistsAdded
    });
  } catch (error) {
    console.error('Error fetching real events:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// Route to seed events for all venues
router.post('/seed-all-venues', async (req, res) => {
  try {
    // Get all venues
    const allVenues = await db.query.venues.findMany();
    
    if (!allVenues || allVenues.length === 0) {
      return res.status(404).json({ success: false, message: 'No venues found in database' });
    }
    
    // Filter out venues that already have a good number of events
    const venuesToProcess = [];
    for (const venue of allVenues) {
      const eventCount = await db
        .select({ count: count() })
        .from(events)
        .where(eq(events.venueId, venue.id));
      
      if (eventCount[0].count < 5) {
        venuesToProcess.push(venue);
      }
    }
    
    if (venuesToProcess.length === 0) {
      return res.json({ success: true, message: 'All venues already have sufficient events', venuesProcessed: 0 });
    }
    
    // Process venues in batches to avoid rate limiting
    const results = {
      venuesProcessed: 0,
      venuesWithEvents: 0,
      totalEventsAdded: 0,
      totalArtistsAdded: 0
    };
    
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Bandsintown API key not configured. Please set the BANDSINTOWN_API_KEY environment variable.' 
      });
    }
    
    // Process each venue
    for (const venue of venuesToProcess) {
      try {
        results.venuesProcessed++;
        
        // Find bandsintownId for the venue
        let bandsintownId = venue.bandsintownId || knownVenueIds[venue.name];
        
        // If we don't have a Bandsintown ID, try to find it with AI
        if (!bandsintownId) {
          bandsintownId = await tryToFindVenueId(venue);
        }
        
        if (!bandsintownId) {
          console.log(`No Bandsintown ID found for venue: ${venue.name}`);
          continue;
        }
        
        // Fetch events from Bandsintown
        const venueEvents = await fetchVenueEvents(venue.name, bandsintownId, apiKey);
        
        if (!venueEvents || venueEvents.length === 0) {
          console.log(`No events found for venue: ${venue.name}`);
          continue;
        }
        
        // Process and save events
        const result = await processAndSaveEvents(venueEvents, venue.id);
        
        if (result.eventsAdded > 0) {
          results.venuesWithEvents++;
          results.totalEventsAdded += result.eventsAdded;
          results.totalArtistsAdded += result.artistsAdded;
        }
        
        // Avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing venue ${venue.name}:`, error);
        continue;
      }
    }
    
    return res.json({
      success: true,
      message: `Processed ${results.venuesProcessed} venues, found events for ${results.venuesWithEvents} venues`,
      ...results
    });
  } catch (error) {
    console.error('Error seeding all venues:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

// Route to get event statistics
router.get('/event-stats', async (req, res) => {
  try {
    // Get total event count
    const eventCount = await db
      .select({ count: count() })
      .from(events);
    
    // Get venues with events
    const venuesWithEvents = await db
      .select({
        venueId: events.venueId,
        count: count()
      })
      .from(events)
      .groupBy(events.venueId);
    
    // Get artists with events
    const artistsWithEvents = await db
      .select({
        artistId: events.artistId,
        count: count()
      })
      .from(events)
      .groupBy(events.artistId);
    
    return res.json({
      success: true,
      totalEvents: eventCount[0].count,
      venuesWithEvents: venuesWithEvents.length,
      artistsWithEvents: artistsWithEvents.length
    });
  } catch (error) {
    console.error('Error getting event stats:', error);
    return res.status(500).json({ success: false, message: `Error: ${error instanceof Error ? error.message : String(error)}` });
  }
});

/**
 * Use AI to try to find a Bandsintown ID for the venue
 */
async function tryToFindVenueId(venue: any): Promise<string | null> {
  try {
    // Format varies, but common formats are:
    // - [number]-[venue-name-slug]
    // - [number]-[venue-name-slug]-[city]
    
    // Use GPT-4 to generate possible Bandsintown IDs
    const prompt = `I'm trying to find the Bandsintown ID for a music venue called "${venue.name}" in ${venue.city}, ${venue.region || venue.country}.

Bandsintown venue IDs usually follow formats like:
1. [number]-[venue-name-slug] (e.g., "1847-the-bowery-ballroom")
2. [number]-[venue-name-slug]-[city] (e.g., "209-9-30-club")
3. [long-number]-[venue-name] (e.g., "10068739-the-bug-jar")

Based on the venue name "${venue.name}" in ${venue.city}, ${venue.region || venue.country}, predict what the most likely Bandsintown venue ID might be.

Provide only the ID string with no other text or explanation. If you're not confident, respond with "unknown".`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You help identify Bandsintown venue IDs based on venue information." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 50
    });

    const potentialId = response.choices[0]?.message?.content?.trim();
    
    if (!potentialId || potentialId === "unknown") {
      return null;
    }
    
    // Verify the ID by trying to fetch data
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return null;
    }
    
    // Try to fetch events with this ID to see if it's valid
    try {
      const response = await axios.get(`https://rest.bandsintown.com/venues/${potentialId}/events`, {
        params: { app_id: apiKey },
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.status === 200 && Array.isArray(response.data)) {
        // Successfully verified the ID
        console.log(`AI found a valid Bandsintown ID for ${venue.name}: ${potentialId}`);
        
        // Update the venue with this ID for future use
        await db.update(venues)
          .set({ bandsintownId: potentialId })
          .where(eq(venues.id, venue.id));
        
        return potentialId;
      }
    } catch (error) {
      console.log(`Invalid Bandsintown ID prediction: ${potentialId}`);
    }
    
    return null;
  } catch (error) {
    console.error('Error finding venue ID with AI:', error);
    return null;
  }
}

/**
 * Fetch events for a venue from Bandsintown
 */
async function fetchVenueEvents(venueName: string, venueId: string, apiKey: string): Promise<BandsInTownEvent[]> {
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

    console.log(`Found ${response.data.length} events for venue ${venueName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching events for venue ${venueName}:`, error);
    return [];
  }
}

/**
 * Process and save events from Bandsintown to our database
 */
async function processAndSaveEvents(eventsData: BandsInTownEvent[], venueId: number): Promise<{ eventsAdded: number, artistsAdded: number }> {
  let eventsAdded = 0;
  let artistsAdded = 0;
  
  for (const eventData of eventsData) {
    try {
      if (!eventData.artist) {
        console.log('Skipping event with missing artist data');
        continue;
      }
      
      // Process artist
      const artistName = eventData.artist.name;
      console.log(`Processing artist: ${artistName}`);
      
      // Check if artist exists
      let artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      
      if (!artist.length) {
        // Create artist
        console.log(`Creating new artist: ${artistName}`);
        
        const [newArtist] = await db.insert(artists).values({
          name: artistName,
          genres: ['other'],
          popularity: eventData.artist.tracker_count || 50,
          imageUrl: eventData.artist.image_url || null,
          bandsintownId: eventData.artist_id || null,
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }).returning();
        
        artist = [newArtist];
        artistsAdded++;
        
        // Use AI to enhance the artist data after creation
        enhanceArtistData(newArtist.id, artistName).catch(console.error);
      }
      
      // Check if this event already exists
      const existingEvent = await db.select()
        .from(events)
        .where(
          and(
            eq(events.artistId, artist[0].id),
            eq(events.venueId, venueId),
            eq(events.date, new Date(eventData.datetime).toISOString().split('T')[0])
          )
        )
        .limit(1);
      
      if (!existingEvent.length) {
        // Create event
        console.log(`Creating new event: ${artistName} at venue ID ${venueId} on ${eventData.datetime}`);
        
        const eventDate = new Date(eventData.datetime);
        const formattedDate = eventDate.toISOString().split('T')[0];
        const formattedTime = eventDate.toISOString().split('T')[1].substring(0, 5);
        
        await db.insert(events).values({
          date: formattedDate,
          time: formattedTime,
          artistId: artist[0].id,
          venueId: venueId,
          description: eventData.description || null,
          status: eventData.status || 'confirmed',
          sourceName: 'bandsintown',
          createdAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        });
        
        eventsAdded++;
      } else {
        console.log(`Event already exists: ${artistName} at venue ID ${venueId} on ${eventData.datetime}`);
      }
    } catch (error) {
      console.error(`Error processing event:`, error);
    }
  }
  
  return { eventsAdded, artistsAdded };
}

/**
 * Use AI to enhance artist data
 */
async function enhanceArtistData(artistId: number, artistName: string): Promise<void> {
  try {
    // Don't process if OpenAI key is not set
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('OpenAI API key not set, skipping artist enhancement');
      return;
    }
    
    console.log(`Enhancing data for artist: ${artistName}`);
    
    const prompt = `Provide factual information about the musical artist "${artistName}".
    
Return the information in JSON format with these fields:
1. genres: An array of 1-3 music genres that most accurately describe this artist's music
2. description: A brief factual bio (100-150 words)
3. popularity: A number from 1-100 estimating their current popularity (higher = more popular)

Only include verifiable information. If you don't have enough information about this specific artist, respond with "unknown" for all fields.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You provide factual information about musical artists." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log(`No content returned from OpenAI for artist ${artistName}`);
      return;
    }

    try {
      const artistInfo = JSON.parse(content);
      
      if (artistInfo.genres === "unknown" || !artistInfo.genres) {
        console.log(`No useful information found for artist ${artistName}`);
        return;
      }
      
      // Update the artist with the enhanced data
      await db.update(artists)
        .set({
          genres: Array.isArray(artistInfo.genres) ? artistInfo.genres : ['other'],
          description: artistInfo.description || null,
          popularity: artistInfo.popularity || 50,
          updatedAt: sql`NOW()`
        })
        .where(eq(artists.id, artistId));
      
      console.log(`Successfully enhanced data for artist: ${artistName}`);
    } catch (err) {
      console.error(`Failed to parse OpenAI response for artist ${artistName}:`, err);
    }
  } catch (error) {
    console.error(`Error enhancing artist data for ${artistName}:`, error);
  }
}

// Route to seed data from Indie on the Move
router.post('/seed-from-indie', async (req, res) => {
  try {
    const states = req.body.states || ['MA', 'NY', 'CA', 'TX', 'IL']; // Default states if none provided
    
    // Start the seeding process
    console.log(`Starting to seed from Indie on the Move for states: ${states.join(', ')}`);
    
    // Call the function to seed venues and events from Indie on the Move
    const results = await seedFromIndieOnTheMove(states);
    
    return res.json({
      success: true,
      message: `Successfully seeded from Indie on the Move: ${results.totalVenues} venues, ${results.totalEvents} events, and ${results.totalArtists} artists added.`,
      ...results
    });
  } catch (error) {
    console.error('Error seeding from Indie on the Move:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

export default router;