import { useState } from 'react';
import { apiRequest, optimizeTourRoute, getUnifiedOptimization } from '@/lib/api';

// Standard optimization options
export interface StandardOptimizationOptions {
  prioritizeDistance: boolean;
  distanceWeight: number;
  preserveConfirmedDates?: boolean;
  optimizeFor?: 'distance' | 'time' | 'balanced';
  preferredDates?: string[];
}

// AI optimization options
export interface AIOptimizationOptions {
  optimizeForCapacity: boolean;
  respectGenre: boolean;
  includeMarketConsiderations: boolean;
  preserveConfirmedDates?: boolean;
}

// Types of optimization to run
export type OptimizationType = 'standard' | 'ai';

// Combined optimization request
export interface OptimizationRequest {
  type: OptimizationType;
  options: StandardOptimizationOptions | AIOptimizationOptions;
}

// Venue point in the optimization result
export interface VenuePoint {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  date?: string | null;
  status?: string;
  capacity?: number;
  isFixed?: boolean;
}

// Gap in the optimization result
export interface OptimizationGap {
  startVenueId: number;
  endVenueId: number;
  distanceKm: number;
  travelTimeMinutes: number;
  suggestedVenues?: VenuePoint[];
}

// Optimization result type
export interface OptimizationResult {
  tourId: number;
  optimizationScore: number;
  totalDistance: number;
  totalTravelTime: number;
  fixedPoints?: VenuePoint[];
  potentialFillVenues?: VenuePoint[];
  gaps?: OptimizationGap[];
  recommendations?: string[];
  optimizedSequence?: number[];
  suggestedDates?: Record<string, string>;
}

export function useOptimizeTour(tourId: number) {
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  
  // Function to optimize the tour route
  const optimize = async (request: OptimizationRequest): Promise<OptimizationResult | null> => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      let result;
      
      // Determine which optimization method to use
      if (request.type === 'standard') {
        const options = request.options as StandardOptimizationOptions;
        const requestBody = {
          optimizeRouteOrder: true,
          optimizeDates: true,
          distanceWeight: options.prioritizeDistance ? options.distanceWeight : 0.3,
          preserveConfirmedDates: options.preserveConfirmedDates || false,
          optimizeFor: options.optimizeFor || 'balanced',
          preferredDates: options.preferredDates || []
        };
        
        result = await optimizeTourRoute(tourId, requestBody);
      } else {
        // AI-based optimization
        const options = request.options as AIOptimizationOptions;
        const requestBody = {
          method: 'ai',
          optimizeForCapacity: options.optimizeForCapacity,
          respectGenre: options.respectGenre,
          considerMarketTiming: options.includeMarketConsiderations,
          preserveConfirmedDates: options.preserveConfirmedDates || false
        };
        
        result = await getUnifiedOptimization(tourId, 'ai');
      }
      
      // Process the result
      setOptimizationResult(result);
      setIsOptimizing(false);
      
      return result;
    } catch (err: any) {
      console.error('Optimization failed:', err);
      setError(err.message || 'An error occurred during optimization');
      setIsOptimizing(false);
      return null;
    }
  };

  // Apply the optimization to the tour
  const applyOptimization = async (optimizedSequence: number[], suggestedDates: Record<string, string> = {}) => {
    if (!optimizationResult) {
      setError('No optimization result to apply');
      return null;
    }

    try {
      const result = await apiRequest.post(`/api/tours/${tourId}/apply-optimization`, {
        optimizedSequence,
        suggestedDates
      });
      return result;
    } catch (err: any) {
      console.error('Failed to apply optimization:', err);
      setError(err.message || 'Failed to apply optimization');
      return null;
    }
  };
  
  // Reset optimization state
  const resetOptimization = () => {
    setOptimizationResult(null);
    setError(null);
  };
  
  return {
    optimize,
    applyOptimization,
    isOptimizing,
    error,
    optimizationResult,
    resetOptimization,
  };
}