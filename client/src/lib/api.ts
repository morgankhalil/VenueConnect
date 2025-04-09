import { apiRequest } from './queryClient';
import { 
  Venue, Artist, Event, VenueNetwork, Prediction, 
  Inquiry, CollaborativeOpportunity, CollaborativeOpportunityWithDetails, 
  PredictionWithDetails, StatsData, MapEvent, VenueNetworkData
} from '@/types';

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

// Mock data for initial development
// This data should be removed when real API is connected
export const getMockPredictions = (): PredictionWithDetails[] => {
  return [
    {
      id: 1,
      artistId: 1,
      venueId: 1,
      suggestedDate: '2023-02-18',
      confidenceScore: 92,
      status: 'pending',
      reasoning: 'Routing Gap Between Denver (2/16) and Chicago (2/20)',
      gapBeforeEvent: 1,
      gapAfterEvent: 2,
      artist: {
        id: 1,
        name: 'The Black Keys',
        genres: ['rock', 'blues'],
        popularity: 85,
        spotifyId: 'spotify-id-1',
        bandsintownId: 'bandsintown-id-1',
        songkickId: 'songkick-id-1',
        imageUrl: null,
        description: null,
        websiteUrl: null,
        socialMediaLinks: null
      },
      venue: {
        id: 1,
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        contactEmail: null,
        contactPhone: null,
        website: null,
        description: null,
        imageUrl: null,
        ownerId: 1
      }
    },
    {
      id: 2,
      artistId: 2,
      venueId: 1,
      suggestedDate: '2023-03-08',
      confidenceScore: 76,
      status: 'pending',
      reasoning: 'Festival Radius - Week after Coachella appearance',
      gapBeforeEvent: 3,
      gapAfterEvent: 4,
      artist: {
        id: 2,
        name: 'Tame Impala',
        genres: ['indie', 'psychedelic'],
        popularity: 88,
        spotifyId: 'spotify-id-2',
        bandsintownId: 'bandsintown-id-2',
        songkickId: 'songkick-id-2',
        imageUrl: null,
        description: null,
        websiteUrl: null,
        socialMediaLinks: null
      },
      venue: {
        id: 1,
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        contactEmail: null,
        contactPhone: null,
        website: null,
        description: null,
        imageUrl: null,
        ownerId: 1
      }
    },
    {
      id: 3,
      artistId: 3,
      venueId: 1,
      suggestedDate: '2023-04-12',
      confidenceScore: 85,
      status: 'pending',
      reasoning: 'New Tour - Supporting new album release',
      gapBeforeEvent: null,
      gapAfterEvent: null,
      artist: {
        id: 3,
        name: 'Khruangbin',
        genres: ['funk', 'world'],
        popularity: 82,
        spotifyId: 'spotify-id-3',
        bandsintownId: 'bandsintown-id-3',
        songkickId: 'songkick-id-3',
        imageUrl: null,
        description: null,
        websiteUrl: null,
        socialMediaLinks: null
      },
      venue: {
        id: 1,
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        contactEmail: null,
        contactPhone: null,
        website: null,
        description: null,
        imageUrl: null,
        ownerId: 1
      }
    }
  ];
};

export const getMockCollaborativeOpportunities = (): CollaborativeOpportunityWithDetails[] => {
  return [
    {
      id: 1,
      artistId: 4,
      creatorVenueId: 1,
      dateRangeStart: '2023-03-15',
      dateRangeEnd: '2023-03-22',
      status: 'pending',
      artist: {
        id: 4,
        name: 'Arcade Fire',
        genres: ['indie', 'rock'],
        popularity: 89,
        spotifyId: 'spotify-id-4',
        bandsintownId: 'bandsintown-id-4',
        songkickId: 'songkick-id-4',
        imageUrl: null,
        description: null,
        websiteUrl: null,
        socialMediaLinks: null
      },
      creatorVenue: {
        id: 1,
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        contactEmail: null,
        contactPhone: null,
        website: null,
        description: null,
        imageUrl: null,
        ownerId: 1
      },
      participants: [
        {
          id: 1,
          venueId: 2,
          status: 'pending',
          proposedDate: '2023-03-16',
          venue: {
            id: 2,
            name: 'The Fillmore',
            address: '456 Fillmore St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94117',
            country: 'USA',
            capacity: 1150,
            latitude: 37.7749,
            longitude: -122.4194,
            contactEmail: null,
            contactPhone: null,
            website: null,
            description: null,
            imageUrl: null,
            ownerId: 2
          }
        },
        {
          id: 2,
          venueId: 3,
          status: 'pending',
          proposedDate: '2023-03-18',
          venue: {
            id: 3,
            name: '9:30 Club',
            address: '815 V St NW',
            city: 'Washington',
            state: 'DC',
            zipCode: '20001',
            country: 'USA',
            capacity: 1200,
            latitude: 38.9172,
            longitude: -77.0250,
            contactEmail: null,
            contactPhone: null,
            website: null,
            description: null,
            imageUrl: null,
            ownerId: 3
          }
        }
      ]
    },
    {
      id: 2,
      artistId: 5,
      creatorVenueId: 1,
      dateRangeStart: '2023-04-05',
      dateRangeEnd: '2023-04-12',
      status: 'ready',
      artist: {
        id: 5,
        name: 'Japanese Breakfast',
        genres: ['indie', 'dream pop'],
        popularity: 78,
        spotifyId: 'spotify-id-5',
        bandsintownId: 'bandsintown-id-5',
        songkickId: 'songkick-id-5',
        imageUrl: null,
        description: null,
        websiteUrl: null,
        socialMediaLinks: null
      },
      creatorVenue: {
        id: 1,
        name: 'The Echo Lounge',
        address: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA',
        capacity: 1000,
        latitude: 39.9612,
        longitude: -82.9988,
        contactEmail: null,
        contactPhone: null,
        website: null,
        description: null,
        imageUrl: null,
        ownerId: 1
      },
      participants: [
        {
          id: 3,
          venueId: 4,
          status: 'accepted',
          proposedDate: '2023-04-07',
          venue: {
            id: 4,
            name: 'The Wiltern',
            address: '3790 Wilshire Blvd',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90010',
            country: 'USA',
            capacity: 1850,
            latitude: 34.0617,
            longitude: -118.3084,
            contactEmail: null,
            contactPhone: null,
            website: null,
            description: null,
            imageUrl: null,
            ownerId: 4
          }
        },
        {
          id: 4,
          venueId: 5,
          status: 'accepted',
          proposedDate: '2023-04-09',
          venue: {
            id: 5,
            name: 'The Independent',
            address: '628 Divisadero St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94117',
            country: 'USA',
            capacity: 500,
            latitude: 37.7775,
            longitude: -122.4383,
            contactEmail: null,
            contactPhone: null,
            website: null,
            description: null,
            imageUrl: null,
            ownerId: 5
          }
        }
      ]
    }
  ];
};

export const getMockStatsData = (): StatsData => {
  return {
    upcomingOpportunities: 42,
    confirmedBookings: 18,
    venueNetworkCount: 8
  };
};

export const getMockVenueNetworkData = (): VenueNetworkData => {
  return {
    nodes: [
      {
        id: 1,
        name: "The Echo Lounge",
        city: "Columbus",
        state: "OH",
        isCurrentVenue: true,
        collaborativeBookings: 12,
        trustScore: 86
      },
      {
        id: 2,
        name: "The Fillmore",
        city: "San Francisco",
        state: "CA",
        isCurrentVenue: false,
        collaborativeBookings: 5,
        trustScore: 78
      },
      {
        id: 3,
        name: "9:30 Club",
        city: "Washington",
        state: "DC",
        isCurrentVenue: false,
        collaborativeBookings: 3,
        trustScore: 82
      },
      {
        id: 4,
        name: "The Wiltern",
        city: "Los Angeles",
        state: "CA",
        isCurrentVenue: false,
        collaborativeBookings: 7,
        trustScore: 90
      },
      {
        id: 5,
        name: "First Avenue",
        city: "Minneapolis",
        state: "MN",
        isCurrentVenue: false,
        collaborativeBookings: 2,
        trustScore: 75
      }
    ],
    links: [
      { source: 1, target: 2, value: 5 },
      { source: 1, target: 3, value: 3 },
      { source: 1, target: 4, value: 7 },
      { source: 1, target: 5, value: 2 },
      { source: 2, target: 4, value: 1 },
      { source: 3, target: 5, value: 1 }
    ]
  };
};

export const getMockTourGroups = () => {
  return [
    {
      id: 1,
      name: "West Coast Summer Tour",
      artistName: "Indie Band",
      genre: "Indie Rock",
      totalShows: 6,
      confirmedShows: 3,
      startDate: "2023-08-15",
      endDate: "2023-08-25",
      region: "West Coast",
      events: [
        {
          id: 1,
          artist: "Indie Band",
          venue: "The Fox Theater",
          city: "Oakland",
          date: "2023-08-15",
          time: "20:00",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 37.8136,
          longitude: -122.2686
        },
        {
          id: 2,
          artist: "Indie Band",
          venue: "The Wiltern",
          city: "Los Angeles",
          date: "2023-08-18",
          time: "19:30",
          isCurrentVenue: false,
          isRoutingOpportunity: true,
          latitude: 34.0628,
          longitude: -118.3093
        },
        {
          id: 3,
          artist: "Indie Band",
          venue: "The Fillmore",
          city: "San Francisco",
          date: "2023-08-20",
          time: "20:00",
          isCurrentVenue: true,
          isRoutingOpportunity: false,
          latitude: 37.7841,
          longitude: -122.4331
        },
        {
          id: 4,
          artist: "Indie Band",
          venue: "The Showbox",
          city: "Seattle",
          date: "2023-08-25",
          time: "21:00",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 47.6086,
          longitude: -122.3394
        }
      ]
    },
    {
      id: 2,
      name: "East Coast Fall Tour",
      artistName: "Electronic Duo",
      genre: "Electronic",
      totalShows: 5,
      confirmedShows: 4,
      startDate: "2023-09-10",
      endDate: "2023-09-22",
      region: "East Coast",
      events: [
        {
          id: 5,
          artist: "Electronic Duo",
          venue: "Paradise Rock Club",
          city: "Boston",
          date: "2023-09-10",
          time: "20:30",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 42.3487,
          longitude: -71.1198
        },
        {
          id: 6,
          artist: "Electronic Duo",
          venue: "Brooklyn Steel",
          city: "New York",
          date: "2023-09-12",
          time: "21:00",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 40.7282,
          longitude: -73.9442
        },
        {
          id: 7,
          artist: "Electronic Duo",
          venue: "Union Transfer",
          city: "Philadelphia",
          date: "2023-09-15",
          time: "19:00",
          isCurrentVenue: true,
          isRoutingOpportunity: false,
          latitude: 39.9613,
          longitude: -75.1465
        },
        {
          id: 8,
          artist: "Electronic Duo",
          venue: "9:30 Club",
          city: "Washington DC",
          date: "2023-09-18",
          time: "20:00",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 38.9181,
          longitude: -77.0254
        },
        {
          id: 9,
          artist: "Electronic Duo",
          venue: "The Orange Peel",
          city: "Asheville",
          date: "2023-09-22",
          time: "20:00",
          isCurrentVenue: false,
          isRoutingOpportunity: true,
          latitude: 35.5933,
          longitude: -82.5548
        }
      ]
    },
    {
      id: 3,
      name: "Midwest Winter Tour",
      artistName: "Folk Collective",
      genre: "Folk",
      totalShows: 4,
      confirmedShows: 2,
      startDate: "2023-11-05",
      endDate: "2023-11-15",
      region: "Midwest",
      events: [
        {
          id: 10,
          artist: "Folk Collective",
          venue: "The Vic Theatre",
          city: "Chicago",
          date: "2023-11-05",
          time: "19:30",
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          latitude: 41.9397,
          longitude: -87.6530
        },
        {
          id: 11,
          artist: "Folk Collective",
          venue: "First Avenue",
          city: "Minneapolis",
          date: "2023-11-08",
          time: "20:00",
          isCurrentVenue: false,
          isRoutingOpportunity: true,
          latitude: 44.9781,
          longitude: -93.2763
        },
        {
          id: 12,
          artist: "Folk Collective",
          venue: "The Pageant",
          city: "St. Louis",
          date: "2023-11-12",
          time: "19:00",
          isCurrentVenue: true,
          isRoutingOpportunity: false,
          latitude: 38.6557,
          longitude: -90.3003
        },
        {
          id: 13,
          artist: "Folk Collective",
          venue: "Newport Music Hall",
          city: "Columbus",
          date: "2023-11-15",
          time: "19:30",
          isCurrentVenue: false,
          isRoutingOpportunity: true,
          latitude: 39.9956,
          longitude: -83.0079
        }
      ]
    }
  ];
};

export const getMockEventMapData = (): MapEvent[] => {
  return [
    // Current venue
    {
      id: 1,
      latitude: 39.9612,
      longitude: -82.9988,
      artist: "The Black Keys",
      venue: "The Echo Lounge (Your Venue)",
      date: "2023-05-18",
      isCurrentVenue: true,
      isRoutingOpportunity: false
    },
    
    // Confirmed shows on The Black Keys tour (chronological order)
    {
      id: 2,
      latitude: 36.1627,
      longitude: -86.7816,
      artist: "The Black Keys",
      venue: "Bridgestone Arena",
      date: "2023-05-12",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 3,
      latitude: 39.7392,
      longitude: -104.9903,
      artist: "The Black Keys",
      venue: "Fillmore Auditorium",
      date: "2023-05-16",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 4,
      latitude: 41.8781,
      longitude: -87.6298,
      artist: "The Black Keys",
      venue: "Aragon Ballroom",
      date: "2023-05-20",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 5,
      latitude: 42.3314,
      longitude: -83.0458,
      artist: "The Black Keys",
      venue: "The Fillmore Detroit",
      date: "2023-05-22",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    
    // Routing opportunities (venues that could fit in the tour)
    {
      id: 6,
      latitude: 40.4406,
      longitude: -79.9959,
      artist: "The Black Keys",
      venue: "Stage AE",
      date: "2023-05-23",
      isCurrentVenue: false,
      isRoutingOpportunity: true
    },
    {
      id: 7,
      latitude: 38.9072,
      longitude: -77.0369,
      artist: "The Black Keys",
      venue: "9:30 Club",
      date: "2023-05-25",
      isCurrentVenue: false,
      isRoutingOpportunity: true
    },
    {
      id: 8,
      latitude: 40.7128,
      longitude: -74.0060,
      artist: "The Black Keys",
      venue: "Bowery Ballroom",
      date: "2023-05-27",
      isCurrentVenue: false,
      isRoutingOpportunity: true
    },
    
    // Another artist with routing opportunities
    {
      id: 9,
      latitude: 34.0522,
      longitude: -118.2437,
      artist: "Khruangbin",
      venue: "Hollywood Bowl",
      date: "2023-06-10",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 10,
      latitude: 37.7749,
      longitude: -122.4194,
      artist: "Khruangbin",
      venue: "The Fillmore SF",
      date: "2023-06-12",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 11,
      latitude: 45.5051,
      longitude: -122.6750,
      artist: "Khruangbin",
      venue: "Crystal Ballroom",
      date: "2023-06-14",
      isCurrentVenue: false,
      isRoutingOpportunity: false
    },
    {
      id: 12,
      latitude: 39.9612,
      longitude: -82.9988,
      artist: "Khruangbin",
      venue: "The Echo Lounge (Your Venue)",
      date: "2023-06-20",
      isCurrentVenue: true,
      isRoutingOpportunity: false
    }
  ];
};
