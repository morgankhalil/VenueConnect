import { NetworkAgent } from "@shared/schema";
import { Venue } from "./index";

export type AgentType = "booking" | "network_growth" | "opportunity";

export interface NetworkAgentWithVenue extends NetworkAgent {
  venue: Venue;
}

// Booking Agent specific types
export interface BookingAgentConfig {
  maxLookAheadDays: number;
  minVenueSize: number;
  priorityGenres: string[];
  excludeGenres: string[];
  preferredDayOfWeek: number[]; // 0-6, where 0 is Sunday
  targetCapacityRange: {
    min: number;
    max: number;
  };
}

// Network Growth Agent specific types
export interface NetworkGrowthAgentConfig {
  maxDistance: number; // in miles
  minTrustScore: number;
  preferredRegions: string[];
  venueTypes: string[];
  excludeCompetitors: boolean;
}

// Opportunity Agent specific types
export interface OpportunityAgentConfig {
  lookAheadDays: number;
  genreFocus: string[];
  minConfidenceScore: number;
  routingRadius: number; // in miles
  notifyVenues: boolean;
}

export type AgentResult = {
  id: number;
  agentId: number;
  timestamp: string;
  resultType: 'opportunity' | 'connection' | 'routing';
  data: any;
  appliedCount: number;
  status: 'pending' | 'accepted' | 'declined';
};

export type AgentConfig = BookingAgentConfig | NetworkGrowthAgentConfig | OpportunityAgentConfig;

// Helper functions for type checking
export function isBookingAgentConfig(config: any): config is BookingAgentConfig {
  return config && 
    typeof config.maxLookAheadDays === 'number' && 
    typeof config.minVenueSize === 'number' &&
    Array.isArray(config.priorityGenres);
}

export function isNetworkGrowthAgentConfig(config: any): config is NetworkGrowthAgentConfig {
  return config && 
    typeof config.maxDistance === 'number' && 
    typeof config.minTrustScore === 'number' &&
    Array.isArray(config.preferredRegions);
}

export function isOpportunityAgentConfig(config: any): config is OpportunityAgentConfig {
  return config && 
    typeof config.lookAheadDays === 'number' && 
    Array.isArray(config.genreFocus) &&
    typeof config.minConfidenceScore === 'number';
}