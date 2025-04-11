import { db } from '../db';
import { tourRoutes, venues } from '../../shared/schema';
import { calculateDistance, estimateTravelTime } from '../../shared/utils/tour-optimizer';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Enhance the apply optimization functionality to store detailed route information
 * This function adds rich route data to the tour_routes table for visualization and analytics
 */
export async function enhanceApplyOptimization(
  tourId: number,
  sortedVenues: any[],
  totalTravelDistance: number,
  totalTravelTime: number
) {
  try {
    // First, clear existing route data for this tour
    await db
      .delete(tourRoutes)
      .where(eq(tourRoutes.tourId, tourId));
    
    // Process venues in pairs to create routes
    for (let i = 0; i < sortedVenues.length - 1; i++) {
      const currentVenue = sortedVenues[i];
      const nextVenue = sortedVenues[i + 1];
      
      // Skip venues without locations
      if (!currentVenue.venue?.latitude || !currentVenue.venue?.longitude ||
          !nextVenue.venue?.latitude || !nextVenue.venue?.longitude) {
        continue;
      }
      
      // Calculate the distance and travel time between these venues
      const distance = calculateDistance(
        Number(currentVenue.venue.latitude),
        Number(currentVenue.venue.longitude),
        Number(nextVenue.venue.latitude),
        Number(nextVenue.venue.longitude)
      );
      
      const travelTime = estimateTravelTime(distance);
      
      // Calculate local optimization score based on distance and time
      const optimizationScore = Math.max(0, 100 - Math.min(50, distance / 10));
      
      // Insert the route data
      await db.insert(tourRoutes).values({
        tourId,
        startVenueId: currentVenue.venueId,
        endVenueId: nextVenue.venueId,
        distanceKm: distance,
        estimatedTravelTimeMinutes: travelTime,
        optimizationScore,
        createdAt: new Date()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error enhancing route optimization:", error);
    throw error;
  }
}

/**
 * Find improved venues to fill gaps in a tour schedule
 * Uses geographic proximity and artist preferences to suggest venues
 */
export function findImprovedVenuesForGap(
  startVenue: any,
  endVenue: any,
  startDate: Date,
  endDate: Date,
  allVenues: any[],
  artistPreferences?: any
) {
  // Check if we have valid coordinates for start and end
  if (!startVenue?.latitude || !startVenue?.longitude ||
      !endVenue?.latitude || !endVenue?.longitude) {
    return [];
  }
  
  // Calculate the direct distance between start and end venues
  const directDistance = calculateDistance(
    Number(startVenue.latitude),
    Number(startVenue.longitude),
    Number(endVenue.latitude),
    Number(endVenue.longitude)
  );
  
  // Calculate the time available between dates (in days)
  const daysBetween = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // We need at least 1 day gap to consider filling
  if (daysBetween < 1) {
    return [];
  }
  
  // Determine maximum reasonable distance to travel
  // Based on the idea that we don't want to increase the total travel distance by more than 40%
  const maxTotalDistance = directDistance * 1.4;
  
  // Calculate the maximum distance from either endpoint for a candidate venue
  // This is a triangle where the three points are start, end, and the potential venue
  const maxDistanceFromEndpoint = maxTotalDistance / 2;
  
  // Filter venues first by excluding the start and end venues
  const candidateVenues = allVenues.filter(venue => 
    venue.id !== startVenue.id && venue.id !== endVenue.id &&
    venue.latitude && venue.longitude
  );
  
  // Compute scores for each candidate venue based on various factors
  const scoredVenues = candidateVenues.map(venue => {
    // Calculate distances from this venue to both start and end venues
    const distanceFromStart = calculateDistance(
      Number(startVenue.latitude),
      Number(startVenue.longitude),
      Number(venue.latitude),
      Number(venue.longitude)
    );
    
    const distanceFromEnd = calculateDistance(
      Number(venue.latitude),
      Number(venue.longitude),
      Number(endVenue.latitude),
      Number(endVenue.longitude)
    );
    
    // Calculate total travel distance if this venue is included
    const totalDistance = distanceFromStart + distanceFromEnd;
    
    // Calculate how well this venue divides the journey (scores higher if it's close to midpoint)
    const idealDistanceFromStart = directDistance / 2;
    const distanceFromIdeal = Math.abs(distanceFromStart - idealDistanceFromStart);
    const positionScore = Math.max(0, 100 - (distanceFromIdeal / directDistance) * 100);
    
    // Apply artist preferences if available
    let preferenceScore = 50; // Default neutral score
    
    if (artistPreferences) {
      // Prefer venues with capacity matching the artist's typical audience
      if (artistPreferences.preferredCapacity && venue.capacity) {
        const capacityDiff = Math.abs(venue.capacity - artistPreferences.preferredCapacity);
        const capacityScore = Math.max(0, 100 - (capacityDiff / artistPreferences.preferredCapacity) * 100);
        preferenceScore += capacityScore * 0.2; // 20% weight for capacity
      }
      
      // Prefer venues that match genre focus
      if (artistPreferences.genres && venue.genreFocus) {
        const genreMatch = artistPreferences.genres.some((genre: string) => 
          venue.genreFocus && venue.genreFocus.includes(genre)
        );
        preferenceScore += genreMatch ? 20 : 0; // 20% weight for genre match
      }
      
      // Prefer venues in preferred market categories
      if (artistPreferences.marketCategories && venue.marketCategory) {
        const marketMatch = artistPreferences.marketCategories.includes(venue.marketCategory);
        preferenceScore += marketMatch ? 10 : 0; // 10% weight for market category
      }
    }
    
    // Calculate a combined score (weighted factors)
    // - 40% weight for how well the venue is positioned between start and end
    // - 30% weight for total distance (less is better)
    // - 30% weight for artist preferences
    const distanceToMaxRatio = totalDistance / maxTotalDistance;
    const distanceScore = Math.max(0, 100 - distanceToMaxRatio * 100);
    
    const combinedScore = 
      (positionScore * 0.4) + 
      (distanceScore * 0.3) + 
      (preferenceScore * 0.3);
    
    // Get an ideal date for this venue (evenly distributed in the gap)
    // For simplicity, we'll use linear interpolation based on distance from start
    const totalDays = daysBetween + 1; // Include both start and end dates
    const dayOffset = Math.round((distanceFromStart / totalDistance) * totalDays);
    const suggestedDate = new Date(startDate);
    suggestedDate.setDate(startDate.getDate() + dayOffset);
    
    return {
      venue,
      score: combinedScore,
      totalDistance,
      distanceFromStart,
      distanceFromEnd,
      suggestedDate: suggestedDate.toISOString().split('T')[0],
      gapFilling: true,
      status: 'potential'
    };
  });
  
  // Filter venues that are too far away and sort by score
  const filteredVenues = scoredVenues
    .filter(item => 
      item.distanceFromStart <= maxDistanceFromEndpoint && 
      item.distanceFromEnd <= maxDistanceFromEndpoint
    )
    .sort((a, b) => b.score - a.score);
  
  // Return top improved venues
  return filteredVenues.slice(0, Math.min(5, daysBetween));
}