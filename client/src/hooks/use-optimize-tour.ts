import { useState } from 'react';
import { apiRequest } from '@/lib/api';

// Standard optimization options
interface StandardOptimizationOptions {
  prioritizeDistance: boolean;
  distanceWeight: number;
}

// AI optimization options
interface AIOptimizationOptions {
  optimizeForCapacity: boolean;
  respectGenre: boolean;
  includeMarketConsiderations: boolean;
}

// Types of optimization to run
type OptimizationType = 'standard' | 'ai';

// Combined optimization request
interface OptimizationRequest {
  type: OptimizationType;
  options: StandardOptimizationOptions | AIOptimizationOptions;
}

// Optimization result type
interface OptimizationResult {
  tourId: number;
  optimizationScore: number;
  totalDistance: number;
  totalTravelTime: number;
  fixedPoints?: any[];
  potentialFillVenues?: any[];
  gaps?: any[];
  recommendations?: string[];
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
      let endpoint = '';
      let requestBody = {};
      
      // Determine which endpoint to use based on optimization type
      if (request.type === 'standard') {
        endpoint = `/api/tours/${tourId}/optimize`;
        const options = request.options as StandardOptimizationOptions;
        requestBody = {
          optimizeRouteOrder: true,
          optimizeDates: true,
          distanceWeight: options.prioritizeDistance ? options.distanceWeight : 0.3,
        };
      } else {
        endpoint = `/api/unified-optimizer/optimize/${tourId}`;
        const options = request.options as AIOptimizationOptions;
        requestBody = {
          optimizeForCapacity: options.optimizeForCapacity,
          respectGenre: options.respectGenre,
          considerMarketTiming: options.includeMarketConsiderations,
          useAi: true,
          modelType: 'gpt-4',
        };
      }
      
      // Make the API request
      const result = await apiRequest.post(endpoint, requestBody);
      
      // Process the result
      setOptimizationResult(result.data);
      setIsOptimizing(false);
      
      return result.data;
    } catch (err: any) {
      console.error('Optimization failed:', err);
      setError(err?.response?.data?.message || err.message || 'An error occurred during optimization');
      setIsOptimizing(false);
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
    isOptimizing,
    error,
    optimizationResult,
    resetOptimization,
  };
}