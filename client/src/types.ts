// Global type definitions

export interface MapEvent {
  id: number;
  venue: string;
  artist?: string;
  date?: string;
  latitude: number;
  longitude: number;
  isCurrentVenue?: boolean;
  isRoutingOpportunity?: boolean;
  status: string;
  venue_id?: number;
  sequence?: number;
}

export interface OptimizationVenue {
  id: number;
  latitude: number;
  longitude: number;
  date?: string | null;
  isFixed?: boolean;
  status?: string | null;
  venue?: {
    id: number;
    name: string;
    city: string;
    region?: string | null;
    country?: string | null;
  };
}