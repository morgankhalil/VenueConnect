import { Router } from 'express';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { tours, tourVenues, venues, tourRoutes } from '../../shared/schema';
import { calculateDistance, estimateTravelTime } from '../../shared/utils/geo';
import { enhanceApplyOptimization, findImprovedVenuesForGap } from './tour-routes-extension';

const router = Router();

// Normalize venue status to standard values
function normalizeStatus(status: string): string {
  const lowered = status.toLowerCase();
  if (lowered.includes('confirm')) return 'confirmed';
  if (lowered.includes('hold')) return 'hold';
  if (lowered.includes('cancel')) return 'cancelled';
  return 'potential';
}

/**
 * Apply optimized tour route with enhanced route tracking
 */
router.post('/tours/:id/apply-optimization-enhanced', async (req, res) => {
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
          // Map venue.status to our standardized statuses if provided
          const standardizedStatus = venue.status ? 
            normalizeStatus(venue.status) : 
            existingTourVenue.tourVenue.status;
          
          await db
            .update(tourVenues)
            .set({
              date: venue.suggestedDate ? new Date(venue.suggestedDate) : existingTourVenue.tourVenue.date,
              status: standardizedStatus,
              sequence: sequenceNum, // Use the calculated sequence
              statusUpdatedAt: new Date(), // Track status update time
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
            tourId: tourId,
            venueId: venueId,
            date: new Date(venue.suggestedDate),
            status: normalizeStatus(venue.status || 'potential'),
            sequence: sequenceNum,
            statusUpdatedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    }
    
    // Get all venues after update
    const updatedTourVenues = await db
      .select({
        tourVenue: tourVenues,
        venue: venues
      })
      .from(tourVenues)
      .leftJoin(venues, eq(tourVenues.venueId, venues.id))
      .where(eq(tourVenues.tourId, tourId))
      .orderBy(tourVenues.sequence);
    
    // Calculate total distance and travel time for each segment
    let totalTravelDistance = 0;
    let totalTravelTime = 0;
    
    // Only calculate for venues with valid coordinates
    const venuesWithCoordinates = updatedTourVenues
      .filter(tv => tv.venue && tv.venue.latitude && tv.venue.longitude);
    
    // Calculate distance and travel time between each consecutive venue
    for (let i = 0; i < venuesWithCoordinates.length - 1; i++) {
      const current = venuesWithCoordinates[i];
      const next = venuesWithCoordinates[i + 1];
      
      const distance = calculateDistance(
        Number(current.venue.latitude),
        Number(current.venue.longitude),
        Number(next.venue.latitude),
        Number(next.venue.longitude)
      );
      
      const travelTime = estimateTravelTime(distance);
      
      totalTravelDistance += distance;
      totalTravelTime += travelTime;
    }
    
    // Calculate optimization score
    // 100 points if the total distance is 0, decreasing as distance increases
    const optimizationScore = totalTravelDistance > 0 
      ? Math.max(0, 100 - Math.min(50, totalTravelDistance / 100))
      : 100;
    
    // Update tour record with calculated metrics
    await db
      .update(tours)
      .set({
        estimatedTravelDistance: totalTravelDistance,
        estimatedTravelTime: totalTravelTime,
        optimizationScore: optimizationScore,
        updatedAt: new Date()
      })
      .where(eq(tours.id, tourId));
    
    // Store detailed route information in the tour_routes table
    await enhanceApplyOptimization(
      tourId,
      updatedTourVenues.map(item => ({ 
        ...item.tourVenue, 
        venue: item.venue, 
        sequence: item.tourVenue.sequence 
      })),
      totalTravelDistance,
      totalTravelTime
    );
    
    res.json({
      tour: {
        ...tourResult[0],
        estimatedTravelDistance: totalTravelDistance,
        estimatedTravelTime: totalTravelTime,
        optimizationScore
      },
      venues: updatedTourVenues.map(tv => ({
        ...tv.tourVenue,
        venue: tv.venue
      }))
    });
  } catch (error) {
    console.error("Error applying optimized route:", error);
    res.status(500).json({ error: "Failed to apply optimization" });
  }
});

/**
 * Find improved venues to fill gaps in a tour schedule
 */
router.post('/tours/:id/find-gap-venues', async (req, res) => {
  try {
    const tourId = Number(req.params.id);
    const { startVenueId, endVenueId, startDate, endDate, artistPreferences } = req.body;
    
    if (!startVenueId || !endVenueId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: "Start venue, end venue, start date, and end date are required" 
      });
    }
    
    // Get the start and end venues
    const [startVenue, endVenue] = await Promise.all([
      db.select().from(venues).where(eq(venues.id, startVenueId)).limit(1),
      db.select().from(venues).where(eq(venues.id, endVenueId)).limit(1)
    ]);
    
    if (!startVenue.length || !endVenue.length) {
      return res.status(404).json({ error: "Start or end venue not found" });
    }
    
    // Get all venues to consider as candidates
    const allVenues = await db.select().from(venues);
    
    // Find improved venues using the enhanced gap filling algorithm
    const improvedVenues = findImprovedVenuesForGap(
      startVenue[0],
      endVenue[0],
      new Date(startDate),
      new Date(endDate),
      allVenues,
      artistPreferences
    );
    
    res.json({
      startVenue: startVenue[0],
      endVenue: endVenue[0],
      gapVenues: improvedVenues
    });
  } catch (error) {
    console.error("Error finding gap venues:", error);
    res.status(500).json({ error: "Failed to find gap venues" });
  }
});

export default router;