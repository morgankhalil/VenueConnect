/**
 * Search routes for events, artists, and venues with genre filtering
 */
import { Router } from 'express';
import { 
  asc, count, desc, eq, inArray, ilike, or, and, sql
} from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { artists, events, genres, venues } from '../../shared/schema';
import { 
  getArtistGenres, 
  getGenreBySlug, 
  getGenreByName, 
  getArtistsByGenre,
  getGenreById,
  findRelatedGenresByArtistOverlap,
  getGenreWithChildren
} from '../helpers/genre-utils';

const router = Router();

// Search query validation schema
const searchQuerySchema = z.object({
  // Support both 'query' and 'q' parameter styles
  query: z.string().optional(),
  q: z.string().optional(), 
  genre: z.string().optional(),
  genreId: z.coerce.number().optional(),
  artistId: z.coerce.number().optional(),
  artistName: z.string().optional(),
  sort: z.enum(['date', 'name', 'relevance']).optional().default('relevance'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})
// Transform the parsed query to standardize on 'query' parameter
.transform(data => {
  // If q is provided but query isn't, use q as query
  if (data.q && !data.query) {
    return { ...data, query: data.q };
  }
  return data;
});

// Event search endpoint
router.get('/search/events', async (req, res) => {
  try {
    // Validate query parameters
    const result = searchQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid search parameters', details: result.error });
    }
    
    const { query, genre, genreId, artistId, artistName, sort, page, limit } = result.data;
    const offset = (page - 1) * limit;
    
    // Base query - join events with artists and venues
    let eventsQuery = db
      .select({
        id: events.id,
        date: events.date,
        ticketUrl: events.ticketUrl,  // Updated field name from schema
        artistId: artists.id,
        artistName: artists.name,
        artistImage: artists.imageUrl,
        venueId: venues.id,
        venueName: venues.name,
        venueCity: venues.city,
        venueRegion: venues.region,
      })
      .from(events)
      .innerJoin(artists, eq(events.artistId, artists.id))
      .innerJoin(venues, eq(events.venueId, venues.id));
      
    // Apply filters
    const conditions = [];
    
    // Search by query string
    if (query && query.trim() !== '') {
      conditions.push(
        or(
          // Search by artist name
          ilike(artists.name, `%${query}%`),
          // Search by venue name
          ilike(venues.name, `%${query}%`)
        )
      );
    }
    
    // Filter by artist ID if provided
    if (artistId) {
      conditions.push(eq(artists.id, artistId));
    }
    
    // Filter by artist name if provided
    if (artistName && artistName.trim() !== '') {
      conditions.push(ilike(artists.name, `%${artistName}%`));
    }
    
    // Apply the where conditions if any exist
    if (conditions.length > 0) {
      eventsQuery = eventsQuery.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)
      );
    }
    
    // Execute the query
    const eventsData = await eventsQuery;
      
    // Format the results
    let formattedEvents = eventsData.map(event => ({
      id: event.id,
      date: event.date,
      ticketUrl: event.ticketUrl,
      artist: {
        id: event.artistId,
        name: event.artistName,
        imageUrl: event.artistImage
      },
      venue: {
        id: event.venueId,
        name: event.venueName,
        city: event.venueCity,
        region: event.venueRegion
      }
    }));
    
    // Apply genre filter if specified
    if (genre || genreId) {
      // Get genre ID if name was provided
      let targetGenreId = genreId;
      
      if (genre && !genreId) {
        // Use genre utility function to find genre by name or slug
        const foundGenre = genre.includes('-') 
          ? await getGenreBySlug(genre) 
          : await getGenreByName(genre);
        
        if (foundGenre) {
          targetGenreId = foundGenre.id;
        }
      }
      
      if (targetGenreId) {
        // Use the utility function to get all artists with this genre
        const artistsWithGenre = await getArtistsByGenre(targetGenreId);
        const artistIds = artistsWithGenre.map(a => a.id);
        
        if (artistIds.length > 0) {
          // Filter the events with artists in the genre
          const filteredEvents = formattedEvents.filter(event => 
            artistIds.includes(event.artist.id)
          );
          
          formattedEvents = filteredEvents;
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
      formattedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sort === 'name') {
      formattedEvents.sort((a, b) => a.artist.name.localeCompare(b.artist.name));
    } else {
      // Default relevance sort - newest events first
      formattedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    // Apply pagination
    const paginatedEvents = formattedEvents.slice(offset, offset + limit);
    
    // Get total count for pagination
    const totalCount = formattedEvents.length;
    
    return res.json({
      total: totalCount,
      page,
      limit,
      events: paginatedEvents
    });
  } catch (error) {
    console.error('Error searching events:', error);
    return res.status(500).json({ error: 'Server error during search' });
  }
});

// Artist search endpoint
router.get('/search/artists', async (req, res) => {
  try {
    // Validate query parameters
    console.log('Artist search query params:', req.query);
    const result = searchQuerySchema.safeParse(req.query);
    if (!result.success) {
      console.error('Validation error details:', result.error.format());
      return res.status(400).json({ error: 'Invalid search parameters', details: result.error.format() });
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
      .from(artists);
      
    // Only apply query filter if query is not empty
    if (query && query.trim() !== '') {
      artistsQuery = artistsQuery.where(ilike(artists.name, `%${query}%`));
    }
    
    // Apply genre filter if specified
    if (genreId) {
      // Use utility function to get artists with this genre
      const artistsWithGenre = await getArtistsByGenre(genreId);
      const artistIds = artistsWithGenre.map(a => a.id);
      
      if (artistIds.length > 0) {
        // Filter for artists with the specified genre
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
    } else if (genre) {
      // Look up genreId from name or slug using utility functions
      const genreObj = genre.includes('-') 
        ? await getGenreBySlug(genre) 
        : await getGenreByName(genre);
      
      if (genreObj) {
        // Use utility function to get artists with this genre
        const artistsWithGenre = await getArtistsByGenre(genreObj.id);
        const artistIds = artistsWithGenre.map(a => a.id);
        
        if (artistIds.length > 0) {
          // Execute filtered query
          let filteredArtists = await db
            .select({
              id: artists.id,
              name: artists.name,
              imageUrl: artists.imageUrl,
              popularity: artists.popularity,
              description: artists.description,
            })
            .from(artists)
            .where(inArray(artists.id, artistIds));
            
          // Only apply query filter if query is not empty
          if (query && query.trim() !== '') {
            filteredArtists = filteredArtists.filter(artist => 
              artist.name.toLowerCase().includes(query.toLowerCase())
            );
          }
          
          // For each artist, get their genres using utility function
          const artistsWithGenres = await Promise.all(
            filteredArtists.map(async (artist) => {
              const artistGenres = await getArtistGenres(artist.id);
              
              return {
                ...artist,
                genres: artistGenres
              };
            })
          );
          
          // Apply sorting
          if (sort === 'name') {
            artistsWithGenres.sort((a, b) => a.name.localeCompare(b.name));
          } else {
            // Default sort by popularity
            artistsWithGenres.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          }
          
          // Apply pagination
          const paginatedArtists = artistsWithGenres.slice(offset, offset + limit);
          
          return res.json({
            total: artistsWithGenres.length,
            page,
            limit,
            artists: paginatedArtists
          });
        } else {
          // No artists with this genre, return empty result
          return res.json({
            total: 0,
            page,
            limit,
            artists: []
          });
        }
      } else {
        // Genre not found, return empty result
        return res.json({
          total: 0,
          page,
          limit,
          artists: []
        });
      }
    }
    
    // Execute main query if not filtered by genre above
    const artistResults = await artistsQuery;
    
    // For each artist, get their genres using the utility function
    const artistsWithGenres = await Promise.all(
      artistResults.map(async (artist) => {
        // Use the utility function to get all genres for this artist
        const artistGenres = await getArtistGenres(artist.id);
        
        // Return artist with genres
        return {
          ...artist,
          genres: artistGenres
        };
      })
    );
    
    // Apply sorting directly to results
    if (sort === 'name') {
      artistsWithGenres.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Default sort by popularity
      artistsWithGenres.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }
    
    // Apply pagination
    const paginatedArtists = artistsWithGenres.slice(offset, offset + limit);
    
    return res.json({
      total: artistsWithGenres.length,
      page,
      limit,
      artists: paginatedArtists
    });
  } catch (error) {
    console.error('Error searching artists:', error);
    return res.status(500).json({ error: 'Server error during search' });
  }
});

// Get all genres with hierarchical structure
router.get('/search/genres', async (req, res) => {
  try {
    // Get all root (parent) genres
    const rootGenres = await db
      .select({
        id: genres.id,
        name: genres.name,
        slug: genres.slug,
        parentId: genres.parentId
      })
      .from(genres)
      .where(sql`${genres.parentId} IS NULL`)
      .orderBy(asc(genres.name));
    
    // Enhance each root genre with its children
    const genresWithSubgenres = await Promise.all(
      rootGenres.map(async (rootGenre) => {
        // Use utility function to get all subgenres for this parent genre
        const allRelatedGenres = await getGenreWithChildren(rootGenre.id);
        
        // Filter out the parent genre from the results
        const subgenres = allRelatedGenres.filter(genre => genre.id !== rootGenre.id);
        
        return {
          ...rootGenre,
          subgenres
        };
      })
    );
    
    return res.json({
      genres: genresWithSubgenres
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    return res.status(500).json({ error: 'Server error fetching genres' });
  }
});

export default router;