// Map utilities for MapBox integration
// Get Mapbox token from server-side fetch instead of direct env variable reference
export let mapboxToken = "";

// Initialize token
async function initMapboxToken() {
  try {
    const response = await fetch('/api/mapbox-token');
    const data = await response.json();
    mapboxToken = data.token || "";
  } catch (err) {
    console.error("Error fetching Mapbox token:", err);
  }
}

// Call init function
initMapboxToken();

// Default map settings for the tour routing visualization
export const defaultMapCenter: [number, number] = [-96.0, 39.5]; // US center
export const defaultMapZoom = 3.5;

// Coordinate calculations
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula for calculating great-circle distances between two points
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate geographic center of multiple points
export function calculateCenter(
  coordinates: Array<[number, number]>
): [number, number] {
  if (coordinates.length === 0) {
    return defaultMapCenter;
  }
  
  let totalLat = 0;
  let totalLng = 0;
  
  coordinates.forEach(([lng, lat]) => {
    totalLat += lat;
    totalLng += lng;
  });
  
  return [totalLng / coordinates.length, totalLat / coordinates.length] as [number, number];
}

// Determine appropriate zoom level based on distance between points
export function calculateZoom(
  coordinates: Array<[number, number]>
): number {
  if (coordinates.length < 2) {
    return defaultMapZoom;
  }
  
  let maxDistance = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[j];
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      maxDistance = Math.max(maxDistance, distance);
    }
  }
  
  // Approximate zoom based on maximum distance
  if (maxDistance > 3000) return 2;
  if (maxDistance > 2000) return 3;
  if (maxDistance > 1000) return 4;
  if (maxDistance > 500) return 5;
  if (maxDistance > 250) return 6;
  if (maxDistance > 100) return 7;
  if (maxDistance > 50) return 8;
  if (maxDistance > 25) return 9;
  if (maxDistance > 10) return 10;
  return 11;
}

// Generate GeoJSON data for MapBox
export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: number;
    title: string;
    description: string;
    isCurrentVenue: boolean;
    isRoutingOpportunity: boolean;
  };
}

export interface GeoJsonData {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

// Color schemes for the map
export const venueMarkerColors = {
  currentVenue: '#F97316', // Orange accent color
  confirmedVenue: '#22C55E', // Green
  routingOpportunity: '#3B82F6', // Primary blue
};

// Route line styles
export const routeLineStyle = {
  color: 'rgba(59, 130, 246, 0.9)',
  width: 4,
  dashArray: [2, 4],
};
