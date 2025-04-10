
import { QueryClient } from '@tanstack/react-query';

// Configure base API URL 
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : `${window.location.origin}`;

// Cache response times to detect slow endpoints
const endpointTimes: Record<string, number> = {};

// Create a new query client that ignores previous cache
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Force fresh data fetching
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      gcTime: 1000 * 60 * 10, // Shorter cache time (10 minutes)
      // Add a timestamp to queryKey to force cache invalidation on reload 
      queryKeyHashFn: (queryKey: any) => {
        // Force a cache reset by appending current timestamp
        const timestamp = Date.now();
        return JSON.stringify([...queryKey, { cacheBuster: timestamp }]);
      }
    },
    mutations: {
      retry: 1,
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
