// API utilities

// Define the interface for our API request helper
interface ApiRequest {
  get<T = any>(url: string, options?: RequestInit): Promise<T>;
  post<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  put<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  patch<T = any>(url: string, data?: any, options?: RequestInit): Promise<T>;
  delete<T = any>(url: string, options?: RequestInit): Promise<T>;
}

/**
 * Generic API request function that supports TypeScript types
 * This is the preferred way to make API requests throughout the application
 */
export const apiRequest = async <T = any>({
  url,
  method = 'GET',
  data = undefined,
  headers = {},
  ...options
}: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  [key: string]: any;
}): Promise<T> => {
  const config: RequestInit = {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...options,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'API request failed');
  }
  
  return response.json();
};

// Legacy axios-like request helpers
// This is kept for reference but we're standardizing on the apiRequest format above
export const legacyApiRequest: ApiRequest = {
  async get(url: string, options?: RequestInit) {
    return apiRequest({ url, method: 'GET' as const, ...options });
  },
  
  async post(url: string, data?: any, options?: RequestInit) {
    return apiRequest({ url, method: 'POST' as const, data, ...options });
  },
  
  async put(url: string, data?: any, options?: RequestInit) {
    return apiRequest({ url, method: 'PUT' as const, data, ...options });
  },
  
  async patch(url: string, data?: any, options?: RequestInit) {
    return apiRequest({ url, method: 'PATCH' as const, data, ...options });
  },
  
  async delete(url: string, options?: RequestInit) {
    return apiRequest({ url, method: 'DELETE' as const, ...options });
  },
};

// Helper for handling API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'API request failed');
  }
  return response.json();
}

// Legacy API request function (for backward compatibility)
export async function apiRequestLegacy(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
}

// Tour related API functions
export async function getTour(tourId: number) {
  return apiRequest({
    url: `/api/tours/${tourId}`,
    method: 'GET' as const
  });
}

export async function getTourById(tourId: number) {
  return apiRequest({
    url: `/api/tours/${tourId}`,
    method: 'GET' as const
  });
}

export async function updateTour(tourId: number, data: any) {
  return apiRequest({
    url: `/api/tours/${tourId}`,
    method: 'PATCH', 
    data
  });
}

export async function optimizeTourRoute(tourId: number, options = {}) {
  return apiRequest({
    url: `/api/tours/${tourId}/optimize`,
    method: 'POST',
    data: options
  });
}

export async function applyTourOptimization(tourId: number, optimizationResult: any) {
  return apiRequest({
    url: `/api/tours/${tourId}/apply-optimization`,
    method: 'POST',
    data: optimizationResult
  });
}

// Venue network related functions
export async function getVenueNetworkGraph(filters?: any) {
  return apiRequest({
    url: `/api/venue-network/graph${filters ? `?${new URLSearchParams(filters)}` : ''}`,
    method: 'GET'
  });
}

export async function getAllVenuesForNetworkMap(filters?: any) {
  return apiRequest({
    url: `/api/venue-network/all-venues${filters ? `?${new URLSearchParams(filters)}` : ''}`,
    method: 'GET'
  });
}

export async function getCollaborativeOpportunitiesByVenue(venueId: number) {
  return apiRequest({
    url: `/api/venue-network/opportunities/${venueId}`,
    method: 'GET'
  });
}

export async function searchVenues(query: string) {
  return apiRequest({
    url: `/api/venues/search?query=${encodeURIComponent(query)}`,
    method: 'GET'
  });
}

export async function createVenueConnection(data: { sourceVenueId: number; targetVenueId: number; connectionType: string }) {
  return apiRequest({
    url: `/api/venue-network/connections`,
    method: 'POST',
    data
  });
}

// Note: AI optimization functions have been consolidated into the unified optimizer API
// These functions are kept for backwards compatibility but are deprecated
export async function getAIOptimizationSuggestions(tourId: number) {
  console.warn('getAIOptimizationSuggestions is deprecated, use getUnifiedOptimization with method="ai" instead');
  return getUnifiedOptimization(tourId, { method: 'ai' });
}

// Apply AI optimization (deprecated)
export async function applyAIOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string>) {
  console.warn('applyAIOptimization is deprecated, use applyUnifiedOptimization instead');
  return applyUnifiedOptimization(tourId, optimizedSequence, suggestedDates);
}

// Get unified optimization suggestions
export async function getUnifiedOptimization(
  tourId: number, 
  options: {
    method?: 'standard' | 'ai' | 'auto';
    venuePriorities?: Record<number, number>;
    respectFixedDates?: boolean;
    optimizeFor?: 'distance' | 'time' | 'balanced';
    preferredDates?: Record<number, string>;
    avoidDates?: string[];
    minDaysBetweenShows?: number;
    maxDaysBetweenShows?: number;
  } = {}
) {
  const { method = 'auto', ...otherOptions } = options;
  return apiRequest({
    url: `/api/unified-optimizer/optimize/${tourId}`,
    method: 'POST',
    data: { method, ...otherOptions }
  });
}

// Apply unified optimization
export async function applyUnifiedOptimization(
  tourId: number, 
  optimizedSequence: number[], 
  suggestedDates: Record<string, string> = {},
  resolvedConflicts?: Record<number, string>
) {
  return apiRequest({
    url: `/api/unified-optimizer/apply/${tourId}`,
    method: 'POST',
    data: { 
      optimizedSequence, 
      suggestedDates,
      resolvedConflicts 
    }
  });
}

// Messages API
export async function getMessages() {
  return apiRequest({
    url: '/api/messages',
    method: 'GET'
  });
}

export async function sendMessage(message: { recipientId: number; content: string }) {
  return apiRequest({
    url: '/api/messages',
    method: 'POST',
    data: message
  });
}

// Admin and settings API
export async function checkBandsintownApiKeyStatus() {
  return apiRequest({
    url: '/api/admin/bandsintown/status',
    method: 'GET'
  });
}

export async function setBandsintownApiKey(apiKey: string) {
  return apiRequest({
    url: '/api/admin/bandsintown/key',
    method: 'POST',
    data: { apiKey }
  });
}

export async function getSyncStatus() {
  return apiRequest({
    url: '/api/admin/sync/status',
    method: 'GET'
  });
}

export async function triggerSync(type: string) {
  return apiRequest({
    url: '/api/admin/sync',
    method: 'POST',
    data: { type }
  });
}

// Event API
export async function getEvents(filters?: any) {
  return apiRequest({
    url: `/api/events${filters ? `?${new URLSearchParams(filters)}` : ''}`,
    method: 'GET'
  });
}

export async function getEvent(eventId: number) {
  return apiRequest({
    url: `/api/events/${eventId}`,
    method: 'GET'
  });
}

export async function getEventsByVenue(venueId: number) {
  return apiRequest({
    url: `/api/venues/${venueId}/events`,
    method: 'GET'
  });
}

export async function getVenue(venueId: number) {
  return apiRequest({
    url: `/api/venues/${venueId}`,
    method: 'GET'
  });
}

export async function createEvent(event: any) {
  return apiRequest({
    url: '/api/events',
    method: 'POST',
    data: event
  });
}

export async function updateEvent(eventId: number, data: any) {
  return apiRequest({
    url: `/api/events/${eventId}`,
    method: 'PATCH',
    data
  });
}

// Tour listing and management
export async function getTours(filters?: any) {
  return apiRequest({
    url: `/api/tours${filters ? `?${new URLSearchParams(filters)}` : ''}`,
    method: 'GET'
  });
}

export async function createTour(tour: any) {
  return apiRequest({
    url: '/api/tours',
    method: 'POST',
    data: tour
  });
}

export async function deleteTour(tourId: number) {
  return apiRequest({
    url: `/api/tours/${tourId}`,
    method: 'DELETE'
  });
}

export async function getTourVenues(tourId: number) {
  return apiRequest({
    url: `/api/tours/${tourId}/venues`,
    method: 'GET'
  });
}

export async function addVenueToTour(tourId: number, data: any) {
  return apiRequest({
    url: `/api/tours/${tourId}/venues`,
    method: 'POST',
    data
  });
}

export async function updateTourVenue(tourId: number, venueId: number, data: any) {
  return apiRequest({
    url: `/api/tours/${tourId}/venues/${venueId}`,
    method: 'PATCH',
    data
  });
}

export async function removeTourVenue(tourId: number, venueId: number) {
  return apiRequest({
    url: `/api/tours/${tourId}/venues/${venueId}`,
    method: 'DELETE'
  });
}

// Artist-related API functions
export async function getArtists(params?: { limit?: number; offset?: number }) {
  const queryParams = params ? `?${new URLSearchParams(params as any)}` : '';
  return apiRequest({
    url: `/api/artists${queryParams}`,
    method: 'GET'
  });
}

export async function searchArtists(query: string) {
  return apiRequest({
    url: `/api/artists/search?query=${encodeURIComponent(query)}`,
    method: 'GET'
  });
}

export async function getArtistById(artistId: number) {
  return apiRequest({
    url: `/api/artists/${artistId}`,
    method: 'GET'
  });
}