/**
 * Geo-based utility functions for distance and travel time calculations
 * These functions are used throughout the application to ensure consistent distance
 * and travel time calculations for tour optimization.
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * This calculates the shortest distance over the earth's surface
 * 
 * @param lat1 First point latitude in degrees
 * @param lon1 First point longitude in degrees
 * @param lat2 Second point latitude in degrees
 * @param lon2 Second point longitude in degrees
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
  const EARTH_RADIUS_KM = 6371;
  
  // Differences in coordinates
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;
  
  return distance;
}

/**
 * Convert kilometers to miles
 * 
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers
 * 
 * @param miles Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles / 0.621371;
}

/**
 * Estimate travel time between two points based on distance
 * 
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (defaults to 70 km/h for touring)
 * @param bufferFactor Buffer for rest stops, traffic, etc. (defaults to 1.2)
 * @returns Estimated travel time in minutes
 */
export function estimateTravelTime(
  distanceKm: number, 
  averageSpeedKmh: number = 70,
  bufferFactor: number = 1.2
): number {
  // Convert to minutes and add buffer for rest stops, traffic, etc.
  const travelTimeMinutes = (distanceKm / averageSpeedKmh) * 60;
  
  return Math.round(travelTimeMinutes * bufferFactor);
}

/**
 * Calculate the total distance between a sequence of venues
 * 
 * @param venues Array of venues with latitude and longitude properties
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(venues: Array<{
  latitude?: number | null;
  longitude?: number | null;
}>): number {
  let totalDistance = 0;
  
  for (let i = 0; i < venues.length - 1; i++) {
    const current = venues[i];
    const next = venues[i + 1];
    
    totalDistance += calculateDistance(
      current?.latitude,
      current?.longitude,
      next?.latitude,
      next?.longitude
    );
  }
  
  return totalDistance;
}

/**
 * Format a distance for display
 * 
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}