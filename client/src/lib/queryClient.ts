
import { QueryClient } from '@tanstack/react-query';

// Configure base API URL 
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : `${window.location.origin}`;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

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
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  // Parse JSON response
  try {
    return await response.json();
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    return { success: false, message: 'Invalid response format' };
  }
}
