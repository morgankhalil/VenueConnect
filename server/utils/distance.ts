/**
 * Distance calculation utility functions 
 * These functions help with calculating distances between coordinates
 * and estimating travel times for optimization
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * This calculates the shortest distance over the earth's surface
 * @param lat1 First point latitude
 * @param lon1 First point longitude
 * @param lat2 Second point latitude
 * @param lon2 Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number | null | undefined, 
  lon1: number | null | undefined,
  lat2: number | null | undefined, 
  lon2: number | null | undefined
): number {
  // If any coordinate is null or undefined, return 0
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return 0;
  }

  // Convert degrees to radians
  const toRad = (degree: number) => degree * Math.PI / 180;
  
  // Earth's radius in kilometers
  const R = 6371;
  
  // Differences in coordinates
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Calculate the total distance of a route through all provided venues
 * @param venues Array of venues with coordinates
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(
  venues: Array<{ 
    latitude: number | null | undefined; 
    longitude: number | null | undefined;
  }>
): number {
  let totalDistance = 0;
  
  // Skip calculation if there are less than 2 venues
  if (venues.length < 2) {
    return totalDistance;
  }
  
  // Calculate distance between consecutive venues
  for (let i = 0; i < venues.length - 1; i++) {
    const current = venues[i];
    const next = venues[i + 1];
    
    const distance = calculateDistance(
      current.latitude, 
      current.longitude,
      next.latitude, 
      next.longitude
    );
    
    totalDistance += distance;
  }
  
  return totalDistance;
}

/**
 * Estimate travel time based on distance
 * Uses a simple averaging model of 65 km/h average speed for road travel
 * @param distance Distance in kilometers
 * @returns Estimated travel time in minutes
 */
export function estimateTravelTime(distance: number): number {
  // Average driving speed in km/h
  const averageSpeed = 65;
  
  // Convert hours to minutes
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = timeInHours * 60;
  
  return Math.round(timeInMinutes);
}

/**
 * Calculate the optimization score based on route efficiency
 * Higher score is better (0-100)
 * @param initialDistance Initial total distance before optimization
 * @param optimizedDistance Optimized total distance after route changes
 * @returns Score between 0-100
 */
export function calculateOptimizationScore(
  initialDistance: number,
  optimizedDistance: number
): number {
  // If initial distance is 0, can't calculate improvement
  if (initialDistance <= 0) {
    return 0;
  }
  
  // Calculate percentage improvement
  const improvement = (initialDistance - optimizedDistance) / initialDistance;
  
  // Convert to a 0-100 scale with some weighting
  // A 30% reduction (0.3 improvement) should be approximately 85 score
  const score = Math.min(100, Math.round(improvement * 280));
  
  return Math.max(0, score);
}