import { db } from '../db';
import { artists, events, venues } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import { parseISO, isFuture } from 'date-fns';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add your Bandsintown API key here
const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID || '';
// Add your Ticketmaster API key here
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
// Add your Songkick API key here
const SONGKICK_API_KEY = process.env.SONGKICK_API_KEY || '';

interface EventSourceConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
}

/**
 * Find real events for a specific venue using AI to help with matching and extraction
 */
export async function findEventsForVenue(venueId: number): Promise<{
  success: boolean;
  message: string;
  eventsFound?: number;
  venue?: any;
}> {
  try {
    // Get venue details
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });

    if (!venue) {
      return { success: false, message: `Venue with ID ${venueId} not found` };
    }

    // Determine which data sources are available based on API keys
    const sources: EventSourceConfig[] = [
      { name: 'bandsintown', enabled: !!BANDSINTOWN_APP_ID, apiKey: BANDSINTOWN_APP_ID },
      { name: 'ticketmaster', enabled: !!TICKETMASTER_API_KEY, apiKey: TICKETMASTER_API_KEY },
      { name: 'songkick', enabled: !!SONGKICK_API_KEY, apiKey: SONGKICK_API_KEY }
    ];

    const enabledSources = sources.filter(s => s.enabled);
    
    if (enabledSources.length === 0) {
      return { 
        success: false, 
        message: 'No API keys configured for event sources. Please set up at least one of: BANDSINTOWN_APP_ID, TICKETMASTER_API_KEY, or SONGKICK_API_KEY.'
      };
    }

    // Get existing artists from database to match against
    const existingArtists = await db.query.artists.findMany();

    // Check if venue has an exact match in external APIs or needs AI matching
    let venueMatches = await findVenueMatches(venue);
    
    // Use AI to improve venue matching if needed
    if (!venueMatches.length) {
      venueMatches = await useAIForVenueMatching(venue);
    }

    if (!venueMatches.length) {
      return { 
        success: false,
        message: `Couldn't find venue matches for "${venue.name}" in ${venue.city}, ${venue.region || ''} in any of the configured data sources.`
      };
    }

    // Fetch events from all available sources based on venue matches
    let allEvents: any[] = [];
    let totalEventsFound = 0;

    for (const source of enabledSources) {
      const sourceMatches = venueMatches.filter(m => m.source === source.name);
      if (sourceMatches.length > 0) {
        for (const match of sourceMatches) {
          const eventsFromSource = await fetchEventsFromSource(source.name, match.id, source.apiKey);
          if (eventsFromSource.length > 0) {
            allEvents = [...allEvents, ...eventsFromSource.map(e => ({ ...e, source: source.name }))];
            totalEventsFound += eventsFromSource.length;
          }
        }
      }
    }

    // Process and save events
    let eventsCreated = 0;
    const processedEvents = await processEvents(allEvents, existingArtists, venue.id);
    eventsCreated = processedEvents.length;

    return {
      success: true,
      message: `Found ${totalEventsFound} events for ${venue.name}, saved ${eventsCreated} to database`,
      eventsFound: eventsCreated,
      venue: venue
    };
  } catch (error) {
    console.error(`Error finding events: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, message: `Error finding events: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Find venue matches in external APIs
 */
async function findVenueMatches(venue: any): Promise<{ source: string, id: string, confidence: number }[]> {
  const matches: { source: string, id: string, confidence: number }[] = [];
  
  // This would contain the logic to search venues in various APIs
  // For now, we'll return an empty array since this would depend on the specific API implementations
  
  return matches;
}

/**
 * Use AI to help match venues across different data sources
 */
async function useAIForVenueMatching(venue: any): Promise<{ source: string, id: string, confidence: number }[]> {
  // In a real implementation, this would use AI to suggest possible matches from different APIs
  // For this example, we'll return placeholder data
  return [];
}

/**
 * Fetch events from a specific source using the matched venue ID
 */
async function fetchEventsFromSource(source: string, venueId: string, apiKey: string): Promise<any[]> {
  switch (source) {
    case 'bandsintown':
      return await fetchBandsintownEvents(venueId, apiKey);
    case 'ticketmaster':
      return await fetchTicketmasterEvents(venueId, apiKey);
    case 'songkick':
      return await fetchSongkickEvents(venueId, apiKey);
    default:
      return [];
  }
}

/**
 * Fetch events from Bandsintown API
 */
async function fetchBandsintownEvents(venueId: string, apiKey: string): Promise<any[]> {
  try {
    // This would be implemented with actual Bandsintown API calls
    // For now, returning an empty array
    return [];
  } catch (error) {
    console.error(`Error fetching Bandsintown events: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Fetch events from Ticketmaster API
 */
async function fetchTicketmasterEvents(venueId: string, apiKey: string): Promise<any[]> {
  try {
    // This would be implemented with actual Ticketmaster API calls
    // For now, returning an empty array
    return [];
  } catch (error) {
    console.error(`Error fetching Ticketmaster events: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Fetch events from Songkick API
 */
async function fetchSongkickEvents(venueId: string, apiKey: string): Promise<any[]> {
  try {
    // This would be implemented with actual Songkick API calls
    // For now, returning an empty array
    return [];
  } catch (error) {
    console.error(`Error fetching Songkick events: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Process events to normalize data, match artists, and save to database
 */
async function processEvents(sourceEvents: any[], existingArtists: any[], venueId: number): Promise<any[]> {
  const processedEvents = [];
  
  for (const sourceEvent of sourceEvents) {
    try {
      // Find or create artist
      let artist = findMatchingArtist(sourceEvent.artistName, existingArtists);
      
      if (!artist) {
        // Create new artist using AI to enhance the data
        artist = await createArtistWithAI(sourceEvent.artistName);
        if (artist) {
          existingArtists.push(artist); // Add to our list of existing artists
        }
      }
      
      if (!artist) {
        console.warn(`Couldn't process artist ${sourceEvent.artistName}, skipping event`);
        continue;
      }
      
      // Normalize and save event
      const eventDate = parseISO(sourceEvent.date);
      if (!isFuture(eventDate)) {
        // Skip past events
        continue;
      }
      
      // Save to database
      const savedEvent = await db.insert(events).values({
        date: sourceEvent.date,
        artistId: artist.id,
        venueId: venueId,
        ticketPrice: sourceEvent.price || null,
        description: sourceEvent.description || null,
        time: sourceEvent.time || null,
        status: 'confirmed',
        sourceName: sourceEvent.source
      }).returning();
      
      if (savedEvent && savedEvent.length > 0) {
        processedEvents.push(savedEvent[0]);
      }
    } catch (error) {
      console.error(`Error processing event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return processedEvents;
}

/**
 * Find matching artist in existing artists
 */
function findMatchingArtist(artistName: string, existingArtists: any[]): any | null {
  // Basic exact name matching
  return existingArtists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
}

/**
 * Create a new artist with AI-enhanced data
 */
async function createArtistWithAI(artistName: string): Promise<any | null> {
  try {
    // Use AI to get information about this artist
    const artistInfo = await getArtistInfoWithAI(artistName);
    
    // Create artist in database
    const result = await db.insert(artists).values({
      name: artistName,
      description: artistInfo.description,
      genres: artistInfo.genres,
      popularity: artistInfo.popularity,
      createdAt: sql`NOW()`,
      updatedAt: sql`NOW()`
    }).returning();
    
    if (result && result.length > 0) {
      return result[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error creating artist: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Get artist information using AI
 */
async function getArtistInfoWithAI(artistName: string): Promise<{ description: string, genres: string[], popularity: number }> {
  try {
    const prompt = `Please provide factual information about the musical artist "${artistName}".
    
Provide the following in JSON format:
1. genres: An array of 1-3 music genres that best describe this artist. Use only factual genres. If you don't know, use ["other"]
2. description: A brief factual description of the artist (50-100 words). Only include verifiable information.
3. popularity: A number between 1 and 100 representing their popularity level. If unknown, use a value between 30-50.

Only return valid JSON without any additional text. If you don't have enough information, provide reasonable guesses but mark clearly in the description that this is limited information.`;

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant that provides factual information about musical artists." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        description: `Limited information available for ${artistName}.`,
        genres: ["other"],
        popularity: 40
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        description: parsed.description || `Limited information available for ${artistName}.`,
        genres: Array.isArray(parsed.genres) ? parsed.genres : ["other"],
        popularity: typeof parsed.popularity === 'number' ? parsed.popularity : 40
      };
    } catch (err) {
      console.error("Failed to parse OpenAI response:", err);
      return {
        description: `Limited information available for ${artistName}.`,
        genres: ["other"],
        popularity: 40
      };
    }
  } catch (error) {
    console.error(`Error getting artist info: ${error instanceof Error ? error.message : String(error)}`);
    return {
      description: `Limited information available for ${artistName}.`,
      genres: ["other"],
      popularity: 40
    };
  }
}