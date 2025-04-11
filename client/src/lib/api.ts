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
 * AI Optimization endpoints
 */

/**
 * Request AI optimization suggestions for a tour
 */
export async function getAIOptimizationSuggestions(tourId: number) {
  return request('/api/ai-optimization/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tourId })
  });
}

/**
 * Apply AI optimization suggestions to a tour
 */
export async function applyAIOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string>) {
  return request('/api/ai-optimization/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tourId, optimizedSequence, suggestedDates })
  });
}

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

export const checkBandsintownApiStatus = async () => {
  const response = await fetch('/api/admin/bandsintown-status');
  return response.json();
};

export const triggerVenueSync = async (artistName: string) => {
  const response = await fetch('/api/admin/sync-venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artistName })
  });
  return response.json();
};

export const testWebhook = async (id: number) => {

/**
 * Calendar and Event endpoints
 */

/**
 * Get a single event by ID
 */
export async function getEvent(id: number) {
  return request(`/api/events/${id}`);
}

/**
 * Get events for a specific period
 */
export async function getEvents(params?: { startDate?: string, endDate?: string, venueId?: number }) {
  const searchParams = new URLSearchParams();

  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.venueId) searchParams.append('venueId', params.venueId.toString());

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/api/events${queryString}`);
}

/**
 * Tour optimization endpoints
 */

/**
 * Get optimization options
 */
export async function getOptimizationOptions(tourId: number) {
  return request(`/api/tour-optimization/tours/${tourId}/options`);
}

/**
 * Generate an optimized route for a tour
 */
export async function optimizeTourRoute(tourId: number, preferences: any) {
  // The server-side route is mounted at /api/tour-optimization
  // The endpoint is defined as /:id/optimize in tour-routes.ts
  return request(`/api/tour-optimization/${tourId}/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
}

/**
 * Apply optimized tour changes
 */
export async function applyTourOptimization(tourId: number, optimizationData: any) {
  // The server-side route is mounted at /api/tour-optimization
  // The endpoint is defined as /:id/apply-optimization in tour-routes.ts
  return request(`/api/tour-optimization/${tourId}/apply-optimization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ optimizationData })
  });
}

/**
 * Tour management endpoints
 */

/**
 * Get a single tour by ID
 */
export async function getTour(id: number) {
  return request(`/api/tours/${id}`);
}

/**
 * Alias for getTour to maintain compatibility
 */
export const getTourById = getTour;

/**
 * Get all tours or filtered tours
 */
export async function getTours(params?: { artistId?: number, status?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.artistId) searchParams.append('artistId', params.artistId.toString());
  if (params?.status) searchParams.append('status', params.status);

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/api/tours${queryString}`);
}

/**
 * Create a new tour
 */
export async function createTour(data: any) {
  return request('/api/tours', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

/**
 * Update an existing tour
 */
export async function updateTour(id: number, data: any) {
  return request(`/api/tours/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

/**
 * Delete a tour
 */
export async function deleteTour(id: number) {
  return request(`/api/tours/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Venue management endpoints
 */

/**
 * Get a single venue by ID
 */
export async function getVenue(id: number) {
  return request(`/api/venues/${id}`);
}

/**
 * Get all venues or filtered venues
 */
export async function getVenues(params?: { city?: string, region?: string, minCapacity?: number, maxCapacity?: number }) {
  const searchParams = new URLSearchParams();

  if (params?.city) searchParams.append('city', params.city);
  if (params?.region) searchParams.append('region', params.region);
  if (params?.minCapacity) searchParams.append('minCapacity', params.minCapacity.toString());
  if (params?.maxCapacity) searchParams.append('maxCapacity', params.maxCapacity.toString());

  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request(`/api/venues${queryString}`);
}

/**
 * Create a new venue
 */
export async function createVenue(data: any) {
  return request('/api/venues', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

/**
 * Update an existing venue
 */
export async function updateVenue(id: number, data: any) {
  return request(`/api/venues/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

/**
 * Delete a venue
 */
export async function deleteVenue(id: number) {
  return request(`/api/venues/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Get events by venue
 */
export async function getEventsByVenue(venueId: number, params?: { startDate?: string, endDate?: string }) {
  const searchParams = new URLSearchParams();

  searchParams.append('venueId', venueId.toString());
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);

  return request(`/api/events?${searchParams.toString()}`);
}

export const deleteVenue = deleteVenue;
export { getEvent };
}