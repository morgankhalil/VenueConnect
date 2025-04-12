import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useOptimizeTour() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  const optimizeTour = async (tourId: number, options: {
    optimizeRouteOrder?: boolean;
    optimizeDates?: boolean;
    includeFixedVenues?: boolean;
    useAi?: boolean;
    modelType?: string;
  } = {}) => {
    setIsOptimizing(true);
    setOptimizationError(null);
    
    const defaultOptions = {
      optimizeRouteOrder: true,
      optimizeDates: true,
      includeFixedVenues: false,
      useAi: false,
      modelType: 'gpt-3.5-turbo'
    };
    
    const optimizationOptions = { ...defaultOptions, ...options };
    
    try {
      // Call the API to optimize the tour
      const response = await apiRequest(`/api/tours/${tourId}/optimize`, {
        method: 'POST',
        body: JSON.stringify(optimizationOptions),
      });
      
      setOptimizationResults(response);
      toast({
        title: "Tour optimization completed",
        description: "Your tour has been successfully optimized",
      });
      
      return response;
    } catch (error: any) {
      console.error('Tour optimization error:', error);
      
      setOptimizationError(
        error.message || 'An error occurred during tour optimization'
      );
      
      toast({
        title: "Optimization failed",
        description: error.message || 'Failed to optimize tour. Please try again.',
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const applyOptimization = async (tourId: number, optimizationId: number) => {
    setIsOptimizing(true);
    
    try {
      // Call the API to apply the optimization
      const response = await apiRequest(`/api/tours/${tourId}/optimize/${optimizationId}/apply`, {
        method: 'POST',
      });
      
      toast({
        title: "Optimization applied",
        description: "The optimized route has been applied to your tour",
      });
      
      return response;
    } catch (error: any) {
      console.error('Apply optimization error:', error);
      
      toast({
        title: "Failed to apply optimization",
        description: error.message || 'An error occurred while applying the optimization',
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const clearOptimizationResults = () => {
    setOptimizationResults(null);
    setOptimizationError(null);
  };

  return {
    optimizeTour,
    applyOptimization,
    clearOptimizationResults,
    isOptimizing,
    optimizationResults,
    optimizationError,
  };
}