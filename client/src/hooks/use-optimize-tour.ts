import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook for optimizing a tour
 * @param tourId ID of the tour to optimize
 * @returns Mutation function and status
 */
export function useOptimizeTour(tourId: number) {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/tours/${tourId}/optimize`, {
        method: 'POST',
      });
      return response;
    },
  });
}