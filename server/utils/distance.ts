/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate total distance between multiple venues
 * @param venues Array of venue objects with latitude and longitude
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(venues: Array<{ latitude: number | null; longitude: number | null; }>): number {
  if (venues.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < venues.length - 1; i++) {
    const currentVenue = venues[i];
    const nextVenue = venues[i + 1];
    
    if (currentVenue.latitude && currentVenue.longitude && 
        nextVenue.latitude && nextVenue.longitude) {
      const distance = calculateDistance(
        currentVenue.latitude, 
        currentVenue.longitude,
        nextVenue.latitude,
        nextVenue.longitude
      );
      totalDistance += distance;
    }
  }
  
  return Math.round(totalDistance * 10) / 10; // Round to 1 decimal place
}

/**
 * Estimate travel time based on total distance
 * @param distanceKm Total distance in kilometers
 * @returns Estimated travel time in minutes
 */
export function estimateTravelTime(distanceKm: number): number {
  // Assume average speed of 60 km/h for travel between cities
  const averageSpeedKmh = 60;
  // Convert to minutes
  return Math.round(distanceKm / averageSpeedKmh * 60);
}