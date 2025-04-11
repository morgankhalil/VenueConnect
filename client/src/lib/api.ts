import { queryClient, apiRequest } from './queryClient';

// Standard API request helper
async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Tour route data interface
 */
export interface TourRoute {
  id: number;
  tourId: number;
  startVenueId: number;
  endVenueId: number;
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  optimizationScore: number;
  createdAt?: Date | string;
  startVenue?: any;
  endVenue?: any;
}

/**
 * Get the tour routes for visualization
 */
export async function getTourRoutes(tourId: number): Promise<TourRoute[]> {
  return request<TourRoute[]>(`/api/tour-optimization/tours/${tourId}/routes`);
}

/**
 * Calculate routes for a tour
 */
export async function calculateTourRoutes(tourId: number) {
  return request(`/api/tour-optimization/tours/${tourId}/calculate-routes`, {
    method: 'POST'
  });
}

/**
 * Apply enhanced optimization to a tour
 */
export async function applyEnhancedOptimization(tourId: number, optimizationData: any) {
  return request(`/api/tour-optimization-enhanced/tours/${tourId}/apply-optimization-enhanced`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ optimizationData })
  });
}

/**
 * Find improved venues to fill gaps in a tour schedule
 */
export async function findGapVenues(tourId: number, data: {
  startVenueId: number;
  endVenueId: number;
  startDate: string;
  endDate: string;
  artistPreferences?: any;
}) {
  return request(`/api/tour-optimization-enhanced/tours/${tourId}/find-gap-venues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

// Add utility function to format distance
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}