// API utilities

// Define the interface for our API request helper
interface ApiRequest {
  get(url: string, options?: RequestInit): Promise<any>;
  post(url: string, data?: any, options?: RequestInit): Promise<any>;
  put(url: string, data?: any, options?: RequestInit): Promise<any>;
  patch(url: string, data?: any, options?: RequestInit): Promise<any>;
  delete(url: string, options?: RequestInit): Promise<any>;
}

// Create axios-like request helpers
export const apiRequest: ApiRequest = {
  async get(url: string, options?: RequestInit) {
    return fetch(url, {
      ...options,
      method: 'GET',
    }).then(handleResponse);
  },
  
  async post(url: string, data?: any, options?: RequestInit) {
    return fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    }).then(handleResponse);
  },
  
  async put(url: string, data?: any, options?: RequestInit) {
    return fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    }).then(handleResponse);
  },
  
  async patch(url: string, data?: any, options?: RequestInit) {
    return fetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    }).then(handleResponse);
  },
  
  async delete(url: string, options?: RequestInit) {
    return fetch(url, {
      ...options,
      method: 'DELETE',
    }).then(handleResponse);
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
  return apiRequest.get(`/api/tours/${tourId}`);
}

export async function getTourById(tourId: number) {
  return apiRequest.get(`/api/tours/${tourId}`);
}

export async function updateTour(tourId: number, data: any) {
  return apiRequest.patch(`/api/tours/${tourId}`, data);
}

export async function optimizeTourRoute(tourId: number, options = {}) {
  return apiRequest.post(`/api/tours/${tourId}/optimize`, options);
}

export async function applyTourOptimization(tourId: number, optimizationResult: any) {
  return apiRequest.post(`/api/tours/${tourId}/apply-optimization`, optimizationResult);
}

// Venue network related functions
export async function getVenueNetworkGraph(filters?: any) {
  return apiRequest.get(`/api/venue-network/graph${filters ? `?${new URLSearchParams(filters)}` : ''}`);
}

export async function getCollaborativeOpportunitiesByVenue(venueId: number) {
  return apiRequest.get(`/api/venue-network/opportunities/${venueId}`);
}

export async function searchVenues(query: string) {
  return apiRequest.get(`/api/venues/search?query=${encodeURIComponent(query)}`);
}

export async function createVenueConnection(data: { sourceVenueId: number; targetVenueId: number; connectionType: string }) {
  return apiRequest.post(`/api/venue-network/connections`, data);
}

// Note: AI optimization functions have been consolidated into the unified optimizer API
// These functions are kept for backwards compatibility but are deprecated
export async function getAIOptimizationSuggestions(tourId: number) {
  console.warn('getAIOptimizationSuggestions is deprecated, use getUnifiedOptimization with method="ai" instead');
  return getUnifiedOptimization(tourId, 'ai');
}

// Apply AI optimization (deprecated)
export async function applyAIOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string>) {
  console.warn('applyAIOptimization is deprecated, use applyUnifiedOptimization instead');
  return applyUnifiedOptimization(tourId, optimizedSequence, suggestedDates);
}

// Get unified optimization suggestions
export async function getUnifiedOptimization(tourId: number, method: 'standard' | 'ai' | 'auto' = 'auto') {
  return apiRequest.post(`/api/unified-optimizer/optimize/${tourId}`, { method });
}

// Apply unified optimization
export async function applyUnifiedOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string> = {}) {
  return apiRequest.post(`/api/unified-optimizer/apply/${tourId}`, { optimizedSequence, suggestedDates });
}

// Messages API
export async function getMessages() {
  return apiRequest.get('/api/messages');
}

export async function sendMessage(message: { recipientId: number; content: string }) {
  return apiRequest.post('/api/messages', message);
}

// Admin and settings API
export async function checkBandsintownApiKeyStatus() {
  return apiRequest.get('/api/admin/bandsintown/status');
}

export async function setBandsintownApiKey(apiKey: string) {
  return apiRequest.post('/api/admin/bandsintown/key', { apiKey });
}

export async function getSyncStatus() {
  return apiRequest.get('/api/admin/sync/status');
}

export async function triggerSync(type: string) {
  return apiRequest.post('/api/admin/sync', { type });
}

// Event API
export async function getEvents(filters?: any) {
  return apiRequest.get(`/api/events${filters ? `?${new URLSearchParams(filters)}` : ''}`);
}

export async function getEvent(eventId: number) {
  return apiRequest.get(`/api/events/${eventId}`);
}

export async function getEventsByVenue(venueId: number) {
  return apiRequest.get(`/api/venues/${venueId}/events`);
}

export async function getVenue(venueId: number) {
  return apiRequest.get(`/api/venues/${venueId}`);
}

export async function createEvent(event: any) {
  return apiRequest.post('/api/events', event);
}

export async function updateEvent(eventId: number, data: any) {
  return apiRequest.patch(`/api/events/${eventId}`, data);
}

// Tour listing and management
export async function getTours(filters?: any) {
  return apiRequest.get(`/api/tours${filters ? `?${new URLSearchParams(filters)}` : ''}`);
}

export async function createTour(tour: any) {
  return apiRequest.post('/api/tours', tour);
}

export async function deleteTour(tourId: number) {
  return apiRequest.delete(`/api/tours/${tourId}`);
}

export async function getTourVenues(tourId: number) {
  return apiRequest.get(`/api/tours/${tourId}/venues`);
}

export async function addVenueToTour(tourId: number, data: any) {
  return apiRequest.post(`/api/tours/${tourId}/venues`, data);
}

export async function updateTourVenue(tourId: number, venueId: number, data: any) {
  return apiRequest.patch(`/api/tours/${tourId}/venues/${venueId}`, data);
}

export async function removeTourVenue(tourId: number, venueId: number) {
  return apiRequest.delete(`/api/tours/${tourId}/venues/${venueId}`);
}