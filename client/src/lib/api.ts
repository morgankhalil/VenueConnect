import { queryClient } from './queryClient';

// Standard API request helper for making fetch requests to the API
export async function apiRequest(url: string, options?: RequestInit): Promise<Response> {
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {})
  };
  
  // Make the API request
  return fetch(url, {
    ...options,
    headers
  });
}

// Helper function to make API requests with JSON response handling
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

/**
 * Venue network API endpoints
 */

/**
 * Get venue network graph data for visualization
 */
export async function getVenueNetworkGraph(venueId?: number) {
  return request(`/api/venue-network/graph${venueId ? `?venueId=${venueId}` : ''}`);
}

/**
 * Get collaborative opportunities for a venue
 */
export async function getCollaborativeOpportunitiesByVenue(venueId: number) {
  return request(`/api/venue-network/opportunities?venueId=${venueId}`);
}

/**
 * Create a venue connection
 */
export async function createVenueConnection(sourceVenueId: number, targetVenueId: number, connectionType: string, notes?: string) {
  return request(`/api/venue-network/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sourceVenueId,
      targetVenueId,
      connectionType,
      notes
    })
  });
}

/**
 * Search venues with filters
 */
export async function searchVenues(params: { query?: string, city?: string, capacity?: { min?: number, max?: number }, genre?: string }) {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('query', params.query);
  if (params.city) searchParams.append('city', params.city);
  if (params.capacity?.min) searchParams.append('minCapacity', params.capacity.min.toString());
  if (params.capacity?.max) searchParams.append('maxCapacity', params.capacity.max.toString());
  if (params.genre) searchParams.append('genre', params.genre);
  
  return request(`/api/venues/search?${searchParams.toString()}`);
}

/**
 * Get messages for a user
 */
export async function getMessages() {
  return request('/api/messages');
}

/**
 * API Integration endpoints
 */

/**
 * Check if the Bandsintown API key is valid
 */
export async function checkBandsintownApiKeyStatus() {
  return request('/api/admin/bandsintown/status');
}

/**
 * Set the Bandsintown API key
 */
export async function setBandsintownApiKey(apiKey: string) {
  return request('/api/admin/bandsintown/set-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey })
  });
}