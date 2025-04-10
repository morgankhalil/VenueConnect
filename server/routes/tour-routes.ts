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
import { and, eq, gte, lte, desc, or, sql, notInArray, isNotNull } from 'drizzle-orm';

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
    
    // Since we can't join the same table twice with the same alias,
    // we'll need to perform separate queries for gaps
    const tourGapsData = await db
      .select()
      .from(tourGaps)
      .where(eq(tourGaps.tourId, tourId));
    
    // Now we process the gaps with separate queries for previous/next venues
    const gapsWithVenues = await Promise.all(
      tourGapsData.map(async (gap) => {
        // Get previous venue info
        let prevVenue = null;
        if (gap.previousVenueId) {
          const prevVenueResult = await db
            .select()
            .from(venues)
            .where(eq(venues.id, gap.previousVenueId))
            .limit(1);
          
          if (prevVenueResult.length) {
            prevVenue = prevVenueResult[0];
          }
        }
        
        // Get next venue info
        let nextVenue = null;
        if (gap.nextVenueId) {
          const nextVenueResult = await db
            .select()
            .from(venues)
            .where(eq(venues.id, gap.nextVenueId))
            .limit(1);
          
          if (nextVenueResult.length) {
            nextVenue = nextVenueResult[0];
          }
        }
        
        // Get suggestions for this gap
        const suggestionsResult = await db
          .select({
            suggestion: tourGapSuggestions,
            venue: venues
          })
          .from(tourGapSuggestions)
          .leftJoin(venues, eq(tourGapSuggestions.venueId, venues.id))
          .where(eq(tourGapSuggestions.gapId, gap.id));
        
        return {
          gap,
          previousVenue: prevVenue,
          nextVenue: nextVenue,
          suggestions: suggestionsResult
        };
      })
    );
    
    // Combine all data
    const result = {
      ...tour,
      artist,
      venues: tourVenuesResult,
      gaps: gapsWithVenues
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
 * Update a tour venue
 */
router.patch('/tours/:tourId/venues/:venueId', async (req, res) => {
  try {
    const tourId = Number(req.params.tourId);
    const venueId = Number(req.params.venueId);
    
    // Validate tour exists
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    // Validate tour venue exists
    const tourVenueResult = await db
      .select()
      .from(tourVenues)
      .where(and(
        eq(tourVenues.id, venueId),
        eq(tourVenues.tourId, tourId)
      ))
      .limit(1);
    
    if (!tourVenueResult.length) {
      return res.status(404).json({ error: "Tour venue not found" });
    }
    
    // Validate request body
    const validatedData = z.object({
      status: z.string().optional(),
      date: z.string().transform(s => new Date(s)).optional(),
      sequence: z.number().optional(),
      notes: z.string().optional(),
    }).parse(req.body);
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.date !== undefined) updateData.date = validatedData.date;
    if (validatedData.sequence !== undefined) updateData.sequence = validatedData.sequence;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    
    // If sequence is updated, we may need to recalculate travel distances
    if (validatedData.sequence !== undefined && validatedData.sequence > 1) {
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
      
      const currentVenueData = await db
        .select({
          tourVenue: tourVenues,
          venue: venues
        })
        .from(tourVenues)
        .leftJoin(venues, eq(tourVenues.venueId, venues.id))
        .where(eq(tourVenues.id, venueId))
        .limit(1);
      
      if (previousVenueResult.length && currentVenueData.length) {
        const prevVenue = previousVenueResult[0].venue;
        const currVenue = currentVenueData[0].venue;
        
        if (prevVenue && currVenue && 
            prevVenue.latitude && prevVenue.longitude && 
            currVenue.latitude && currVenue.longitude) {
          const distance = calculateDistance(
            Number(prevVenue.latitude),
            Number(prevVenue.longitude),
            Number(currVenue.latitude),
            Number(currVenue.longitude)
          );
          
          updateData.travelDistanceFromPrevious = distance;
          updateData.travelTimeFromPrevious = estimateTravelTime(distance);
        }
      }
    }
    
    // Update the tour venue
    const result = await db
      .update(tourVenues)
      .set(updateData)
      .where(eq(tourVenues.id, venueId))
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error updating tour venue:", error);
    res.status(500).json({ error: "Failed to update tour venue" });
  }
});

/**
 * Optimize a tour route
 */
router.post('/tours/:id/optimize', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    const wizardPreferences = req.body?.preferences || null;
    
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
    
    // Create optimization constraints from preferences or wizard preferences
    const constraints = wizardPreferences ? {
      // Use wizard preferences if available, with fallbacks to database preferences
      optimizationGoal: wizardPreferences.optimizationGoal || 'balance',
      maxTravelDistancePerDay: wizardPreferences.maxTravelDistancePerDay || preferences?.maxTravelDistancePerDay,
      minDaysBetweenShows: wizardPreferences.minDaysBetweenShows || preferences?.minDaysBetweenShows,
      maxDaysBetweenShows: wizardPreferences.maxDaysBetweenShows || preferences?.maxDaysBetweenShows,
      avoidDates: wizardPreferences.avoidCities || preferences?.avoidDates as string[] | undefined,
      requiredDaysOff: wizardPreferences.requiredDaysOff || preferences?.requiredDayOff as string[] | undefined,
      preferredRegions: wizardPreferences.preferredRegions || preferences?.preferredRegions as string[] | undefined,
      focusOnArtistFanbase: wizardPreferences.focusOnArtistFanbase || false,
      prioritizeVenueSize: wizardPreferences.prioritizeVenueSize || 'any'
    } : {
      // Fall back to stored preferences
      maxTravelDistancePerDay: preferences?.maxTravelDistancePerDay ?? undefined,
      minDaysBetweenShows: preferences?.minDaysBetweenShows ?? undefined,
      maxDaysBetweenShows: preferences?.maxDaysBetweenShows ?? undefined,
      avoidDates: preferences?.avoidDates as string[] | undefined,
      requiredDaysOff: preferences?.requiredDayOff as string[] | undefined,
      preferredRegions: preferences?.preferredRegions as string[] | undefined
    };
    
    // Extract fixed and semi-fixed points from existing tour venues with dates
    // Include confirmed venues as fixed points (these won't move)
    const confirmedPoints = tourVenuesResult
      .filter(tv => tv.tourVenue.status === 'confirmed' && tv.tourVenue.date !== null)
      .map(tv => ({
        id: tv.venue.id,
        latitude: Number(tv.venue.latitude),
        longitude: Number(tv.venue.longitude),
        date: tv.tourVenue.date ? new Date(tv.tourVenue.date) : null,
        isFixed: true,
        status: 'confirmed' as string
      }));
      
    // Include hold and potential venues as semi-fixed points that can be moved
    const plannedPoints = tourVenuesResult
      .filter(tv => 
        (tv.tourVenue.status === 'hold' || tv.tourVenue.status === 'potential') && 
        tv.tourVenue.date !== null
      )
      .map(tv => ({
        id: tv.venue.id,
        latitude: Number(tv.venue.latitude),
        longitude: Number(tv.venue.longitude),
        date: tv.tourVenue.date ? new Date(tv.tourVenue.date) : null,
        isFixed: false,
        status: tv.tourVenue.status || 'potential'
      }));
    
    // Combine all points, with at least 2 points total
    const allTourPoints = [...confirmedPoints, ...plannedPoints];
    
    // We need at least 2 points with dates for optimization
    if (allTourPoints.length < 2) {
      return res.status(400).json({ 
        error: "Tour optimization requires at least 2 venues with dates (confirmed, hold, or potential)" 
      });
    }
    
    // Get potential venues with coordinates
    // We'll get all venues with coordinates and then filter out the existing ones in JavaScript
    // This avoids SQL syntax issues with the NOT IN clause
    const allVenuesWithCoordinates = await db
      .select()
      .from(venues)
      .where(
        and(
          sql`${venues.latitude} IS NOT NULL`,
          sql`${venues.longitude} IS NOT NULL`
        )
      );
    
    // Extract venue IDs that are part of this tour
    const existingVenueIds = new Set(
      tourVenuesResult
        .filter(tv => tv.venue && tv.venue.id)
        .map(tv => tv.venue.id)
    );
    
    // Filter out venues that are already part of the tour
    const potentialVenuesResult = allVenuesWithCoordinates.filter(
      venue => !existingVenueIds.has(venue.id)
    );
    
    // Run the optimization algorithm
    const optimizedRoute = optimizeTourRoute(
      allTourPoints,
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
      fixedPoints: allTourPoints,
      potentialFillVenues: optimizedRoute.tourVenues,
      gaps: optimizedRoute.gaps
    });
  } catch (error) {
    console.error("Error optimizing tour:", error);
    res.status(500).json({ error: "Failed to optimize tour" });
  }
});

/**
 * Apply optimized tour route
 */
router.post('/tours/:id/apply-optimization', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    const { optimizationData } = req.body;
    
    if (!optimizationData) {
      return res.status(400).json({ error: "Optimization data is required" });
    }
    
    // Verify the tour exists
    const tourResult = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    if (!tourResult.length) {
      return res.status(404).json({ error: "Tour not found" });
    }
    
    // Get existing tour venues with venue data
    const existingTourVenues = await db
      .select({
        tourVenue: tourVenues,
        venue: venues
      })
      .from(tourVenues)
      .leftJoin(venues, eq(tourVenues.venueId, venues.id))
      .where(eq(tourVenues.tourId, tourId));
    
    // Create a map of confirmed venues (these will not be modified)
    const confirmedVenues = new Set(
      existingTourVenues
        .filter(tv => tv.tourVenue.status === 'confirmed')
        .map(tv => tv.tourVenue.venueId)
    );
    
    // First, create a sorted and combined list of all venues
    // Sort optimization data by date to ensure proper sequencing
    const sortedVenues = [...(optimizationData.potentialFillVenues || [])].sort((a, b) => {
      if (!a.suggestedDate || !b.suggestedDate) return 0;
      return new Date(a.suggestedDate).getTime() - new Date(b.suggestedDate).getTime();
    });
    
    // Step 1: Reset all sequences first to avoid conflicts
    // This ensures we have a clean slate for sequence ordering
    await db
      .update(tourVenues)
      .set({
        sequence: 0,
        updatedAt: new Date()
      })
      .where(and(
        eq(tourVenues.tourId, tourId),
        sql`${tourVenues.status} != 'confirmed'` // Don't touch confirmed venues
      ));
      
    console.log('Applying optimized tour with', sortedVenues.length, 'venues');
    
    // Step 2: Process all optimized venues in sequence order
    const updatedVenueIds = new Set();
    
    // Update or create tour venues from optimized data, preserving the sequence from the sorted list
    for (let i = 0; i < sortedVenues.length; i++) {
      const venue = sortedVenues[i];
      if (!venue.venue || !venue.venue.id) continue;
      
      const venueId = venue.venue.id;
      updatedVenueIds.add(venueId);
      
      // Calculate sequence based on position in the sorted array (1-based)
      const sequenceNum = i + 1;
      
      const existingTourVenue = existingTourVenues.find(tv => tv.tourVenue.venueId === venueId);
      
      if (existingTourVenue) {
        // Update existing tour venue if it's not confirmed
        if (existingTourVenue.tourVenue.status !== 'confirmed') {
          console.log(`Updating venue ${venueId} with sequence ${sequenceNum}`);
          await db
            .update(tourVenues)
            .set({
              date: venue.suggestedDate ? new Date(venue.suggestedDate) : existingTourVenue.tourVenue.date,
              sequence: sequenceNum, // Use the calculated sequence
              updatedAt: new Date()
            })
            .where(and(
              eq(tourVenues.tourId, tourId),
              eq(tourVenues.venueId, venueId)
            ));
        }
      } else if (venue.gapFilling && venue.suggestedDate) {
        // Add new venue if it's a gap filler
        console.log(`Adding new venue ${venueId} with sequence ${sequenceNum}`);
        await db
          .insert(tourVenues)
          .values({
            tourId,
            venueId,
            status: 'potential',
            date: new Date(venue.suggestedDate),
            sequence: sequenceNum, // Use the calculated sequence
            notes: 'Added via tour optimization',
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    }
    
    // Step 3: For venues not included in optimization, set high sequence numbers
    // Use a base high number plus increments to preserve some order
    let highSequence = 1000;
    
    for (const tv of existingTourVenues) {
      const venueId = tv.tourVenue.venueId;
      
      // Skip venues we've already processed or that are confirmed
      if (updatedVenueIds.has(venueId) || confirmedVenues.has(venueId)) {
        continue;
      }
      
      console.log(`Setting venue ${venueId} to high sequence ${highSequence}`);
      
      // Update non-confirmed venues that weren't in the optimization
      await db
        .update(tourVenues)
        .set({
          sequence: highSequence++, // Use incremented sequence to preserve some ordering
          updatedAt: new Date()
        })
        .where(and(
          eq(tourVenues.tourId, tourId),
          eq(tourVenues.venueId, venueId)
        ));
    }
    
    // Update tour with optimization metrics
    await db
      .update(tours)
      .set({
        estimatedTravelDistance: optimizationData.totalDistance,
        estimatedTravelTime: optimizationData.totalTravelTime,
        optimizationScore: optimizationData.optimizationScore,
        updatedAt: new Date()
      })
      .where(eq(tours.id, tourId));
    
    // Return success response with tour data
    const updatedTour = await db
      .select()
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);
    
    res.json(updatedTour[0]);
  } catch (error) {
    console.error("Error applying tour optimization:", error);
    res.status(500).json({ error: "Failed to apply tour optimization" });
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

/**
 * Create a demo tour for optimization testing
 */
router.post('/tours/create-demo', async (req, res) => {
  try {
    // Find an artist to use for the tour
    const artistResult = await db
      .select()
      .from(artists)
      .limit(1);
    
    if (!artistResult.length) {
      return res.status(404).json({ error: "No artists found in database" });
    }
    
    const artist = artistResult[0];
    
    // Get existing venues with coordinates
    const venueResults = await db
      .select()
      .from(venues)
      .where(
        isNotNull(venues.latitude)
      )
      .limit(10);
    
    if (venueResults.length < 5) {
      return res.status(404).json({ error: "Not enough venues with coordinates in database" });
    }
    
    // Create a new tour
    const tourName = `Optimization Demo Tour ${new Date().toISOString().split('T')[0]}`;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 60); // Start 60 days from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day tour
    
    const tourResult = await db
      .insert(tours)
      .values({
        name: tourName,
        artistId: artist.id,
        status: 'planning',
        description: 'A demo tour created to showcase the tour optimization features',
        startDate,
        endDate,
        totalBudget: 200000,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!tourResult.length) {
      return res.status(500).json({ error: "Failed to create tour" });
    }
    
    const tour = tourResult[0];
    
    // Create two fixed (confirmed) venues at the start and end
    // We'll pick venues that are geographically distant to make optimization interesting
    const firstVenue = venueResults[0];
    const lastVenue = venueResults[venueResults.length - 1];
    
    // First venue - beginning of tour
    const firstVenueDate = new Date(startDate);
    firstVenueDate.setDate(firstVenueDate.getDate() + 3); // 3 days after start
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: firstVenue.id,
        status: 'confirmed', // This is fixed and won't be moved by optimizer
        date: firstVenueDate,
        sequence: 1,
        notes: 'Opening venue for the tour',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    // Last venue - end of tour
    const lastVenueDate = new Date(startDate);
    lastVenueDate.setDate(lastVenueDate.getDate() + 27); // 27 days after start (3 days before end)
    
    await db
      .insert(tourVenues)
      .values({
        tourId: tour.id,
        venueId: lastVenue.id,
        status: 'confirmed', // This is fixed and won't be moved by optimizer
        date: lastVenueDate,
        sequence: 10, // Higher sequence number
        notes: 'Closing venue for the tour',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    // Add a couple of proposed venues in the middle without specific dates
    // These will be rescheduled by the optimizer
    for (let i = 1; i <= 3; i++) {
      const venue = venueResults[i];
      
      await db
        .insert(tourVenues)
        .values({
          tourId: tour.id,
          venueId: venue.id,
          status: 'potential', // Potential status allows the optimizer to suggest dates
          sequence: i + 1, // Sequence between first and last
          notes: 'Proposed venue for optimization',
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
    
    // Return the created tour
    res.status(201).json({ 
      id: tour.id,
      message: "Demo tour created successfully",
      redirectUrl: `/tours/${tour.id}/optimize`
    });
    
  } catch (error) {
    console.error("Error creating demo tour:", error);
    res.status(500).json({ error: "Failed to create demo tour" });
  }
});

export default router;