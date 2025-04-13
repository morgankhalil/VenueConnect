import { OpenAI } from 'openai';
import { venues, artists, Venue, Artist } from '../../shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

/**
 * AI Data Enhancement Service
 * 
 * This service provides AI-powered enhancement for venue and artist data:
 * - Generating rich descriptions from minimal data
 * - Standardizing inconsistent data formats
 * - Adding contextual information based on location, genre, etc.
 */
export class AIDataEnhancementService {
  private openai: OpenAI | null = null;
  
  constructor(apiKey?: string) {
    if (apiKey) {
      this.initializeOpenAI(apiKey);
    }
  }
  
  /**
   * Initialize the OpenAI client with an API key
   */
  public initializeOpenAI(apiKey: string): boolean {
    try {
      this.openai = new OpenAI({ apiKey });
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI:', error);
      return false;
    }
  }
  
  /**
   * Check if OpenAI is initialized
   */
  public isInitialized(): boolean {
    return this.openai !== null;
  }
  
  /**
   * Generate an enhanced description for a venue based on minimal data
   */
  public async enhanceVenueDescription(venue: Partial<Venue>): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    // Create a prompt based on available venue data
    const prompt = this.createVenueDescriptionPrompt(venue);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates professional descriptions for music venues based on available information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 250
      });
      
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating venue description:', error);
      throw new Error('Failed to generate venue description');
    }
  }
  
  /**
   * Generate an enhanced description for an artist based on minimal data
   */
  public async enhanceArtistDescription(artist: Partial<Artist>): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    // Create a prompt based on available artist data
    const prompt = this.createArtistDescriptionPrompt(artist);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a music industry expert that writes compelling artist descriptions based on available information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 250
      });
      
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating artist description:', error);
      throw new Error('Failed to generate artist description');
    }
  }
  
  /**
   * Normalize and standardize venue data formats
   */
  public async normalizeVenueData(venue: Partial<Venue>): Promise<Partial<Venue>> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      // Create a prompt for data normalization
      const prompt = `
        Normalize and standardize the following venue data. Fill in missing fields where possible based on available information.
        Return the result as a valid JSON object with the same structure as the input, but with normalized values.
        
        Venue data:
        ${JSON.stringify(venue, null, 2)}
        
        Rules for normalization:
        1. City names should be properly capitalized
        2. Country should be the two-letter ISO code (e.g., "US" for United States)
        3. Region should be the standard state/province abbreviation where applicable
        4. Venue types should be one of: club, bar, theater, coffeehouse, diy_space, art_gallery, college_venue, community_center, record_store
        5. Capacity categories should be: tiny (< 100), small (100-300), medium (301-1000), large (> 1000)
        6. If exact capacity is known, derive the capacity category from it
        7. Standardize website URLs to include http:// or https:// prefix
        8. Format phone numbers consistently
        9. DO NOT invent information that is not implied by the data
        
        Return ONLY the JSON object with no additional text.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data normalization assistant that standardizes venue information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });
      
      const normalizedData = response.choices[0]?.message?.content || '';
      
      try {
        // Parse the normalized JSON response
        return JSON.parse(normalizedData);
      } catch (error) {
        console.error('Failed to parse normalized venue data:', error);
        return venue;
      }
    } catch (error) {
      console.error('Error normalizing venue data:', error);
      return venue;
    }
  }
  
  /**
   * Normalize and standardize artist data formats
   */
  public async normalizeArtistData(artist: Partial<Artist>): Promise<Partial<Artist>> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      // Create a prompt for data normalization
      const prompt = `
        Normalize and standardize the following artist data. Fill in missing fields where possible based on available information.
        Return the result as a valid JSON object with the same structure as the input, but with normalized values.
        
        Artist data:
        ${JSON.stringify(artist, null, 2)}
        
        Rules for normalization:
        1. Artist names should have proper capitalization
        2. Genre names should be standardized to common formats (e.g., "hip-hop" not "hiphop" or "hip hop")
        3. Standardize website URLs to include http:// or https:// prefix
        4. Ensure social media links are properly formatted
        5. DO NOT invent information that is not implied by the data
        
        Return ONLY the JSON object with no additional text.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a data normalization assistant that standardizes artist information.' },
          { role: 'user', content: 'You are a data normalization assistant that standardizes artist information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });
      
      const normalizedData = response.choices[0]?.message?.content || '';
      
      try {
        // Parse the normalized JSON response
        return JSON.parse(normalizedData);
      } catch (error) {
        console.error('Failed to parse normalized artist data:', error);
        return artist;
      }
    } catch (error) {
      console.error('Error normalizing artist data:', error);
      return artist;
    }
  }
  
  /**
   * Enhance venue context by generating additional metadata
   */
  public async enhanceVenueContext(venue: Partial<Venue>): Promise<Partial<Venue>> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      // Create a prompt for context enhancement
      const prompt = `
        Based on the following venue information, enhance the context by:
        1. Suggesting the most likely market category (primary, secondary, tertiary)
        2. Suggesting the most likely venue type if not specified
        3. Suggesting a likely capacity category if not specified
        4. Identifying potential genre specializations based on the venue description and location
        
        Venue data:
        ${JSON.stringify(venue, null, 2)}
        
        Return a JSON object with ONLY the following fields:
        {
          "marketCategory": string, // "primary", "secondary", or "tertiary"
          "venueType": string, // one of the standard venue types if not already specified
          "capacityCategory": string, // capacity category if not already specified
          "primaryGenre": string, // likely primary genre focus if determinable
          "secondaryGenres": string[] // likely secondary genre focuses if determinable
        }
        
        If you cannot confidently determine a value, omit the field.
        Return ONLY the JSON object with no additional text.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a music industry expert that can determine venue context from limited information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 500
      });
      
      const enhancedData = response.choices[0]?.message?.content || '';
      
      try {
        // Parse the enhanced context JSON response
        const enhancedContext = JSON.parse(enhancedData);
        
        // Merge with the original venue data
        return {
          ...venue,
          ...enhancedContext
        };
      } catch (error) {
        console.error('Failed to parse enhanced venue context:', error);
        return venue;
      }
    } catch (error) {
      console.error('Error enhancing venue context:', error);
      return venue;
    }
  }
  
  /**
   * Create a prompt for generating a venue description
   */
  private createVenueDescriptionPrompt(venue: Partial<Venue>): string {
    return `
      Create a professional, compelling description for a music venue with the following information:
      
      Name: ${venue.name || 'Unknown'}
      City: ${venue.city || 'Unknown'}
      Region: ${venue.region || 'Unknown'}
      Country: ${venue.country || 'Unknown'}
      Venue Type: ${venue.venueType || 'Unknown'}
      Capacity: ${venue.capacity || 'Unknown'}
      Primary Genre: ${venue.primaryGenre || 'Various'}
      
      Additional details:
      ${venue.description || ''}
      
      The description should be about 2-3 sentences long and highlight the venue's character, typical offerings, and appeal for musicians. Be specific about the location and venue type, but don't invent factual details not mentioned above.
    `;
  }
  
  /**
   * Create a prompt for generating an artist description
   */
  private createArtistDescriptionPrompt(artist: Partial<Artist>): string {
    return `
      Create a professional, compelling description for a musical artist with the following information:
      
      Name: ${artist.name || 'Unknown'}
      Genres: ${(artist.genres || []).join(', ') || 'Unknown'}
      Popularity: ${artist.popularity || 'Unknown'}
      
      Additional details:
      ${artist.description || ''}
      
      The description should be about 2-3 sentences long and highlight the artist's style, musical background, and appeal. Be specific about the genre and style, but don't invent factual details not mentioned above.
    `;
  }
  
  /**
   * Process a batch of venues to enhance their data
   */
  public async enhanceVenueBatch(venueIds: number[]): Promise<number> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    let enhancedCount = 0;
    
    for (const venueId of venueIds) {
      try {
        // Retrieve the venue from the database
        const [venueData] = await db.select().from(venues).where(eq(venues.id, venueId));
        
        if (!venueData) {
          console.warn(`Venue with ID ${venueId} not found.`);
          continue;
        }
        
        // Skip if venue already has a description
        if (venueData.description && venueData.description.length > 50) {
          console.log(`Venue ${venueId} already has a description. Skipping.`);
          continue;
        }
        
        // Step 1: Normalize the data format
        const normalizedVenue = await this.normalizeVenueData(venueData);
        
        // Step 2: Enhance the venue context
        const enhancedVenue = await this.enhanceVenueContext(normalizedVenue);
        
        // Step 3: Generate a description if none exists
        if (!enhancedVenue.description || enhancedVenue.description.length < 50) {
          enhancedVenue.description = await this.enhanceVenueDescription(enhancedVenue);
        }
        
        // Update the venue in the database
        await db.update(venues)
          .set({
            name: enhancedVenue.name,
            city: enhancedVenue.city,
            region: enhancedVenue.region,
            country: enhancedVenue.country,
            description: enhancedVenue.description,
            primaryGenre: enhancedVenue.primaryGenre,
            secondaryGenres: enhancedVenue.secondaryGenres,
            venueType: enhancedVenue.venueType,
            capacityCategory: enhancedVenue.capacityCategory,
            marketCategory: enhancedVenue.marketCategory,
            updatedAt: new Date()
          })
          .where(eq(venues.id, venueId));
        
        enhancedCount++;
        console.log(`Enhanced venue ${venueId} successfully.`);
      } catch (error) {
        console.error(`Error enhancing venue ${venueId}:`, error);
      }
    }
    
    return enhancedCount;
  }
  
  /**
   * Process a batch of artists to enhance their data
   */
  public async enhanceArtistBatch(artistIds: number[]): Promise<number> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    let enhancedCount = 0;
    
    for (const artistId of artistIds) {
      try {
        // Retrieve the artist from the database
        const [artistData] = await db.select().from(artists).where(eq(artists.id, artistId));
        
        if (!artistData) {
          console.warn(`Artist with ID ${artistId} not found.`);
          continue;
        }
        
        // Skip if artist already has a description
        if (artistData.description && artistData.description.length > 50) {
          console.log(`Artist ${artistId} already has a description. Skipping.`);
          continue;
        }
        
        // Step 1: Normalize the data format
        const normalizedArtist = await this.normalizeArtistData(artistData);
        
        // Step 2: Generate a description if none exists
        if (!normalizedArtist.description || normalizedArtist.description.length < 50) {
          normalizedArtist.description = await this.enhanceArtistDescription(normalizedArtist);
        }
        
        // Update the artist in the database
        await db.update(artists)
          .set({
            name: normalizedArtist.name,
            description: normalizedArtist.description,
            updatedAt: new Date()
          })
          .where(eq(artists.id, artistId));
        
        enhancedCount++;
        console.log(`Enhanced artist ${artistId} successfully.`);
      } catch (error) {
        console.error(`Error enhancing artist ${artistId}:`, error);
      }
    }
    
    return enhancedCount;
  }
}

// Export a singleton instance
export const aiDataEnhancer = new AIDataEnhancementService();