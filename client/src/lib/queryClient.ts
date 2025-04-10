
import { QueryClient } from '@tanstack/react-query';

// Configure base API URL 
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : `${window.location.origin}`;

// Cache response times to detect slow endpoints
const endpointTimes: Record<string, number> = {};

// Create optimized query client with better defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch when window regains focus by default
      refetchOnReconnect: true, // Refetch when connection is restored
      gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Enhanced API request function with performance tracking
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  const fetchOptions = { ...defaultOptions, ...options };
  
  // Start timer for performance tracking
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Parse response
    const data = await response.json();
    
    // Calculate and store response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    endpointTimes[endpoint] = responseTime;
    
    // Only log in development or if response is slow
    if (process.env.NODE_ENV === 'development' || responseTime > 1000) {
      console.log(`API ${endpoint} response time: ${responseTime.toFixed(0)}ms`);
      
      // Only log full response in development to avoid excessive logging
      if (process.env.NODE_ENV === 'development') {
        console.log('API Response:', JSON.stringify(data, null, 2));
      }
    }
    
    return data;
  } catch (error) {
    const endTime = performance.now();
    console.error(`API ${endpoint} failed after ${(endTime - startTime).toFixed(0)}ms:`, error);
    
    // Rethrow for proper error handling in React Query
    throw error;
  }
}
