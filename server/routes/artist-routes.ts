import express from 'express';
import { db } from '../db';
import { artists } from '../../shared/schema';
import { eq, like, or, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Search artists by name or genre
 * Returns artists matching the search query
 */
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Search for artists matching the query in name
    const searchResults = await db.query.artists.findMany({
      where: like(artists.name, `%${query}%`),
      columns: {
        id: true,
        name: true,
        genres: true,
        bandsintownId: true,
        popularity: true,
        imageUrl: true
      },
      limit: 20,
      orderBy: artists.name
    });
    
    return res.json(searchResults);
  } catch (error) {
    console.error('Error searching artists:', error);
    return res.status(500).json({ error: 'Failed to search artists' });
  }
});

/**
 * Get all artists
 * Returns a list of all artists with optional pagination
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const allArtists = await db.query.artists.findMany({
      columns: {
        id: true,
        name: true,
        genres: true,
        bandsintownId: true,
        popularity: true,
        imageUrl: true
      },
      limit,
      offset,
      orderBy: artists.name
    });
    
    // Get total count for pagination
    const totalCount = await db.select({
      count: sql`count(*)::int`
    }).from(artists).then(result => result[0]?.count || 0);
    
    return res.json({
      artists: allArtists,
      total: totalCount,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    return res.status(500).json({ error: 'Failed to load artists' });
  }
});

/**
 * Get artist by id
 * Returns detailed information about a specific artist
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);
    
    if (isNaN(artistId)) {
      return res.status(400).json({ error: 'Invalid artist ID format' });
    }
    
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, artistId)
    });
    
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    return res.json(artist);
  } catch (error) {
    console.error('Error fetching artist:', error);
    return res.status(500).json({ error: 'Failed to load artist' });
  }
});

export default router;