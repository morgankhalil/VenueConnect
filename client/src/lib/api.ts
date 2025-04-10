import { apiRequest } from './queryClient';
export { apiRequest };

/**
 * API client functions for interacting with the server
 */

/**
 * Trigger a sync of artist events from Bandsintown
 * @param artistName The name of the artist to sync
 * @returns A promise that resolves when the sync has started
 */
export async function syncArtistEvents(artistName: string) {
  return apiRequest('/api/bandsintown/sync-artist', {
    method: 'POST',
    body: JSON.stringify({ artistName }),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Trigger a sync of venues from Bandsintown
 * @param venueId The ID of the venue to use as the source
 * @param radius The radius around the venue to search for other venues (in miles)
 * @param limit The maximum number of venues to return
 * @returns A promise that resolves when the sync has started
 */
export async function triggerVenueSync(venueId: number, radius = 250, limit = 10) {
  return apiRequest('/api/bandsintown/sync-venues', {
    method: 'POST',
    body: JSON.stringify({ venueId, radius, limit }),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Check if the Bandsintown API key is configured
 * @returns A promise that resolves with the status of the API key
 */
export async function checkBandsintownApiStatus() {
  return apiRequest('/api/bandsintown/status');
}

/**
 * Alias for checkBandsintownApiStatus to maintain compatibility with admin pages
 * @returns A promise that resolves with the status of the API key
 */
export async function checkBandsintownApiKeyStatus() {
  return checkBandsintownApiStatus();
}

/**
 * Set the Bandsintown API key
 * @param apiKey The API key to set
 * @returns A promise that resolves when the API key is set
 */
export async function setBandsintownApiKey(apiKey: string) {
  return apiRequest('/api/admin/api-keys/bandsintown', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get events, either for a specific venue or all events
 * @param venueId Optional venue ID to filter by 
 * @returns A promise that resolves to the events
 */
export async function getEvents() {
  return apiRequest('/api/events');
}

/**
 * Get a specific event by ID
 * @param id The ID of the event to get
 * @returns A promise that resolves to the event
 */
export async function getEvent(id: number) {
  return apiRequest(`/api/events/${id}`);
}

/**
 * Get events for a specific venue
 * @param venueId The ID of the venue to filter by
 * @returns A promise that resolves to the venue's events
 */
export async function getEventsByVenue(venueId: number) {
  return apiRequest(`/api/venues/${venueId}/events`);
}

/**
 * Get predictions with details, including artist and venue information
 * @returns A promise that resolves to predictions with artist and venue details
 */
export async function getPredictionsWithDetails() {
  return apiRequest('/api/predictions/details');
}

/**
 * Get tour groups for visualizing artist tours on a map
 * @returns A promise that resolves to tour groups data
 */
export async function getTourGroups() {
  return apiRequest('/api/tour-groups');
}

/**
 * Get dashboard statistics
 * @returns A promise that resolves to dashboard statistics data
 */
export async function getStatsData() {
  // Optimize the stats endpoint which is used on the dashboard
  return apiRequest('/api/dashboard/stats');
}

/**
 * Get venue network graph data
 * @param venueId The ID of the venue to get the network for
 * @returns A promise that resolves to venue network graph data
 */
export async function getVenueNetworkGraph(venueId: number) {
  return apiRequest(`/api/venue-network/graph/${venueId}`);
}

/**
 * Get a venue by ID
 * @param id The ID of the venue to get
 * @returns A promise that resolves to the venue
 */
export async function getVenue(id: number) {
  return apiRequest(`/api/venues/${id}`);
}

/**
 * Create a connection between two venues
 * @param connection The venue connection details
 * @returns A promise that resolves when the connection is created
 */
export async function createVenueConnection(connection: {
  venueId: number;
  connectedVenueId: number;
  status?: string;
  trustScore?: number;
}) {
  return apiRequest('/api/venue-network', {
    method: 'POST',
    body: JSON.stringify(connection),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get collaborative opportunities for a venue
 * @param venueId The ID of the venue to get opportunities for
 * @returns A promise that resolves to collaborative opportunities data
 */
export async function getCollaborativeOpportunitiesByVenue(venueId: number) {
  return apiRequest(`/api/venues/${venueId}/collaborative-opportunities`);
}

/**
 * Get messages for the current user
 * @returns A promise that resolves to the user's messages
 */
export async function getMessages() {
  return apiRequest('/api/messages');
}

/**
 * Send a new message
 * @param message The message details
 * @returns A promise that resolves when the message is sent
 */
export async function sendMessage(message: {
  recipientId: number;
  subject: string;
  content: string;
}) {
  return apiRequest('/api/messages', {
    method: 'POST',
    body: JSON.stringify(message),
    headers: { 'Content-Type': 'application/json' }
  });
}

/* Tour Management API Functions */

/**
 * Get all tours with optional filtering
 * @param filters Optional query parameters for filtering tours
 * @returns A promise that resolves to the tours
 */
export async function getTours(filters?: {
  artistId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (filters?.artistId) queryParams.append('artistId', filters.artistId.toString());
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return apiRequest(`/api/tour/tours${queryString}`);
}

/**
 * Get a single tour by ID
 * @param tourId The ID of the tour to get
 * @returns A promise that resolves to the tour
 */
export async function getTour(tourId: number) {
  return apiRequest(`/api/tour/tours/${tourId}`);
}

/**
 * Alias for getTour to maintain compatibility with new components
 * @param tourId The ID of the tour to get
 * @returns A promise that resolves to the tour
 */
export async function getTourById(tourId: number) {
  return getTour(tourId);
}

/**
 * Create a new tour
 * @param tour The tour details
 * @returns A promise that resolves when the tour is created
 */
export async function createTour(tour: {
  name: string;
  artistId: number;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
}) {
  return apiRequest('/api/tour/tours', {
    method: 'POST',
    body: JSON.stringify(tour),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Update a tour
 * @param tourId The ID of the tour to update
 * @param updates The tour updates
 * @returns A promise that resolves when the tour is updated
 */
export async function updateTour(tourId: number, updates: {
  name?: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
}) {
  return apiRequest(`/api/tour/tours/${tourId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Add a venue to a tour
 * @param tourId The ID of the tour to add the venue to
 * @param venue The venue details
 * @returns A promise that resolves when the venue is added
 */
export async function addVenueToTour(tourId: number, venue: {
  venueId: number;
  status?: string;
  date?: string;
  sequence?: number;
  notes?: string;
}) {
  return apiRequest(`/api/tour/tours/${tourId}/venues`, {
    method: 'POST',
    body: JSON.stringify(venue),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Update a venue in a tour
 * @param tourId The ID of the tour
 * @param venueId The ID of the tour venue to update
 * @param updates The venue updates
 * @returns A promise that resolves when the venue is updated
 */
export async function updateTourVenue(tourId: number, venueId: number, updates: {
  status?: string;
  date?: string;
  sequence?: number;
  notes?: string;
}) {
  return apiRequest(`/api/tour/tours/${tourId}/venues/${venueId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Optimize a tour route
 * @param tourId The ID of the tour to optimize
 * @returns A promise that resolves to the optimized route
 */
export async function optimizeTourRoute(tourId: number, preferences?: any) {
  try {
    const response = await fetch(`/api/tour/tours/${tourId}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: preferences ? JSON.stringify({ preferences }) : undefined
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to optimize tour');
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Tour optimization error:', error);
    throw error;
  }
}

/**
 * Apply optimized tour route changes
 * @param tourId The ID of the tour to update
 * @param optimizationData The optimization results to apply
 * @returns A promise that resolves when the changes are applied
 */
export async function applyTourOptimization(tourId: number, optimizationData: any) {
  try {
    const response = await fetch(`/api/tour/tours/${tourId}/apply-optimization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optimizationData })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to apply tour optimization');
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Tour optimization apply error:', error);
    throw error;
  }
}

/**
 * Get artist tour preferences
 * @param artistId The ID of the artist to get preferences for
 * @returns A promise that resolves to the artist tour preferences
 */
export async function getArtistTourPreferences(artistId: number) {
  return apiRequest(`/api/tour/artists/${artistId}/tour-preferences`);
}

/**
 * Set artist tour preferences
 * @param artistId The ID of the artist to set preferences for
 * @param preferences The artist tour preferences
 * @returns A promise that resolves when the preferences are set
 */
export async function setArtistTourPreferences(artistId: number, preferences: {
  maxTravelDistancePerDay?: number;
  minDaysBetweenShows?: number;
  maxDaysBetweenShows?: number;
  avoidDates?: string[];
  requiredDayOff?: string[];
  preferredRegions?: string[];
}) {
  return apiRequest(`/api/tour/artists/${artistId}/tour-preferences`, {
    method: 'POST',
    body: JSON.stringify(preferences),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get venue tour preferences
 * @param venueId The ID of the venue to get preferences for
 * @returns A promise that resolves to the venue tour preferences
 */
export async function getVenueTourPreferences(venueId: number) {
  return apiRequest(`/api/tour/venues/${venueId}/tour-preferences`);
}

/**
 * Set venue tour preferences
 * @param venueId The ID of the venue to set preferences for
 * @param preferences The venue tour preferences
 * @returns A promise that resolves when the preferences are set
 */
export async function setVenueTourPreferences(venueId: number, preferences: {
  availableDates?: string[];
  typicalCapacity?: number;
  typicalTicketPrice?: number;
  preferredGenres?: string[];
  blackoutDates?: string[];
  advanceBookingDays?: number;
}) {
  return apiRequest(`/api/tour/venues/${venueId}/tour-preferences`, {
    method: 'POST',
    body: JSON.stringify(preferences),
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get tour statistics for an artist
 * @param artistId The ID of the artist to get statistics for
 * @returns A promise that resolves to the tour statistics
 */
export async function getArtistTourStats(artistId: number) {
  return apiRequest(`/api/tour/artists/${artistId}/tour-stats`);
}