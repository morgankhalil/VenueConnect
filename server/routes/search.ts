/**
 * Search routes for events, artists, and venues with genre filtering
 */

import { Router } from 'express';
import { db } from '../db';
import { artists, events, venues, genres, artistGenres, venueGenres } from '../../shared/schema';
import { eq, and, inArray, like, or, ilike, count, sql, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Search query schema
const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  genre: z.string().optional(),
  genreId: z.coerce.number().optional(),
  venueType: z.string().optional(),
  regionFilter: z.string().optional(),
  sort: z.enum(['relevance', 'date', 'name']).optional().default('relevance'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// Event search endpoint
router.get('/events/search', async (req, res) => {
  try {
    // Validate query parameters
    const result = searchQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid search parameters', details: result.error });
    }
    
    const { query, genre, genreId, sort, page, limit } = result.data;
    const offset = (page - 1) * limit;
    
    // Base query - join events with artists and venues
    let eventsQuery = db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        ticketLink: events.ticketLink,
        artist: {
          id: artists.id,
          name: artists.name,
          imageUrl: artists.imageUrl,
        },
        venue: {
          id: venues.id,
          name: venues.name,
          city: venues.city,
          region: venues.region,
        },
      })
      .from(events)
      .innerJoin(artists, eq(events.artistId, artists.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(
        or(
          ilike(events.name, `%${query}%`),
          ilike(artists.name, `%${query}%`),
          ilike(venues.name, `%${query}%`)
        )
      );
    
    // Apply genre filter if specified
    if (genre || genreId) {
      // Get genre ID if name was provided
      let targetGenreId = genreId;
      
      if (genre && !genreId) {
        const genreResult = await db
          .select({ id: genres.id })
          .from(genres)
          .where(or(
            eq(genres.name, genre),
            eq(genres.slug, genre.toLowerCase().replace(/\s+/g, '-'))
          ))
          .limit(1);
        
        if (genreResult.length > 0) {
          targetGenreId = genreResult[0].id;
        }
      }
      
      if (targetGenreId) {
        // Find all artists with this genre
        const artistsWithGenre = await db
          .select({ artistId: artistGenres.artistId })
          .from(artistGenres)
          .where(eq(artistGenres.genreId, targetGenreId));
        
        const artistIds = artistsWithGenre.map(a => a.artistId);
        
        if (artistIds.length > 0) {
          eventsQuery = eventsQuery.where(inArray(events.artistId, artistIds));
        } else {
          // No artists with this genre, return empty result
          return res.json({
            total: 0,
            page,
            limit,
            events: []
          });
        }
      }
    }
    
    // Apply sorting
    if (sort === 'date') {
      eventsQuery = eventsQuery.orderBy(asc(events.date));
    } else if (sort === 'name') {
      eventsQuery = eventsQuery.orderBy(asc(events.name));
    } else {
      // Default relevance sort - newest events first
      eventsQuery = eventsQuery.orderBy(desc(events.date));
    }
    
    // Apply pagination
    eventsQuery = eventsQuery.limit(limit).offset(offset);
    
    // Execute query
    const eventResults = await eventsQuery;
    
    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(events)
      .innerJoin(artists, eq(events.artistId, artists.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(
        or(
          ilike(events.name, `%${query}%`),
          ilike(artists.name, `%${query}%`),
          ilike(venues.name, `%${query}%`)
        )
      );
    
    const total = totalCountResult[0]?.count || 0;
    
    return res.json({
      total,
      page,
      limit,
      events: eventResults
    });
  } catch (error) {
    console.error('Error searching events:', error);
    return res.status(500).json({ error: 'Server error during search' });
  }
});

// Artist search endpoint
router.get('/artists/search', async (req, res) => {
  try {
    // Validate query parameters
    const result = searchQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid search parameters', details: result.error });
    }
    
    const { query, genre, genreId, sort, page, limit } = result.data;
    const offset = (page - 1) * limit;
    
    // Base artist query
    let artistsQuery = db
      .select({
        id: artists.id,
        name: artists.name,
        imageUrl: artists.imageUrl,
        popularity: artists.popularity,
        description: artists.description,
      })
      .from(artists)
      .where(ilike(artists.name, `%${query}%`));
    
    // Apply genre filter if specified
    if (genre || genreId) {
      let targetGenreId = genreId;
      
      if (genre && !genreId) {
        const genreResult = await db
          .select({ id: genres.id })
          .from(genres)
          .where(or(
            eq(genres.name, genre),
            eq(genres.slug, genre.toLowerCase().replace(/\s+/g, '-'))
          ))
          .limit(1);
        
        if (genreResult.length > 0) {
          targetGenreId = genreResult[0].id;
        }
      }
      
      if (targetGenreId) {
        // Find all artists with this genre
        const artistsWithGenre = await db
          .select({ artistId: artistGenres.artistId })
          .from(artistGenres)
          .where(eq(artistGenres.genreId, targetGenreId));
        
        const artistIds = artistsWithGenre.map(a => a.artistId);
        
        if (artistIds.length > 0) {
          artistsQuery = artistsQuery.where(inArray(artists.id, artistIds));
        } else {
          // No artists with this genre, return empty result
          return res.json({
            total: 0,
            page,
            limit,
            artists: []
          });
        }
      }
    }
    
    // Apply sorting
    if (sort === 'name') {
      artistsQuery = artistsQuery.orderBy(asc(artists.name));
    } else {
      // Default sort by popularity
      artistsQuery = artistsQuery.orderBy(desc(artists.popularity));
    }
    
    // Apply pagination
    artistsQuery = artistsQuery.limit(limit).offset(offset);
    
    // Execute query
    const artistResults = await artistsQuery;
    
    // For each artist, get their genres
    const artistsWithGenres = await Promise.all(
      artistResults.map(async (artist) => {
        const genreRelations = await db
          .select({
            genreId: artistGenres.genreId
          })
          .from(artistGenres)
          .where(eq(artistGenres.artistId, artist.id));
        
        if (genreRelations.length === 0) {
          return { ...artist, genres: [] };
        }
        
        const genreIds = genreRelations.map(rel => rel.genreId);
        
        const artistGenreInfo = await db
          .select({
            id: genres.id,
            name: genres.name,
            slug: genres.slug
          })
          .from(genres)
          .where(inArray(genres.id, genreIds));
        
        return {
          ...artist,
          genres: artistGenreInfo
        };
      })
    );
    
    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(artists)
      .where(ilike(artists.name, `%${query}%`));
    
    const total = totalCountResult[0]?.count || 0;
    
    return res.json({
      total,
      page,
      limit,
      artists: artistsWithGenres
    });
  } catch (error) {
    console.error('Error searching artists:', error);
    return res.status(500).json({ error: 'Server error during search' });
  }
});

// Get all genres with hierarchical structure
router.get('/genres', async (req, res) => {
  try {
    // Get all genres
    const allGenres = await db
      .select({
        id: genres.id,
        name: genres.name,
        slug: genres.slug,
        parentId: genres.parentId
      })
      .from(genres)
      .orderBy(asc(genres.name));
    
    // Organize into a hierarchical structure
    const genreMap = new Map();
    const rootGenres = [];
    
    // First pass: create objects for each genre
    allGenres.forEach(genre => {
      genreMap.set(genre.id, {
        ...genre,
        subgenres: []
      });
    });
    
    // Second pass: build the hierarchy
    allGenres.forEach(genre => {
      const genreWithSubgenres = genreMap.get(genre.id);
      
      if (genre.parentId === null) {
        // This is a root genre
        rootGenres.push(genreWithSubgenres);
      } else {
        // This is a subgenre, add it to its parent
        const parent = genreMap.get(genre.parentId);
        if (parent) {
          parent.subgenres.push(genreWithSubgenres);
        }
      }
    });
    
    return res.json({
      genres: rootGenres
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    return res.status(500).json({ error: 'Server error fetching genres' });
  }
});

export default router;