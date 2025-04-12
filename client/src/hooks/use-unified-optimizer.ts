import { useState } from 'react';
import { getUnifiedOptimization, applyUnifiedOptimization } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface OptimizationResult {
  optimizedSequence: number[];
  suggestedDates: Record<string, string>;
  recommendedVenues: number[];
  suggestedSkips: number[];
  estimatedDistanceReduction: string;
  estimatedTimeSavings: string;
  reasoning: string;
  dateConflicts?: Array<{
    venueId: number;
    conflictWith: number;
    suggestedAlternativeDate?: string;
  }>;
}

export interface OptimizationOptions {
  // Venue prioritization options
  venuePriorities?: Record<number, number>; // venueId -> priority (1-10, 10 being highest)
  
  // Fixed points handling
  respectFixedDates?: boolean; // Always respect fixed dates (default: true)
  
  // Distance vs time optimization preference
  optimizeFor?: 'distance' | 'time' | 'balanced';
  
  // Scheduling options
  preferredDates?: Record<number, string>; // venueId -> preferred date
  avoidDates?: string[]; // Dates to avoid (YYYY-MM-DD)
  minDaysBetweenShows?: number; // Minimum days between shows
  maxDaysBetweenShows?: number; // Maximum days between shows
  
  // Method options
  method?: 'standard' | 'ai' | 'auto';
}

export const useUnifiedOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [dateConflicts, setDateConflicts] = useState<OptimizationResult['dateConflicts']>([]);
  const { toast } = useToast();

  /**
   * Optimize a tour route using the unified optimizer
   * This uses a combination of standard optimization algorithms and AI assistance
   * 
   * @param tourId The ID of the tour to optimize
   * @param options Advanced optimization options
   */
  const optimizeTour = async (tourId: number, options: OptimizationOptions = {}) => {
    setIsOptimizing(true);
    
    try {
      // Set defaults for optimization options
      const optimizationOptions: OptimizationOptions = {
        method: 'auto',
        respectFixedDates: true,
        optimizeFor: 'balanced',
        ...options
      };
      
      const result = await getUnifiedOptimization(tourId, optimizationOptions);
      
      // Check for date conflicts and store them separately
      if (result.dateConflicts && result.dateConflicts.length > 0) {
        setDateConflicts(result.dateConflicts);
      } else {
        setDateConflicts([]);
      }
      
      setOptimizationResult(result);
      return result;
    } catch (error) {
      console.error('Error optimizing tour:', error);
      toast({
        variant: "destructive",
        title: "Optimization failed",
        description: "Could not optimize your tour route. Please try again.",
      });
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * Apply the optimized tour route to the tour
   * 
   * @param tourId The ID of the tour to update
   * @param resolvedConflicts Optional fixes for date conflicts
   */
  const applyOptimization = async (
    tourId: number, 
    resolvedConflicts?: Record<number, string> // venueId -> resolved date
  ) => {
    setIsApplying(true);
    
    try {
      if (!optimizationResult) {
        throw new Error('No optimization result to apply');
      }
      
      // Merge original suggested dates with any resolved conflicts
      const mergedDates = {
        ...optimizationResult.suggestedDates,
        ...(resolvedConflicts || {})
      };
      
      const result = await applyUnifiedOptimization(
        tourId, 
        optimizationResult.optimizedSequence, 
        mergedDates
      );
      
      // Clear conflicts after successful application
      setDateConflicts([]);
      
      return result;
    } catch (error) {
      console.error('Error applying optimization:', error);
      toast({
        variant: "destructive",
        title: "Failed to apply optimization",
        description: "Could not apply the optimized route. Please try again.",
      });
      throw error;
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Check if there are any date conflicts in the optimization result
   */
  const hasDateConflicts = () => {
    return dateConflicts && dateConflicts.length > 0;
  };

  return {
    optimizeTour,
    applyOptimization,
    isOptimizing,
    isApplying,
    optimizationResult,
    dateConflicts,
    hasDateConflicts,
  };
};