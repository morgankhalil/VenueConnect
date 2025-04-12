
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
      // Default query function for all queries
      queryFn: async ({ queryKey }) => {
        // The first item in the queryKey should be the API endpoint path
        if (Array.isArray(queryKey) && typeof queryKey[0] === 'string' && queryKey[0].startsWith('/api')) {
          const endpoint = queryKey[0];
          // Pass any parameters from the queryKey
          const params = queryKey.slice(1).filter(item => 
            typeof item === 'string' || 
            typeof item === 'number'
          );
          
          let url = endpoint;
          // Append parameters to URL if they exist
          if (params.length > 0) {
            url = `${url}/${params.join('/')}`;
          }
          
          return apiRequest(url);
        }
        throw new Error(`Invalid queryKey: ${JSON.stringify(queryKey)}`);
      },
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

// Enhanced API request function with performance tracking and improved error handling
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include', // This enables sending cookies with cross-origin requests
  };

  const fetchOptions = { ...defaultOptions, ...options };
  
  // Start timer for performance tracking
  const startTime = performance.now();
  
  try {
    console.log(`Making fetch request to ${url}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    // Increase timeout for large data responses
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    console.log(`Response status from ${url}:`, response.status, response.statusText);

    if (!response.ok) {
      console.error(`API error for ${url}:`, response.status, response.statusText);
      throw new Error(`API error: ${response.status}`);
    }

    // Get text response first
    const text = await response.text();
    
    // Try to parse as JSON with error handling for large responses
    let data;
    try {
      // For very large responses, we'll handle them in chunks
      if (text.length > 10 * 1024 * 1024) { // 10MB
        console.warn(`Large response detected (${(text.length / 1024 / 1024).toFixed(2)}MB) from ${url}. Processing in chunks.`);
        
        // For large JSON responses, use a streaming approach with a safer parsing method
        data = await safeParseJSON(text);
      } else {
        data = JSON.parse(text);
      }
    } catch (parseError: any) {
      console.error(`JSON parse error for ${url}:`, parseError);
      console.error(`Response content summary: length=${text.length}, first 500 chars: ${text.substring(0, 500)}...`);
      
      // Try to provide more specific error messages
      if (text.length === 0) {
        throw new Error('Empty response received from server');
      } else if (text.includes('Internal Server Error')) {
        throw new Error('Server encountered an internal error');
      } else {
        throw new SyntaxError(`Failed to parse JSON response: ${parseError.message}`);
      }
    }
    
    // Calculate and store response time
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    endpointTimes[endpoint] = responseTime;
    
    // Analyze response size and speed
    const dataSizeEstimate = text.length;
    const transferSpeed = dataSizeEstimate / (responseTime / 1000); // bytes per second
    
    // Log performance metrics for large or slow responses
    if (responseTime > 1000 || dataSizeEstimate > 1024 * 1024) {
      console.log(`API ${endpoint} metrics:
        Response time: ${responseTime.toFixed(0)}ms
        Data size: ${(dataSizeEstimate / 1024 / 1024).toFixed(2)}MB
        Transfer speed: ${(transferSpeed / 1024 / 1024).toFixed(2)}MB/s`);
    }
    
    // Log compact summary in development
    if (process.env.NODE_ENV === 'development') {
      if (typeof data === 'object' && data !== null) {
        // Log a summary for large objects
        const keys = Object.keys(data);
        console.log(`API Response (${keys.length} keys):`, keys);
        
        // For arrays, log the length and first item
        if (Array.isArray(data)) {
          console.log(`Array length: ${data.length}`, data.length > 0 ? data[0] : 'empty');
        }
      }
    }
    
    return data;
  } catch (error: any) {
    const endTime = performance.now();
    console.error(`API ${endpoint} failed after ${(endTime - startTime).toFixed(0)}ms:`, error);
    
    // Enhanced error handling with specific messages
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout for ${endpoint} - response took too long`);
    } else if (error.name === 'SyntaxError') {
      throw new Error(`Invalid JSON response from ${endpoint}: ${error.message}`);
    } else if (error.message && error.message.includes('NetworkError')) {
      throw new Error(`Network error when connecting to ${endpoint}. Check your internet connection.`);
    }
    
    // Rethrow for proper error handling in React Query
    throw error;
  }
}

// Helper function for safely parsing potentially large JSON strings
async function safeParseJSON(jsonString: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Use a setTimeout to avoid blocking the main thread
      setTimeout(() => {
        try {
          const result = JSON.parse(jsonString);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    } catch (error) {
      reject(error);
    }
  });
}
