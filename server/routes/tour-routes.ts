import { Router } from 'express';
import { db } from '../db';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { calculateDistance, estimateTravelTime, optimizeTourRoute } from '../../shared/utils/tour-optimizer';
import { 
  tours, 
  tourVenues, 
  tourGaps, 
  tourGapSuggestions, 
  venues, 
  artists, 
  artistTourPreferences,
  venueTourPreferences,
  insertTourSchema,
  insertTourVenueSchema,
  insertTourGapSchema,
  insertTourGapSuggestionSchema,
  insertArtistTourPreferencesSchema,
  insertVenueTourPreferencesSchema
} from '../../shared/schema';
import { and, eq, gte, lte, desc, or, sql } from 'drizzle-orm';

const router = Router();

/**
 * Get all tours
 */
router.get('/tours', async (req, res) => {
  try {
    // Get query parameters for filtering
    const { artistId, status, startDate, endDate } = req.query;
    
    // Build query filters
    let filters = [];
    
    if (artistId) {
      filters.push(eq(tours.artistId, Number(artistId)));
    }
    
    if (status) {
      filters.push(eq(tours.status, String(status)));
    }
    
    if (startDate) {
      // Convert to SQL date format
      const startDateStr = new Date(String(startDate)).toISOString().split('T')[0];
      filters.push(sql`${tours.startDate} >= ${startDateStr}`);
    }
    
    if (endDate) {
      // Convert to SQL date format
      const endDateStr = new Date(String(endDate)).toISOString().split('T')[0];
      filters.push(sql`${tours.endDate} <= ${endDateStr}`);
    }
    
    // Execute query with filters
    const result = filters.length > 0
      ? await db
          .select()
          .from(tours)
          .where(and(...filters))
          .orderBy(desc(tours.startDate))
      : await db
          .select()
          .from(tours)
          .orderBy(desc(tours.startDate));
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching tours:", error);
    res.status(500).json({ error: "Failed to fetch tours" });
  }
});

/**
 * Get a single tour by ID with venues and gaps
 */
router.get('/tours/:id', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Get the tour
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    const tour = tourResult[0];
    
    // Get artist details
    const artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.id, tour.artistId))
      .limit(1);
    
    const artist = artistResult.length ? artistResult[0] : null;
    
    // Get tour venues
    const tourVenuesResult = await db
      .select({
        tourVenue: tourVenues,
        venue: venues
      })
      .from(tourVenues)
      .leftJoin(venues, eq(tourVenues.venueId, venues.id))
      .where(eq(tourVenues.tourId, tourId))
      .orderBy(tourVenues.sequence);
    
    // Get tour gaps
    const tourGapsResult = await db
      .select({
        gap: tourGaps,
        previousVenue: venues.name,
        nextVenue: venues.name
      })
      .from(tourGaps)
      .leftJoin(venues, eq(tourGaps.previousVenueId, venues.id))
      .leftJoin(venues, eq(tourGaps.nextVenueId, venues.id))
      .where(eq(tourGaps.tourId, tourId));
    
    // Get gap suggestions
    const gapSuggestionsPromises = tourGapsResult.map(async (gap) => {
      const suggestions = await db
        .select({
          suggestion: tourGapSuggestions,
          venue: venues
        })
        .from(tourGapSuggestions)
        .leftJoin(venues, eq(tourGapSuggestions.venueId, venues.id))
        .where(eq(tourGapSuggestions.gapId, gap.gap.id));
      
      return {
        ...gap,
        suggestions
      };
    });
    
    const gapsWithSuggestions = await Promise.all(gapSuggestionsPromises);
    
    // Combine all data
    const result = {
      ...tour,
      artist,
      venues: tourVenuesResult,
      gaps: gapsWithSuggestions
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching tour details:", error);
    res.status(500).json({ error: "Failed to fetch tour details" });
  }
});

/**
 * Create a new tour
 */
router.post('/tours', async (req, res) => {
  try {
    // Validate request body
    const validatedData = insertTourSchema.parse(req.body);
    
    // Create the tour
    const result = await db.insert(tours).values({
      ...validatedData,
      updatedAt: new Date()
    }).returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error creating tour:", error);
    res.status(500).json({ error: "Failed to create tour" });
  }
});

/**
 * Add a venue to a tour
 */
router.post('/tours/:tourId/venues', async (req, res) => {
  try {
    const tourId = Number(req.params.tourId);
    
    // Validate tour exists
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    // Validate request body
    const validatedData = insertTourVenueSchema.parse({
      ...req.body,
      tourId
    });
    
    // Calculate travel distance from previous venue if sequence is provided
    if (validatedData.sequence !== undefined) {
      const previousVenueResult = await db
        .select({
          tourVenue: tourVenues,
          venue: venues
        })
        .from(tourVenues)
        .leftJoin(venues, eq(tourVenues.venueId, venues.id))
        .where(and(
          eq(tourVenues.tourId, tourId),
          eq(tourVenues.sequence, validatedData.sequence - 1)
        ))
        .limit(1);
      
      const currentVenueResult = await db
        .select()
        .from(venues)
        .where(eq(venues.id, validatedData.venueId))
        .limit(1);
      
      if (previousVenueResult.length && currentVenueResult.length) {
        const prevVenue = previousVenueResult[0].venue;
        const currVenue = currentVenueResult[0];
        
        if (prevVenue.latitude && prevVenue.longitude && currVenue.latitude && currVenue.longitude) {
          const distance = calculateDistance(
            Number(prevVenue.latitude),
            Number(prevVenue.longitude),
            Number(currVenue.latitude),
            Number(currVenue.longitude)
          );
          
          validatedData.travelDistanceFromPrevious = distance;
          validatedData.travelTimeFromPrevious = estimateTravelTime(distance);
        }
      }
    }
    
    // Add the venue to the tour
    const result = await db
      .insert(tourVenues)
      .values(validatedData)
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error adding venue to tour:", error);
    res.status(500).json({ error: "Failed to add venue to tour" });
  }
});

/**
 * Update tour status
 */
router.patch('/tours/:id', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Validate tour exists
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    // Validate request body
    const validatedData = z.object({
      name: z.string().optional(),
      status: z.string().optional(),
      description: z.string().optional(),
      totalBudget: z.number().optional(),
      startDate: z.string().transform(s => new Date(s)).optional(),
      endDate: z.string().transform(s => new Date(s)).optional(),
    }).parse(req.body);
    
    // Convert date objects to strings for database
    const startDateStr = validatedData.startDate ? 
      validatedData.startDate.toISOString().split('T')[0] : undefined;
    const endDateStr = validatedData.endDate ? 
      validatedData.endDate.toISOString().split('T')[0] : undefined;
      
    // Update the tour with processed data
    const result = await db
      .update(tours)
      .set({
        name: validatedData.name,
        status: validatedData.status,
        description: validatedData.description,
        totalBudget: validatedData.totalBudget,
        startDate: startDateStr,
        endDate: endDateStr,
        updatedAt: new Date()
      })
      .where(eq(tours.id, tourId))
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error updating tour:", error);
    res.status(500).json({ error: "Failed to update tour" });
  }
});

/**
 * Optimize a tour route
 */
router.post('/tours/:id/optimize', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Validate tour exists
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    const tour = tourResult[0];
    
    // Get existing tour venues
    const tourVenuesResult = await db
      .select({
        tourVenue: tourVenues,
        venue: venues
      })
      .from(tourVenues)
      .leftJoin(venues, eq(tourVenues.venueId, venues.id))
      .where(eq(tourVenues.tourId, tourId));
    
    // Get artist tour preferences for optimization constraints
    const preferencesResult = await db
      .select()
      .from(artistTourPreferences)
      .where(eq(artistTourPreferences.artistId, tour.artistId))
      .limit(1);
    
    const preferences = preferencesResult.length ? preferencesResult[0] : null;
    
    // Create optimization constraints from preferences
    const constraints = {
      maxTravelDistancePerDay: preferences?.maxTravelDistancePerDay,
      minDaysBetweenShows: preferences?.minDaysBetweenShows,
      maxDaysBetweenShows: preferences?.maxDaysBetweenShows,
      avoidDates: preferences?.avoidDates as string[] | undefined,
      requiredDaysOff: preferences?.requiredDayOff as string[] | undefined,
      preferredRegions: preferences?.preferredRegions as string[] | undefined
    };
    
    // Extract fixed points from existing tour venues with confirmed dates
    const fixedPoints = tourVenuesResult
      .filter(tv => tv.tourVenue.status === 'confirmed' && tv.tourVenue.date !== null)
      .map(tv => ({
        id: tv.venue.id,
        latitude: Number(tv.venue.latitude),
        longitude: Number(tv.venue.longitude),
        date: tv.tourVenue.date ? new Date(tv.tourVenue.date) : null,
        isFixed: true
      }));
    
    // We need at least 2 fixed points
    if (fixedPoints.length < 2) {
      return res.status(400).json({ 
        error: "Tour optimization requires at least 2 confirmed venues with dates" 
      });
    }
    
    // Get potential venues for filling gaps
    // For now, we'll use all venues that aren't already part of the tour
    const existingVenueIds = tourVenuesResult.map(tv => tv.venue.id);
    
    const potentialVenuesResult = await db
      .select()
      .from(venues)
      .where(
        and(
          sql`${venues.id} NOT IN (${existingVenueIds.join(',')})`,
          sql`${venues.latitude} IS NOT NULL`,
          sql`${venues.longitude} IS NOT NULL`
        )
      );
    
    // Run the optimization algorithm
    const optimizedRoute = optimizeTourRoute(
      fixedPoints,
      potentialVenuesResult,
      constraints
    );
    
    // Update the tour with optimization results
    await db
      .update(tours)
      .set({
        estimatedTravelDistance: optimizedRoute.totalDistance,
        estimatedTravelTime: optimizedRoute.totalTravelTime,
        optimizationScore: optimizedRoute.optimizationScore,
        updatedAt: new Date()
      })
      .where(eq(tours.id, tourId));
    
    // Return the optimized route
    res.json({
      tourId,
      optimizationScore: optimizedRoute.optimizationScore,
      totalDistance: optimizedRoute.totalDistance,
      totalTravelTime: optimizedRoute.totalTravelTime,
      fixedPoints,
      potentialFillVenues: optimizedRoute.tourVenues,
      gaps: optimizedRoute.gaps
    });
  } catch (error) {
    console.error("Error optimizing tour:", error);
    res.status(500).json({ error: "Failed to optimize tour" });
  }
});

/**
 * Get artist tour preferences
 */
router.get('/artists/:id/tour-preferences', async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    
    const result = await db
      .select()
      .from(artistTourPreferences)
      .where(eq(artistTourPreferences.artistId, artistId))
      .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Artist tour preferences not found" });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching artist tour preferences:", error);
    res.status(500).json({ error: "Failed to fetch artist tour preferences" });
  }
});

/**
 * Set artist tour preferences
 */
router.post('/artists/:id/tour-preferences', async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    
    // Validate artist exists
    const artistResult = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    
    if (!artistResult.length) {
      return res.status(404).json({ error: "Artist not found" });
    }
    
    // Check if preferences already exist
    const existingResult = await db
      .select()
      .from(artistTourPreferences)
      .where(eq(artistTourPreferences.artistId, artistId))
      .limit(1);
    
    // Validate request body
    const validatedData = insertArtistTourPreferencesSchema.parse({
      ...req.body,
      artistId
    });
    
    let result;
    
    if (existingResult.length) {
      // Update existing preferences
      result = await db
        .update(artistTourPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(artistTourPreferences.artistId, artistId))
        .returning();
    } else {
      // Create new preferences
      result = await db
        .insert(artistTourPreferences)
        .values(validatedData)
        .returning();
    }
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error setting artist tour preferences:", error);
    res.status(500).json({ error: "Failed to set artist tour preferences" });
  }
});

/**
 * Get venue tour preferences
 */
router.get('/venues/:id/tour-preferences', async (req, res) => {
  try {
    const venueId = Number(req.params.id);
    
    const result = await db
      .select()
      .from(venueTourPreferences)
      .where(eq(venueTourPreferences.venueId, venueId))
      .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Venue tour preferences not found" });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching venue tour preferences:", error);
    res.status(500).json({ error: "Failed to fetch venue tour preferences" });
  }
});

/**
 * Set venue tour preferences
 */
router.post('/venues/:id/tour-preferences', async (req, res) => {
  try {
    const venueId = Number(req.params.id);
    
    // Validate venue exists
    const venueResult = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    
    if (!venueResult.length) {
      return res.status(404).json({ error: "Venue not found" });
    }
    
    // Check if preferences already exist
    const existingResult = await db
      .select()
      .from(venueTourPreferences)
      .where(eq(venueTourPreferences.venueId, venueId))
      .limit(1);
    
    // Validate request body
    const validatedData = insertVenueTourPreferencesSchema.parse({
      ...req.body,
      venueId
    });
    
    let result;
    
    if (existingResult.length) {
      // Update existing preferences
      result = await db
        .update(venueTourPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(venueTourPreferences.venueId, venueId))
        .returning();
    } else {
      // Create new preferences
      result = await db
        .insert(venueTourPreferences)
        .values(validatedData)
        .returning();
    }
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error setting venue tour preferences:", error);
    res.status(500).json({ error: "Failed to set venue tour preferences" });
  }
});

/**
 * Get tour statistics
 */
router.get('/artists/:id/tour-stats', async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    
    // Get all tours for the artist
    const toursResult = await db
      .select()
      .from(tours)
      .where(eq(tours.artistId, artistId));
    
    if (!toursResult.length) {
      return res.json({
        totalTours: 0,
        totalDistance: 0,
        totalVenues: 0,
        upcomingTours: 0,
        averageOptimizationScore: 0
      });
    }
    
    // Calculate statistics
    const tourIds = toursResult.map(tour => tour.id);
    
    // Get total venues
    const venuesResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(tourVenues)
      .where(sql`${tourVenues.tourId} IN (${tourIds.join(',')})`);
    
    const totalVenues = venuesResult[0]?.count || 0;
    
    // Calculate other statistics
    const today = new Date();
    
    const stats = {
      totalTours: toursResult.length,
      totalDistance: toursResult.reduce((sum, tour) => sum + (tour.estimatedTravelDistance || 0), 0),
      totalVenues,
      upcomingTours: toursResult.filter(tour => new Date(tour.startDate) > today).length,
      averageOptimizationScore: toursResult
        .filter(tour => tour.optimizationScore !== null)
        .reduce((sum, tour) => sum + (tour.optimizationScore || 0), 0) / 
        toursResult.filter(tour => tour.optimizationScore !== null).length || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching tour statistics:", error);
    res.status(500).json({ error: "Failed to fetch tour statistics" });
  }
});

export default router;