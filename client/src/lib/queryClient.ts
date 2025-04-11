
import { QueryClient } from '@tanstack/react-query';

// Configure base API URL 
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : `${window.location.origin}`;

// Cache response times to detect slow endpoints
const endpointTimes: Record<string, number> = {};

// Create a new query client that balances fresh data with performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // Consider data fresh for 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      gcTime: 1000 * 60 * 10, // Cache for 10 minutes
      // Add a one-time cache buster that doesn't change during a session
      queryKeyHashFn: (queryKey: any) => {
        // Special case for user data - use fixed key to prevent multiple calls
        if (Array.isArray(queryKey) && queryKey[0] === '/api/users/me') {
          return JSON.stringify(queryKey);
        }
        
        // For other queries, create a session-based cache buster
        // This uses a timestamp that's fixed for the session but changes on refresh
        const sessionTimestamp = window.sessionStorage.getItem('cacheBuster') || 
                                 String(Date.now());
        
        // Store timestamp in session storage if not already there
        if (!window.sessionStorage.getItem('cacheBuster')) {
          window.sessionStorage.setItem('cacheBuster', sessionTimestamp);
        }
        
        return JSON.stringify([...queryKey, { sessionBuster: sessionTimestamp }]);
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
    credentials: 'include', // This enables sending cookies with cross-origin requests
  };

  const fetchOptions = { ...defaultOptions, ...options };
  
  // Start timer for performance tracking
  const startTime = performance.now();
  
  try {
    console.log(`Making fetch request to ${url} with options:`, fetchOptions);
    const response = await fetch(url, fetchOptions);
    console.log(`Response status from ${url}:`, response.status, response.statusText);

    if (!response.ok) {
      console.error(`API error for ${url}:`, response.status, response.statusText);
      throw new Error(`API error: ${response.status}`);
    }

    // Parse response
    const data = await response.json();
    console.log(`Parsed response data from ${url}:`, data);
    
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
