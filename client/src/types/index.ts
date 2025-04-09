export interface User {
  id: number;
  username: string;
  name: string | null;
  email: string;
  role: string;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  capacity: number;
  latitude: number | null;
  longitude: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  description: string | null;
  imageUrl: string | null;
  ownerId: number | null;
}

export interface Artist {
  id: number;
  name: string;
  genres: string[] | null;
  popularity: number | null;
  spotifyId: string | null;
  bandsintownId: string | null;
  songkickId: string | null;
  imageUrl: string | null;
  description: string | null;
  websiteUrl: string | null;
  socialMediaLinks: Record<string, string> | null;
}

export interface Event {
  id: number;
  artistId: number;
  venueId: number;
  date: string;
  startTime: string | null;
  ticketUrl: string | null;
  status: string;
  sourceId: string | null;
  sourceName: string | null;
}

export interface VenueNetwork {
  id: number;
  venueId: number;
  connectedVenueId: number;
  status: string;
  trustScore: number;
  collaborativeBookings: number;
}

export interface Prediction {
  id: number;
  artistId: number;
  venueId: number;
  suggestedDate: string;
  confidenceScore: number;
  status: string;
  reasoning: string | null;
  gapBeforeEvent: number | null;
  gapAfterEvent: number | null;
}

export interface PredictionWithDetails extends Prediction {
  artist: Artist;
  venue: Venue;
}

export interface Inquiry {
  id: number;
  venueId: number;
  artistId: number;
  message: string;
  proposedDate: string | null;
  status: string;
  collaborators: number[] | null;
}

export interface CollaborativeOpportunity {
  id: number;
  artistId: number;
  creatorVenueId: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: string;
}

export interface CollaborativeOpportunityWithDetails extends CollaborativeOpportunity {
  artist: Artist;
  creatorVenue: Venue;
  participants: Array<{
    id: number;
    venueId: number;
    status: string;
    proposedDate: string | null;
    venue: Venue;
  }>;
}

export interface StatsData {
  upcomingOpportunities: number;
  confirmedBookings: number;
  venueNetworkCount: number;
}

export interface MapEvent {
  id: number;
  latitude: number;
  longitude: number;
  artist: string;
  venue: string;
  date: string;
  isCurrentVenue: boolean;
  isRoutingOpportunity: boolean;
}

export interface VenueNetworkData {
  nodes: Array<{
    id: number;
    name: string;
    city: string;
    state: string;
    isCurrentVenue: boolean;
    collaborativeBookings: number;
    trustScore: number;
  }>;
  links: Array<{
    source: number;
    target: number;
    value: number;
  }>;
}
