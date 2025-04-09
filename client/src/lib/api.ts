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
  return apiRequest('/api/venue-network/connections', {
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