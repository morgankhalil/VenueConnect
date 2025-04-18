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
  city?: string;
  notes?: string;
}

export interface TourGroup {
  id: number;
  name: string;
  artistName: string;
  region: string;
  events: MapEvent[];
  optimizationScore?: number;
  initialOptimizationScore?: number;
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