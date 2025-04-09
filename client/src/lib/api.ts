import { apiRequest } from './queryClient';
export { apiRequest };
import { 
  Venue, Artist, Event, VenueNetwork, Prediction, 
  Inquiry, CollaborativeOpportunity, CollaborativeOpportunityWithDetails, 
  PredictionWithDetails, StatsData, MapEvent, VenueNetworkData, TourGroup
} from '@/types';

export const getStatsData = async (): Promise<StatsData> => {
  return apiRequest('/api/stats');
};

export const getPredictionsWithDetails = async (): Promise<PredictionWithDetails[]> => {
  return apiRequest('/api/predictions/details');
};

export const getTourGroups = async (): Promise<TourGroup[]> => {
  return apiRequest('/api/tours');
};

export const getCollaborativeOpportunitiesWithDetails = async (): Promise<CollaborativeOpportunityWithDetails[]> => {
  return apiRequest('/api/collaborative-opportunities/details');
};

// Venues
export const getVenues = async (): Promise<Venue[]> => {
  return apiRequest('/api/venues');
};

export const getVenue = async (id: number): Promise<Venue> => {
  return apiRequest(`/api/venues/${id}`);
};

export const createVenue = async (venue: Omit<Venue, 'id'>): Promise<Venue> => {
  return apiRequest('/api/venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venue)
  });
};

export const updateVenue = async (id: number, venue: Partial<Venue>): Promise<Venue> => {
  return apiRequest(`/api/venues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venue)
  });
};

export const getVenuesByUser = async (userId: number): Promise<Venue[]> => {
  return apiRequest(`/api/users/${userId}/venues`);
};

// Artists
export const getArtists = async (filter?: string): Promise<Artist[]> => {
  const queryParam = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return apiRequest(`/api/artists${queryParam}`);
};

export const getArtist = async (id: number): Promise<Artist> => {
  return apiRequest(`/api/artists/${id}`);
};

export const createArtist = async (artist: Omit<Artist, 'id'>): Promise<Artist> => {
  return apiRequest('/api/artists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artist)
  });
};

// Events
export const getEvents = async (): Promise<Event[]> => {
  return apiRequest('/api/events');
};

export const getEvent = async (id: number): Promise<Event> => {
  return apiRequest(`/api/events/${id}`);
};

export const createEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  return apiRequest('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
};

export const getMessages = async () => {
  return apiRequest('/api/messages');
};

export const getEventsByVenue = async (venueId: number): Promise<Event[]> => {
  return apiRequest(`/api/venues/${venueId}/events`);
};

export const getEventsByArtist = async (artistId: number): Promise<Event[]> => {
  return apiRequest(`/api/artists/${artistId}/events`);
};

// Venue Network
export const getVenueConnections = async (venueId: number): Promise<VenueNetwork[]> => {
  return apiRequest(`/api/venues/${venueId}/connections`);
};

export const createVenueConnection = async (connection: Omit<VenueNetwork, 'id'>): Promise<VenueNetwork> => {
  return apiRequest('/api/venue-network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connection)
  });
};

export const getVenueNetworkGraph = async (venueId: number): Promise<VenueNetworkData> => {
  return apiRequest(`/api/venue-network/graph/${venueId}`);
};

// Predictions
export const getPrediction = async (id: number): Promise<Prediction> => {
  return apiRequest(`/api/predictions/${id}`);
};

export const getPredictionsByVenue = async (venueId: number): Promise<Prediction[]> => {
  return apiRequest(`/api/venues/${venueId}/predictions`);
};

export const createPrediction = async (prediction: Omit<Prediction, 'id'>): Promise<Prediction> => {
  return apiRequest('/api/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prediction)
  });
};

// Inquiries
export const createInquiry = async (inquiry: Omit<Inquiry, 'id'>): Promise<Inquiry> => {
  return apiRequest('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inquiry)
  });
};

export const getInquiriesByVenue = async (venueId: number): Promise<Inquiry[]> => {
  return apiRequest(`/api/venues/${venueId}/inquiries`);
};

// Collaborative Opportunities
export const createCollaborativeOpportunity = async (
  opportunity: Omit<CollaborativeOpportunity, 'id'>
): Promise<CollaborativeOpportunity> => {
  return apiRequest('/api/collaborative-opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opportunity)
  });
};

export const getCollaborativeOpportunitiesByVenue = async (
  venueId: number
): Promise<CollaborativeOpportunity[]> => {
  return apiRequest(`/api/venues/${venueId}/collaborative-opportunities`);
};

// Admin operations
export const triggerVenueSync = async (venueId: number, radius?: number, limit?: number) => {
  return apiRequest('/api/admin/sync-venues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      radius,
      limit
    })
  });
};

export const checkBandsintownApiKeyStatus = async () => {
  return apiRequest('/api/admin/api-keys/bandsintown/status');
};

export const setBandsintownApiKey = async (apiKey: string) => {
  return apiRequest('/api/admin/api-keys/bandsintown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
};

// Webhook operations
export const registerWebhook = async (callbackUrl: string) => {
  return apiRequest('/api/admin/webhooks/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callbackUrl })
  });
};

export const unregisterWebhook = async (callbackUrl: string) => {
  return apiRequest('/api/admin/webhooks/unregister', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callbackUrl })
  });
};

export const testWebhook = async (callbackUrl: string) => {
  return apiRequest('/api/admin/webhooks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callbackUrl })
  });
};

// All mock data has been moved to the database