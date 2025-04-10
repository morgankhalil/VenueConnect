import { Venue, Artist, TourVenue, Tour, TourGap } from "../schema";

/**
 * Represents a point in the tour route
 */
export interface RoutingPoint {
  id: number;
  latitude: number | null;
  longitude: number | null;
  date?: Date | null;
  isFixed: boolean;
  status: string; // 'confirmed', 'booked', 'planning', etc.
}

/**
 * Constraints for tour optimization
 */
export interface OptimizationConstraints {
  maxTravelDistancePerDay?: number;
  minDaysBetweenShows?: number;
  maxDaysBetweenShows?: number;
  avoidDates?: string[];
  requiredDaysOff?: string[];
  preferredRegions?: string[];
}

/**
 * Extended venue data with optimization metadata
 * This is purely for the optimization result and not stored in the database
 */
export interface OptimizedVenueData {
  venue: Venue;
  date?: Date | null;
  isFixed: boolean;
  status?: string;
  suggestedDate?: Date;
  detourRatio?: number;
  // Additional metadata for the optimizer
  score?: number;
  gapFilling?: boolean;
}

/**
 * Result of tour optimization
 */
export interface OptimizedRoute {
  tourVenues: OptimizedVenueData[];
  gaps: {
    startDate: Date | null;
    endDate: Date | null;
    daysBetween: number;
    startVenueId: number;
    endVenueId: number;
    potentialVenues: Venue[];
  }[];
  totalDistance: number;
  totalTravelTime: number;
  optimizationScore: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }
  
  // Convert latitude and longitude from degrees to radians
  const radLat1 = (Math.PI * lat1) / 180;
  const radLon1 = (Math.PI * lon1) / 180;
  const radLat2 = (Math.PI * lat2) / 180;
  const radLon2 = (Math.PI * lon2) / 180;
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const radius = 6371;
  
  // Calculate distance
  return radius * c;
}

/**
 * Estimate travel time between two points based on distance
 * @param distanceKm Distance in kilometers
 * @returns Estimated travel time in minutes
 */
export function estimateTravelTime(distanceKm: number): number {
  // Assuming average speed of 70 km/h for touring
  const averageSpeedKmh = 70;
  // Convert to minutes and add buffer for rest stops, traffic, etc.
  const travelTimeMinutes = (distanceKm / averageSpeedKmh) * 60;
  const bufferFactor = 1.2; // 20% buffer
  
  return Math.round(travelTimeMinutes * bufferFactor);
}

/**
 * Find the nearest venue to a given point
 * @param point Reference point (latitude, longitude)
 * @param venues List of venues to check
 * @returns The closest venue and its distance
 */
export function findNearestVenue(
  point: { latitude: number; longitude: number },
  venues: Venue[]
): { venue: Venue; distance: number } | null {
  if (!venues.length || !point.latitude || !point.longitude) {
    return null;
  }
  
  let closestVenue = venues[0];
  let shortestDistance = calculateDistance(
    point.latitude,
    point.longitude,
    Number(venues[0].latitude) || 0,
    Number(venues[0].longitude) || 0
  );
  
  venues.slice(1).forEach(venue => {
    const distance = calculateDistance(
      point.latitude,
      point.longitude,
      Number(venue.latitude) || 0,
      Number(venue.longitude) || 0
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestVenue = venue;
    }
  });
  
  return { venue: closestVenue, distance: shortestDistance };
}

/**
 * Optimize a tour route using the nearest neighbor algorithm with constraints
 * @param tourPoints Points in the tour (confirmed/booked/planning venues with dates)
 * @param potentialStops Potential venues that could be added to the tour
 * @param constraints Optimization constraints
 * @returns Optimized tour route
 */
export function optimizeTourRoute(
  tourPoints: RoutingPoint[],
  potentialStops: Venue[],
  constraints: OptimizationConstraints = {}
): OptimizedRoute {
  // Ensure we have at least 2 points to work with
  if (tourPoints.length < 2) {
    throw new Error("At least 2 points are required for tour optimization");
  }
  
  // Separate confirmed venues (fixed and cannot be moved) from other venues (can be adjusted)
  const fixedPoints = tourPoints.filter(point => point.status === 'confirmed');
  const adjustablePoints = tourPoints.filter(point => point.status !== 'confirmed');
  
  // Sort all points by date if provided
  const sortedPoints = [...tourPoints].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return a.date.getTime() - b.date.getTime();
  });
  
  // Initialize the result
  const result: OptimizedRoute = {
    tourVenues: [],
    gaps: [],
    totalDistance: 0,
    totalTravelTime: 0,
    optimizationScore: 0
  };
  
  // First, add all existing tour points to the result
  sortedPoints.forEach(point => {
    if (point.latitude && point.longitude) {
      result.tourVenues.push({
        venue: {
          id: point.id,
          name: `Venue ${point.id}`, // The UI will look up the full venue info
          city: "",
          region: null,
          country: null,
          latitude: point.latitude,
          longitude: point.longitude,
          capacity: null,
          description: null,
          website: null,
          contactEmail: null,
          contactPhone: null, // Matches schema name
          imageUrl: null,
          ownerId: null,
          bandsintownId: null,
          createdAt: null,
        },
        date: point.date,
        isFixed: point.status === 'confirmed', // Only confirmed venues are fixed
        status: point.status || 'confirmed'
      });
    }
  });
  
  // Process pairs of points to find gaps and optimize between them
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const current = sortedPoints[i];
    const next = sortedPoints[i + 1];
    
    // Skip points without coordinates
    if (!current.latitude || !current.longitude || !next.latitude || !next.longitude) {
      continue;
    }
    
    // Calculate direct distance between fixed points
    const directDistance = calculateDistance(
      current.latitude,
      current.longitude,
      next.latitude,
      next.longitude
    );
    
    // Calculate travel time between fixed points
    const directTravelTime = estimateTravelTime(directDistance);
    
    // Add to total metrics
    result.totalDistance += directDistance;
    result.totalTravelTime += directTravelTime;
    
    // If dates are provided, analyze for potential gaps
    if (current.date && next.date) {
      const daysBetween = Math.floor(
        (next.date.getTime() - current.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // If gap is large enough for another show
      if (daysBetween > (constraints.minDaysBetweenShows || 1)) {
        // Find optimal venue(s) to fill the gap
        const gapVenues = findVenuesForGap(
          current,
          next,
          potentialStops,
          daysBetween,
          constraints
        );
        
        if (gapVenues.length > 0) {
          // Add these venues to the route as suggestions
          gapVenues.forEach((venueStop, index) => {
            // Determine optimal date for this venue in the gap
            const daysIntoGap = Math.round(daysBetween * ((index + 1) / (gapVenues.length + 1)));
            const venueDate = new Date(current.date!.getTime());
            venueDate.setDate(venueDate.getDate() + daysIntoGap);
            
            // Calculate how optimal this venue is for the route
            const distanceFromCurrent = calculateDistance(
              current.latitude!, 
              current.longitude!, 
              Number(venueStop.latitude) || 0, 
              Number(venueStop.longitude) || 0
            );
            
            const distanceToNext = calculateDistance(
              Number(venueStop.latitude) || 0, 
              Number(venueStop.longitude) || 0,
              next.latitude!, 
              next.longitude!
            );
            
            const directRouteDistance = calculateDistance(
              current.latitude!,
              current.longitude!,
              next.latitude!,
              next.longitude!
            );
            
            const detourRatio = (distanceFromCurrent + distanceToNext) / directRouteDistance;
            
            // Determine priority level based on how good this venue is
            // Lower detour ratio = higher priority
            let priority = 'suggested'; // Default status
            
            // Calculate a deviation score - how much does this add to the route?
            // 0 = perfect (right on the route), higher numbers = worse
            const deviationScore = Math.max(0, detourRatio - 1) * 100; // percentage of added distance
            
            // Determine status based on venue quality and fit
            if (deviationScore < 10) {
              // Almost directly on route (less than 10% deviation) - highest priority
              priority = 'hold1'; 
            } else if (deviationScore < 20) {
              // Very good option (10-20% deviation) - high priority
              priority = 'hold2';
            } else if (deviationScore < 40) {
              // Decent option (20-40% deviation) - medium priority
              priority = 'hold3';
            } else if (deviationScore < 100) {
              // Acceptable but not ideal (40-100% deviation) - low priority
              priority = 'hold4';
            } else {
              // Significant deviation (over 100% added distance) - just potential
              priority = 'potential';
            }
            
            // Special case: If this venue fills a significant gap (5+ days)
            // upgrade its importance because filling a gap is valuable
            if (daysBetween >= 5 && index === 0 && gapVenues.length === 1) {
              // This is the only venue filling a big gap - make it higher priority
              if (priority === 'potential') {
                priority = 'suggested';
              } else if (priority.startsWith('hold')) {
                // Bump priority up by 1 level (e.g., hold4 -> hold3)
                const currentLevel = parseInt(priority.substring(4));
                if (currentLevel > 1) { // Don't go higher than hold1
                  priority = `hold${currentLevel - 1}`;
                }
              }
            }
            
            // Add venue with suggested date and calculated status
            result.tourVenues.push({
              venue: venueStop,
              date: venueDate,
              isFixed: false,
              status: priority,
              suggestedDate: venueDate, // Additional field for UI display
              detourRatio: detourRatio, // Store for reference
              gapFilling: true, // Mark as a gap-filling suggestion
              score: detourRatio, // Store the score for reference
            });
          });
        } else {
          // Create a gap record if no venues found
          result.gaps.push({
            startDate: current.date,
            endDate: next.date,
            daysBetween: daysBetween,
            startVenueId: current.id,
            endVenueId: next.id,
            potentialVenues: []
          });
        }
      }
    }
  }
  
  // Sort the venues by date for proper display
  result.tourVenues.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return a.date.getTime() - b.date.getTime();
  });
  
  // Calculate optimization score (higher is better)
  // More sophisticated version considering gap filling quality
  const baseScore = 100;
  const distancePenalty = Math.min(20, result.totalDistance / 100);
  const timePenalty = Math.min(20, result.totalTravelTime / 500);
  
  // Reward for filling gaps appropriately
  const gapFillingBonus = Math.min(10, result.tourVenues.filter(v => !v.isFixed).length * 2);
  
  result.optimizationScore = Math.round(baseScore - distancePenalty - timePenalty + gapFillingBonus);
  
  // Cap score at reasonable bounds
  result.optimizationScore = Math.max(0, Math.min(100, result.optimizationScore));
  
  return result;
}

/**
 * Find venues that can fill a gap between two fixed points
 * @param start Starting point
 * @param end Ending point
 * @param venues Available venues
 * @param daysBetween Number of days between start and end
 * @param constraints Optimization constraints
 * @returns List of venues that can fill the gap, with suggestion metadata
 */
function findVenuesForGap(
  start: RoutingPoint,
  end: RoutingPoint,
  venues: Venue[],
  daysBetween: number,
  constraints: OptimizationConstraints
): Venue[] {
  if (!start.latitude || !start.longitude || !end.latitude || !end.longitude) {
    return [];
  }
  
  // For debugging/demo purposes, ensure we return at least some venues
  if (venues.length > 0 && venues.filter(v => v.latitude && v.longitude).length === 0) {
    console.log('Warning: No venues with coordinates available for gap filling');
    // Return some random venues anyway for demo purposes
    return venues.slice(0, Math.min(3, venues.length));
  }
  
  // Maximum number of shows that can fit in the gap
  const maxShows = Math.floor(daysBetween / (constraints.minDaysBetweenShows || 1));
  
  // Even if maxShows is 0, try to find at least one venue
  const minShows = Math.max(1, maxShows);
  
  // If the gap is very short, just find the best single venue
  if (maxShows === 1) {
    // Find midpoint between start and end
    const midLat = (start.latitude + end.latitude) / 2;
    const midLon = (start.longitude + end.longitude) / 2;
    
    const nearest = findNearestVenue(
      { latitude: midLat, longitude: midLon },
      venues
    );
    
    return nearest ? [nearest.venue] : [];
  }
  
  // For larger gaps, use more sophisticated routing
  // This is a simplified implementation - in a real system, this would use
  // more advanced algorithms like genetic algorithms or simulated annealing
  
  // For now, find venues along the path between start and end
  const result: Venue[] = [];
  const filteredVenues = venues.filter(venue => 
    venue.latitude !== null && 
    venue.longitude !== null
  );
  
  // Calculate route complexity based on gap size
  const isLongGap = daysBetween > 7;
  const isVeryLongGap = daysBetween > 14;
  
  // For short gaps, we want venues very close to the direct path
  // For longer gaps, we can explore more venues with greater deviation
  const deviationFactor = isLongGap ? 0.3 : 0.1;
  const maxVenues = isVeryLongGap ? 5 : (isLongGap ? 3 : 1);
  
  // Try to find potential venues, prioritizing those along the route
  const venueScores: { venue: Venue; score: number }[] = [];
  
  // Calculate a score for each venue
  for (const venue of filteredVenues) {
    if (!venue.latitude || !venue.longitude) continue;
    
    // Calculate distance from start and end
    const distanceFromStart = calculateDistance(
      start.latitude, 
      start.longitude, 
      venue.latitude,
      venue.longitude
    );
    
    const distanceFromEnd = calculateDistance(
      venue.latitude,
      venue.longitude,
      end.latitude, 
      end.longitude
    );
    
    // Calculate direct distance from start to end
    const directDistance = calculateDistance(
      start.latitude,
      start.longitude,
      end.latitude, 
      end.longitude
    );
    
    // Calculate total travel distance if we include this venue
    const totalDistanceWithVenue = distanceFromStart + distanceFromEnd;
    
    // Calculate deviation from direct path
    // Lower is better - closer to the direct path
    const deviation = totalDistanceWithVenue / directDistance - 1;
    
    // Calculate score (lower is better)
    // We want venues that minimize added travel distance but are still on a reasonable path
    const score = deviation;
    
    // Store venue with score
    venueScores.push({ venue, score });
  }
  
  // Sort venues by score (lowest score first)
  venueScores.sort((a, b) => a.score - b.score);
  
  // Take top venues based on max allowed
  // But limit to venues that don't deviate too much from the path
  for (const { venue, score } of venueScores) {
    if (result.length >= maxVenues) break;
    
    // Only include venues with reasonable deviation
    if (score <= deviationFactor) {
      result.push(venue);
    }
  }
  
  // If we still have no venues, grab some random ones with valid coordinates
  if (result.length === 0 && filteredVenues.length > 0) {
    // Just add up to 3 random venues as potential suggestions
    const randomVenues = filteredVenues.slice(0, Math.min(3, filteredVenues.length));
    result.push(...randomVenues);
  }
  
  return result;
}