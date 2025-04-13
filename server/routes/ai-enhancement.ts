import express from 'express';
import { db } from '../db';
import { venues, artists } from '../../shared/schema';
import { aiDataEnhancer } from '../services/ai-data-enhancer';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Initialize the AI enhancement service with an API key
 * POST /api/ai/initialize
 */
router.post('/initialize', async (req, res) => {
  const { openaiKey } = req.body;
  
  if (!openaiKey) {
    return res.status(400).json({
      success: false,
      message: 'OpenAI API key is required'
    });
  }
  
  try {
    const initialized = aiDataEnhancer.initializeOpenAI(openaiKey);
    
    if (!initialized) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize OpenAI client'
      });
    }
    
    return res.json({
      success: true,
      message: 'AI enhancement service initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing AI service:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while initializing the AI service'
    });
  }
});

/**
 * Check if the AI enhancement service is initialized
 * GET /api/ai/status
 */
router.get('/status', async (req, res) => {
  const isInitialized = aiDataEnhancer.isInitialized();
  
  return res.json({
    success: true,
    initialized: isInitialized
  });
});

/**
 * Enhance a venue description
 * POST /api/ai/enhance-venue/:id
 */
router.post('/enhance-venue/:id', async (req, res) => {
  const venueId = parseInt(req.params.id, 10);
  
  if (isNaN(venueId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid venue ID'
    });
  }
  
  try {
    // Check if the AI service is initialized
    if (!aiDataEnhancer.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'AI enhancement service not initialized'
      });
    }
    
    // Get the venue from the database
    const [venueData] = await db.select().from(venues).where(eq(venues.id, venueId));
    
    if (!venueData) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }
    
    // Step 1: Normalize the data format
    const normalizedVenue = await aiDataEnhancer.normalizeVenueData(venueData);
    
    // Step 2: Enhance the venue context
    const enhancedVenue = await aiDataEnhancer.enhanceVenueContext(normalizedVenue);
    
    // Step 3: Generate a description if requested or if none exists
    let description = enhancedVenue.description;
    
    if (req.body.generateDescription || !description || description.length < 50) {
      description = await aiDataEnhancer.enhanceVenueDescription(enhancedVenue);
      enhancedVenue.description = description;
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
    
    // Return the enhanced venue
    return res.json({
      success: true,
      venue: enhancedVenue
    });
  } catch (error) {
    console.error(`Error enhancing venue ${venueId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while enhancing the venue'
    });
  }
});

/**
 * Enhance an artist description
 * POST /api/ai/enhance-artist/:id
 */
router.post('/enhance-artist/:id', async (req, res) => {
  const artistId = parseInt(req.params.id, 10);
  
  if (isNaN(artistId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid artist ID'
    });
  }
  
  try {
    // Check if the AI service is initialized
    if (!aiDataEnhancer.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'AI enhancement service not initialized'
      });
    }
    
    // Get the artist from the database
    const [artistData] = await db.select().from(artists).where(eq(artists.id, artistId));
    
    if (!artistData) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }
    
    // Step 1: Normalize the data format
    const normalizedArtist = await aiDataEnhancer.normalizeArtistData(artistData);
    
    // Step 2: Generate a description if requested or if none exists
    let description = normalizedArtist.description;
    
    if (req.body.generateDescription || !description || description.length < 50) {
      description = await aiDataEnhancer.enhanceArtistDescription(normalizedArtist);
      normalizedArtist.description = description;
    }
    
    // Update the artist in the database
    await db.update(artists)
      .set({
        name: normalizedArtist.name,
        description: normalizedArtist.description,
        updatedAt: new Date()
      })
      .where(eq(artists.id, artistId));
    
    // Return the enhanced artist
    return res.json({
      success: true,
      artist: normalizedArtist
    });
  } catch (error) {
    console.error(`Error enhancing artist ${artistId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while enhancing the artist'
    });
  }
});

/**
 * Generate venue description preview without saving
 * POST /api/ai/preview-venue-description
 */
router.post('/preview-venue-description', async (req, res) => {
  const venueData = req.body.venue;
  
  if (!venueData) {
    return res.status(400).json({
      success: false,
      message: 'Venue data is required'
    });
  }
  
  try {
    // Check if the AI service is initialized
    if (!aiDataEnhancer.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'AI enhancement service not initialized'
      });
    }
    
    // Generate a description
    const description = await aiDataEnhancer.enhanceVenueDescription(venueData);
    
    // Return the description
    return res.json({
      success: true,
      description
    });
  } catch (error) {
    console.error('Error generating venue description preview:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while generating the venue description'
    });
  }
});

/**
 * Generate artist description preview without saving
 * POST /api/ai/preview-artist-description
 */
router.post('/preview-artist-description', async (req, res) => {
  const artistData = req.body.artist;
  
  if (!artistData) {
    return res.status(400).json({
      success: false,
      message: 'Artist data is required'
    });
  }
  
  try {
    // Check if the AI service is initialized
    if (!aiDataEnhancer.isInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'AI enhancement service not initialized'
      });
    }
    
    // Generate a description
    const description = await aiDataEnhancer.enhanceArtistDescription(artistData);
    
    // Return the description
    return res.json({
      success: true,
      description
    });
  } catch (error) {
    console.error('Error generating artist description preview:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while generating the artist description'
    });
  }
});

export default router;