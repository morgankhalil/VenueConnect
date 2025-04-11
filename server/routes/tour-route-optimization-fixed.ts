import { Router } from 'express';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { calculateDistance, estimateTravelTime, optimizeTourRoute } from '../../shared/utils/tour-optimizer';
import { 
  tours, 
  tourVenues, 
  tourGaps, 
  venues,
  tourRoutes,
  insertTourRouteSchema,
  TourRoute
} from '../../shared/schema';

const router = Router();

/**
 * Store a route between two venues as part of a tour
 */
router.post('/tours/:id/routes', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Validate request body
    const validatedData = insertTourRouteSchema.parse(req.body);
    
    // Create the tour route
    const result = await db.insert(tourRoutes).values({
      ...validatedData,
      tourId: tourId,
    }).returning();
    
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error creating tour route:", error);
    res.status(500).json({ error: "Failed to create tour route" });
  }
});

/**
 * Get all routes for a tour
 */
router.get('/tours/:id/routes', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Get the tour routes with start and end venues
    const routesResult = await db
      .select({
        route: tourRoutes,
        startVenue: venues,
      })
      .from(tourRoutes)
      .leftJoin(venues, eq(tourRoutes.startVenueId, venues.id))
      .where(eq(tourRoutes.tourId, tourId));
    
    // Get end venues separately since we can't join the same table twice with the same alias
    const routesWithEndVenues = await Promise.all(
      routesResult.map(async (result) => {
        let endVenue = null;
        if (result.route.endVenueId) {
          const endVenueResult = await db
            .select()
            .from(venues)
            .where(eq(venues.id, result.route.endVenueId))
            .limit(1);
          
          if (endVenueResult.length) {
            endVenue = endVenueResult[0];
          }
        }
        
        return {
          ...result.route,
          startVenue: result.startVenue,
          endVenue: endVenue,
        };
      })
    );
    
    res.json(routesWithEndVenues);
  } catch (error) {
    console.error("Error getting tour routes:", error);
    res.status(500).json({ error: "Failed to get tour routes" });
  }
});

/**
 * Delete a tour route
 */
router.delete('/tours/:tourId/routes/:routeId', async (req, res) => {
  try {
    const tourId = Number(req.params.tourId);
    const routeId = Number(req.params.routeId);
    
    // Delete the tour route
    await db
      .delete(tourRoutes)
      .where(and(
        eq(tourRoutes.id, routeId),
        eq(tourRoutes.tourId, tourId)
      ));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting tour route:", error);
    res.status(500).json({ error: "Failed to delete tour route" });
  }
});

/**
 * Calculate all possible routes for a tour and store them
 */
router.post('/tours/:id/calculate-routes', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    
    // Get tour venues
    const tourVenueResults = await db
      .select({
        tourVenue: tourVenues,
        venue: venues,
      })
      .from(tourVenues)
      .leftJoin(venues, eq(tourVenues.venueId, venues.id))
      .where(eq(tourVenues.tourId, tourId))
      .orderBy(tourVenues.sequence);
    
    // Extract venues with coordinates
    const venuesWithCoordinates = tourVenueResults.filter(
      tv => tv.venue && tv.venue.latitude && tv.venue.longitude
    );
    
    if (venuesWithCoordinates.length < 2) {
      return res.status(400).json({ 
        error: "At least 2 venues with coordinates are required to calculate routes" 
      });
    }
    
    // First delete existing routes for this tour
    await db
      .delete(tourRoutes)
      .where(eq(tourRoutes.tourId, tourId));
    
    const routes: TourRoute[] = [];
    
    // Calculate routes between consecutive venues
    for (let i = 0; i < venuesWithCoordinates.length - 1; i++) {
      const current = venuesWithCoordinates[i];
      const next = venuesWithCoordinates[i + 1];
      
      // Skip if venues don't have valid coordinates or IDs
      if (!current.venue || !next.venue || 
          !current.venue.latitude || !current.venue.longitude || 
          !next.venue.latitude || !next.venue.longitude ||
          !current.venue.id || !next.venue.id) {
        continue;
      }
      
      // Calculate distance between venues
      const distance = calculateDistance(
        Number(current.venue.latitude),
        Number(current.venue.longitude),
        Number(next.venue.latitude),
        Number(next.venue.longitude)
      );
      
      // Estimate travel time
      const travelTime = estimateTravelTime(distance);
      
      // Create route record
      const routeResult = await db
        .insert(tourRoutes)
        .values({
          tourId: tourId,
          startVenueId: current.venue.id,
          endVenueId: next.venue.id,
          distanceKm: distance,
          estimatedTravelTimeMinutes: travelTime,
          optimizationScore: Math.round(100 - Math.min(50, distance / 10)), // Simple score calculation
        })
        .returning();
        
      if (routeResult && routeResult.length > 0) {
        routes.push(routeResult[0]);
      }
    }
    
    // Calculate total distance and time
    const totalDistance = routes.reduce((sum, route) => {
      return sum + (typeof route.distanceKm === 'number' ? route.distanceKm : 0);
    }, 0);
    
    const totalTime = routes.reduce((sum, route) => {
      return sum + (typeof route.estimatedTravelTimeMinutes === 'number' 
                   ? route.estimatedTravelTimeMinutes : 0);
    }, 0);
    
    // Update tour with calculated metrics
    await db
      .update(tours)
      .set({
        estimatedTravelDistance: totalDistance,
        estimatedTravelTime: totalTime,
        updatedAt: new Date()
      })
      .where(eq(tours.id, tourId));
    
    res.json({
      routes,
      totalDistance,
      totalTime
    });
  } catch (error) {
    console.error("Error calculating tour routes:", error);
    res.status(500).json({ error: "Failed to calculate tour routes" });
  }
});

export default router;