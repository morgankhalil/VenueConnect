import { QueryClient } from '@tanstack/react-query';

// Configure base API URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-fastapi-backend.com' // Replace with your actual API domain
  : window.location.protocol === 'https:' 
    ? `${window.location.origin}/api` 
    : `http://0.0.0.0:5000`; // Use port 5000 for local development


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export async function apiRequest(
  method: string,
  path: string,
  body?: any
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response;
}