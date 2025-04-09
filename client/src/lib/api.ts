import { apiRequest } from './queryClient';
import { 
  Venue, Artist, Event, VenueNetwork, Prediction, 
  Inquiry, CollaborativeOpportunity, CollaborativeOpportunityWithDetails, 
  PredictionWithDetails, StatsData, MapEvent, VenueNetworkData, TourGroup
} from '@/types';

// Mock data functions
export const getMockStatsData = async (): Promise<StatsData> => {
  return {
    upcomingOpportunities: 24,
    confirmedBookings: 12,
    venueNetworkCount: 8,
    recentInquiries: 15
  };
};

export const getMockPredictions = async (): Promise<PredictionWithDetails[]> => {
  return [
    {
      id: 1,
      artist: { id: 1, name: "The Black Keys", genres: ["Rock", "Blues"] },
      suggestedDate: "2025-02-18",
      confidenceScore: 92,
      venue: { id: 1, name: "The Echo Lounge" },
      reasoning: "Strong match based on venue capacity and artist routing"
    },
    {
      id: 2,
      artist: { id: 2, name: "Japanese Breakfast", genres: ["Indie", "Pop"] },
      suggestedDate: "2025-03-15",
      confidenceScore: 88,
      venue: { id: 1, name: "The Echo Lounge" },
      reasoning: "Artist has performed at similar venues in the region"
    }
  ];
};

export const getMockTourGroups = async (): Promise<TourGroup[]> => {
  return [
    {
      id: 1,
      name: "West Coast Tour 2025",
      artistName: "The Black Keys",
      genre: "Rock",
      region: "West Coast",
      startDate: "2025-02-01",
      endDate: "2025-03-15",
      totalShows: 12,
      confirmedShows: 8,
      events: [
        {
          id: 1,
          venue: "The Fillmore",
          date: "2025-02-15",
          isRoutingOpportunity: false,
          latitude: 37.7749,
          longitude: -122.4194
        },
        {
          id: 2,
          venue: "Your Venue",
          date: "2025-02-18",
          isRoutingOpportunity: true,
          latitude: 38.5816,
          longitude: -121.4944
        }
      ]
    }
  ];
};

export const getMockCollaborativeOpportunities = async (): Promise<CollaborativeOpportunityWithDetails[]> => {
  return [
    {
      id: 1,
      artist: { id: 1, name: "Japanese Breakfast" },
      dateRangeStart: "2025-03-15",
      dateRangeEnd: "2025-03-30",
      status: "pending",
      participants: [
        { venue: { id: 1, name: "The Echo Lounge" } },
        { venue: { id: 2, name: "The Fillmore" } }
      ]
    }
  ];
};

// Venues
export const getVenues = async (): Promise<Venue[]> => {
  const res = await apiRequest('GET', '/api/venues', undefined);
  return res.json();
};

export const getVenue = async (id: number): Promise<Venue> => {
  const res = await apiRequest('GET', `/api/venues/${id}`, undefined);
  return res.json();
};

export const createVenue = async (venue: Omit<Venue, 'id'>): Promise<Venue> => {
  const res = await apiRequest('POST', '/api/venues', venue);
  return res.json();
};

export const updateVenue = async (id: number, venue: Partial<Venue>): Promise<Venue> => {
  const res = await apiRequest('PATCH', `/api/venues/${id}`, venue);
  return res.json();
};

export const getVenuesByUser = async (userId: number): Promise<Venue[]> => {
  const res = await apiRequest('GET', `/api/users/${userId}/venues`, undefined);
  return res.json();
};

// Artists
export const getArtists = async (filter?: string): Promise<Artist[]> => {
  const queryParam = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  const res = await apiRequest('GET', `/api/artists${queryParam}`, undefined);
  return res.json();
};

export const getArtist = async (id: number): Promise<Artist> => {
  const res = await apiRequest('GET', `/api/artists/${id}`, undefined);
  return res.json();
};

export const createArtist = async (artist: Omit<Artist, 'id'>): Promise<Artist> => {
  const res = await apiRequest('POST', '/api/artists', artist);
  return res.json();
};

// Events
export const getEvents = async (): Promise<Event[]> => {
  const res = await apiRequest('GET', '/api/events', undefined);
  return res.json();
};

export const getEvent = async (id: number): Promise<Event> => {
  const res = await apiRequest('GET', `/api/events/${id}`, undefined);
  return res.json();
};

export const createEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  const res = await apiRequest('POST', '/api/events', event);
  return res.json();
};

export const getEventsByVenue = async (venueId: number): Promise<Event[]> => {
  const res = await apiRequest('GET', `/api/venues/${venueId}/events`, undefined);
  return res.json();
};

export const getEventsByArtist = async (artistId: number): Promise<Event[]> => {
  const res = await apiRequest('GET', `/api/artists/${artistId}/events`, undefined);
  return res.json();
};

// Venue Network
export const getVenueConnections = async (venueId: number): Promise<VenueNetwork[]> => {
  const res = await apiRequest('GET', `/api/venues/${venueId}/connections`, undefined);
  return res.json();
};

export const createVenueConnection = async (connection: Omit<VenueNetwork, 'id'>): Promise<VenueNetwork> => {
  const res = await apiRequest('POST', '/api/venue-network', connection);
  return res.json();
};

export const getVenueNetworkGraph = async (venueId: number): Promise<VenueNetworkData> => {
  const res = await apiRequest('GET', `/api/venue-network/graph/${venueId}`, undefined);
  return res.json();
};

// Predictions
export const getPrediction = async (id: number): Promise<Prediction> => {
  const res = await apiRequest('GET', `/api/predictions/${id}`, undefined);
  return res.json();
};

export const getPredictionsByVenue = async (venueId: number): Promise<Prediction[]> => {
  const res = await apiRequest('GET', `/api/venues/${venueId}/predictions`, undefined);
  return res.json();
};

export const createPrediction = async (prediction: Omit<Prediction, 'id'>): Promise<Prediction> => {
  const res = await apiRequest('POST', '/api/predictions', prediction);
  return res.json();
};

// Inquiries
export const createInquiry = async (inquiry: Omit<Inquiry, 'id'>): Promise<Inquiry> => {
  const res = await apiRequest('POST', '/api/inquiries', inquiry);
  return res.json();
};

export const getInquiriesByVenue = async (venueId: number): Promise<Inquiry[]> => {
  const res = await apiRequest('GET', `/api/venues/${venueId}/inquiries`, undefined);
  return res.json();
};

// Collaborative Opportunities
export const createCollaborativeOpportunity = async (
  opportunity: Omit<CollaborativeOpportunity, 'id'>
): Promise<CollaborativeOpportunity> => {
  const res = await apiRequest('POST', '/api/collaborative-opportunities', opportunity);
  return res.json();
};

export const getCollaborativeOpportunitiesByVenue = async (
  venueId: number
): Promise<CollaborativeOpportunity[]> => {
  const res = await apiRequest(
    'GET',
    `/api/venues/${venueId}/collaborative-opportunities`,
    undefined
  );
  return res.json();
};

// All mock data has been moved to the database