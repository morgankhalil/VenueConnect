import { db } from '../db';
import { artists, events, venues } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { addMonths, format, addDays, isFuture, parseISO } from 'date-fns';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedEvent {
  artistName: string;
  date: string; // ISO date string
  time: string; // e.g. "8:00 PM"
  ticketPrice: string; // e.g. "$15-25"
  description: string;
}

interface ArtistInfo {
  name: string;
  genres: string[];
  description: string;
  popularity: number; // 1-100
}

/**
 * Seed events for a specific venue using AI
 */
export async function generateEventsForVenue(venueId: number, numberOfEvents: number = 5): Promise<{
  success: boolean;
  message: string;
  eventsGenerated?: number;
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

    // Generate event suggestions using AI
    const startDate = new Date();
    const endDate = addMonths(startDate, 3); // Generate events for the next 3 months

    // Set up AI prompt
    const generatedEvents = await generateEventSuggestions(venue, numberOfEvents, startDate, endDate);
    
    if (!generatedEvents || generatedEvents.length === 0) {
      return { success: false, message: 'Failed to generate event suggestions' };
    }

    // Process and save events
    let eventsCreated = 0;
    for (const eventData of generatedEvents) {
      try {
        // Find or create artist
        let artist = await findOrCreateArtist(eventData.artistName);
        if (!artist) {
          const artistInfo = await generateArtistInfo(eventData.artistName);
          artist = await createArtist(artistInfo);
        }

        if (!artist) {
          console.error(`Failed to create artist for event: ${eventData.artistName}`);
          continue;
        }

        // Convert date and ensure it's in the future
        const eventDate = parseISO(eventData.date);
        if (!isFuture(eventDate)) {
          console.warn(`Skipping event with past date: ${eventDate}`);
          continue;
        }

        // Create event
        await db.insert(events).values({
          date: eventData.date,
          artistId: artist.id,
          venueId: venueId,
          ticketPrice: eventData.ticketPrice,
          description: eventData.description,
          time: eventData.time,
          status: 'confirmed',
          sourceName: 'ai-generated'
        });

        eventsCreated++;
      } catch (error) {
        console.error(`Error processing event: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: true,
      message: `Successfully generated ${eventsCreated} events for ${venue.name}`,
      eventsGenerated: eventsCreated,
      venue: venue
    };
  } catch (error) {
    console.error(`Error generating events: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, message: `Error generating events: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Use AI to generate event suggestions for a venue
 */
async function generateEventSuggestions(
  venue: any,
  count: number,
  startDate: Date,
  endDate: Date
): Promise<GeneratedEvent[]> {
  try {
    // Create a prompt with venue details
    const prompt = `Generate ${count} realistic future music events for the venue "${venue.name}" in ${venue.city}, ${venue.region || ''} between ${format(startDate, 'PPP')} and ${format(endDate, 'PPP')}.

Venue details:
- Name: ${venue.name}
- Location: ${venue.city}, ${venue.region || ''}
- Capacity: ${venue.capacity || 'Unknown'}
${venue.description ? `- Description: ${venue.description}` : ''}

For each event, provide the following details in JSON format:
1. artistName: Name of the performing artist or band (use realistic band names that would perform at this venue)
2. date: ISO date string (YYYY-MM-DD) for the event between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}
3. time: Start time (e.g., "8:00 PM")
4. ticketPrice: Ticket price range (e.g., "$15-25")
5. description: A brief description of the event (50-100 words)

Return the result as a valid JSON array without any additional text.`;

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates realistic music event data for venues." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content returned from OpenAI");
      return [];
    }

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.events)) {
        return parsed.events;
      } else if (parsed.events) {
        console.warn("Events property is not an array, attempting to use directly:", typeof parsed.events);
        return [];
      } else if (Array.isArray(parsed)) {
        return parsed;
      } else {
        // Look for an array property in the response
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            console.log(`Found array in property ${key}, using it for events`);
            return parsed[key];
          }
        }
        console.error("Failed to find an array in the response:", parsed);
        return [];
      }
    } catch (err) {
      console.error("Failed to parse OpenAI response:", err);
      console.error("Raw response:", content);
      return [];
    }
  } catch (error) {
    console.error(`Error generating event suggestions: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Find an artist by name or create a new one
 */
async function findOrCreateArtist(name: string): Promise<any | null> {
  try {
    // Try to find existing artist with this name
    const existingArtist = await db.query.artists.findFirst({
      where: eq(artists.name, name)
    });

    if (existingArtist) {
      return existingArtist;
    }

    return null;
  } catch (error) {
    console.error(`Error finding or creating artist: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Generate artist information using AI
 */
async function generateArtistInfo(artistName: string): Promise<ArtistInfo> {
  try {
    const prompt = `Generate detailed information for a musical artist or band named "${artistName}".
    
Provide the following information in JSON format:
1. name: The band/artist name (use the provided name: ${artistName})
2. genres: An array of 1-3 music genres that best describe this artist (choose from: rock, pop, electronic, jazz, classical, hip-hop, r&b, folk, country, metal, punk, indie, alternative, ambient, blues, reggae, soul, funk, dance, world)
3. description: A brief description of the artist (100-150 words)
4. popularity: A number between 1 and 100 representing their popularity level

Return only valid JSON without any additional text.`;

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates realistic artist information." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content returned from OpenAI for artist info");
      return {
        name: artistName,
        genres: ["other"],
        description: `${artistName} is a musical artist.`,
        popularity: Math.floor(Math.random() * 70) + 30 // Random popularity between 30-100
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        name: artistName,
        genres: parsed.genres || ["other"],
        description: parsed.description || `${artistName} is a musical artist.`,
        popularity: parsed.popularity || Math.floor(Math.random() * 70) + 30
      };
    } catch (err) {
      console.error("Failed to parse artist info OpenAI response:", err);
      return {
        name: artistName,
        genres: ["other"],
        description: `${artistName} is a musical artist.`,
        popularity: Math.floor(Math.random() * 70) + 30
      };
    }
  } catch (error) {
    console.error(`Error generating artist info: ${error instanceof Error ? error.message : String(error)}`);
    return {
      name: artistName,
      genres: ["other"],
      description: `${artistName} is a musical artist.`,
      popularity: Math.floor(Math.random() * 70) + 30
    };
  }
}

/**
 * Create a new artist in the database
 */
async function createArtist(artistInfo: ArtistInfo): Promise<any | null> {
  try {
    const result = await db.insert(artists).values({
      name: artistInfo.name,
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