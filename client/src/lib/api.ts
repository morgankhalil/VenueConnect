// API utilities

// Base API request function
export async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
}

// Tour related API functions
export async function getTour(tourId: number) {
  return apiRequest(`/api/tours/${tourId}`);
}

export async function getTourById(tourId: number) {
  return apiRequest(`/api/tours/${tourId}`);
}

export async function updateTour(tourId: number, data: any) {
  return apiRequest(`/api/tours/${tourId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function optimizeTourRoute(tourId: number) {
  return apiRequest(`/api/tour-optimization/${tourId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export async function applyTourOptimization(tourId: number, optimizationResult: any) {
  return apiRequest(`/api/tour-optimization/apply/${tourId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(optimizationResult),
  });
}

// Venue network related functions
export async function getVenueNetworkGraph(filters?: any) {
  return apiRequest(`/api/venue-network/graph${filters ? `?${new URLSearchParams(filters)}` : ''}`);
}

export async function getCollaborativeOpportunitiesByVenue(venueId: number) {
  return apiRequest(`/api/venue-network/opportunities/${venueId}`);
}

export async function searchVenues(query: string) {
  return apiRequest(`/api/venues/search?query=${encodeURIComponent(query)}`);
}

export async function createVenueConnection(data: { sourceVenueId: number; targetVenueId: number; connectionType: string }) {
  return apiRequest(`/api/venue-network/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Get AI optimization suggestions
export async function getAIOptimizationSuggestions(tourId: number) {
  return apiRequest(`/api/ai-optimization/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tourId }),
  });
}

// Apply AI optimization
export async function applyAIOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string>) {
  return apiRequest(`/api/ai-optimization/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tourId, optimizedSequence, suggestedDates }),
  });
}

// Get unified optimization suggestions
export async function getUnifiedOptimization(tourId: number, method: 'standard' | 'ai' | 'auto' = 'auto') {
  return apiRequest(`/api/unified-optimizer/optimize/${tourId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method }),
  });
}

// Apply unified optimization
export async function applyUnifiedOptimization(tourId: number, optimizedSequence: number[], suggestedDates: Record<string, string> = {}) {
  return apiRequest(`/api/unified-optimizer/apply/${tourId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ optimizedSequence, suggestedDates }),
  });
}

// Messages API
export async function getMessages() {
  return apiRequest('/api/messages');
}

export async function sendMessage(message: { recipientId: number; content: string }) {
  return apiRequest('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// Admin and settings API
export async function checkBandsintownApiKeyStatus() {
  return apiRequest('/api/admin/bandsintown/status');
}

export async function setBandsintownApiKey(apiKey: string) {
  return apiRequest('/api/admin/bandsintown/key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });
}

export async function getSyncStatus() {
  return apiRequest('/api/admin/sync/status');
}

export async function triggerSync(type: string) {
  return apiRequest('/api/admin/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type }),
  });
}

// Event API
export async function getEvents(filters?: any) {
  return apiRequest(`/api/events${filters ? `?${new URLSearchParams(filters)}` : ''}`);
}

export async function getEvent(eventId: number) {
  return apiRequest(`/api/events/${eventId}`);
}

export async function getEventsByVenue(venueId: number) {
  return apiRequest(`/api/venues/${venueId}/events`);
}

export async function getVenue(venueId: number) {
  return apiRequest(`/api/venues/${venueId}`);
}

export async function createEvent(event: any) {
  return apiRequest('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
}

export async function updateEvent(eventId: number, data: any) {
  return apiRequest(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}