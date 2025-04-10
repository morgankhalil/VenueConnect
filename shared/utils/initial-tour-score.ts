import { Venue, TourVenue, Tour } from "../schema";
import { calculateDistance, estimateTravelTime } from "./tour-optimizer";

/**
 * Calculate initial optimization score for a tour
 * This provides a baseline score before optimization is run
 * 
 * @param tourVenues Array of tour venues with venue information
 * @returns Object with score, distance, and travel time estimates
 */
export function calculateInitialTourScore(
  tourVenues: (TourVenue & { venue: Venue | null })[]
): { 
  optimizationScore: number, 
  totalDistance: number, 
  totalTravelTime: number
} {
  // Filter venues with coordinates and sort by date or sequence
  const venuesWithCoordinates = tourVenues
    .filter(tv => tv.venue && tv.venue.latitude && tv.venue.longitude)
    .sort((a, b) => {
      // Sort by date if available, otherwise by sequence
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return (a.sequence || 0) - (b.sequence || 0);
    });

  // If we don't have at least 2 venues with coordinates, we can't calculate a score
  if (venuesWithCoordinates.length < 2) {
    return {
      optimizationScore: 40, // Base score for unoptimized tours with minimal data
      totalDistance: 0,
      totalTravelTime: 0
    };
  }

  // Calculate total distance and travel time
  let totalDistance = 0;
  let totalTravelTime = 0;
  
  // Add penalties for schedule inefficiency
  let schedulePenalty = 0;
  let routePenalty = 0;
  
  // Count venues with no dates (lack of planning penalty)
  const venuesWithoutDates = tourVenues.filter(tv => !tv.date).length;
  const dateGapPenalty = Math.min(15, venuesWithoutDates * 3);
  
  // Process consecutive pairs to calculate distance and travel time
  for (let i = 0; i < venuesWithCoordinates.length - 1; i++) {
    const current = venuesWithCoordinates[i];
    const next = venuesWithCoordinates[i + 1];
    
    if (current.venue && next.venue && 
        current.venue.latitude && current.venue.longitude && 
        next.venue.latitude && next.venue.longitude) {
      // Calculate distance between venues
      const distance = calculateDistance(
        Number(current.venue.latitude),
        Number(current.venue.longitude),
        Number(next.venue.latitude),
        Number(next.venue.longitude)
      );
      
      // Add to total distance
      totalDistance += distance;
      
      // Calculate travel time
      const travelTime = estimateTravelTime(distance);
      totalTravelTime += travelTime;
      
      // Check for routing inefficiency (assess backtracking)
      if (i > 0) {
        const prev = venuesWithCoordinates[i - 1];
        if (prev.venue && prev.venue.latitude && prev.venue.longitude) {
          const prevToNext = calculateDistance(
            Number(prev.venue.latitude),
            Number(prev.venue.longitude),
            Number(next.venue.latitude),
            Number(next.venue.longitude)
          );
          
          // If going from prev->current->next is significantly longer than prev->next directly,
          // it's likely an inefficient route
          const directVsRouted = (distance + calculateDistance(
            Number(prev.venue.latitude),
            Number(prev.venue.longitude),
            Number(current.venue.latitude),
            Number(current.venue.longitude)
          )) / prevToNext;
          
          if (directVsRouted > 1.5) {
            // Route is at least 50% longer than optimal - add a penalty
            routePenalty += 5;
          }
        }
      }
      
      // Analyze date gaps if dates are available
      if (current.date && next.date) {
        const daysBetween = Math.floor(
          (new Date(next.date).getTime() - new Date(current.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Penalize very large gaps (over 7 days)
        if (daysBetween > 7) {
          schedulePenalty += Math.min(10, (daysBetween - 7) * 1.5);
        }
        
        // Penalize very tight scheduling (under 1 day) except for same-city venues
        if (daysBetween < 1 && distance > 50) {
          schedulePenalty += 5; // Tight scheduling with significant travel
        }
      }
    }
  }
  
  // Calculate the initial score (unoptimized)
  // Start with a base score and apply penalties
  const baseScore = 70; // Typical unoptimized tour starts around 70/100
  const distancePenalty = Math.min(20, totalDistance / 150); // Distance penalty
  const totalPenalty = Math.min(40, distancePenalty + schedulePenalty + routePenalty + dateGapPenalty);
  
  // Calculate final score
  const optimizationScore = Math.max(30, Math.round(baseScore - totalPenalty));
  
  return {
    optimizationScore,
    totalDistance,
    totalTravelTime
  };
}