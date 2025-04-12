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
}

export const useUnifiedOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const { toast } = useToast();

  /**
   * Optimize a tour route using the unified optimizer
   * This uses a combination of standard optimization algorithms and AI assistance
   */
  const optimizeTour = async (tourId: number) => {
    setIsOptimizing(true);
    
    try {
      const result = await getUnifiedOptimization(tourId, 'auto');
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
   */
  const applyOptimization = async (tourId: number) => {
    setIsApplying(true);
    
    try {
      if (!optimizationResult) {
        throw new Error('No optimization result to apply');
      }
      
      const result = await applyUnifiedOptimization(
        tourId, 
        optimizationResult.optimizedSequence, 
        optimizationResult.suggestedDates
      );
      
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

  return {
    optimizeTour,
    applyOptimization,
    isOptimizing,
    isApplying,
    optimizationResult,
  };
};