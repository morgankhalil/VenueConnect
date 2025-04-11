import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { User, hasPermission, Permission } from '@/lib/permissions';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  currentVenueId: number | null;
  switchVenue: (venueId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function for API requests
const apiCall = async (url: string, options: { method: string; data?: any }) => {
  try {
    const { method, data } = options;
    const response = method === 'GET' 
      ? await axios.get(url)
      : await axios.post(url, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'API request failed');
    }
    throw error;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [currentVenueId, setCurrentVenueId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Get current user information
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ['/api/users/me'],
    retry: false,
    initialData: null,
  });
  
  // Set the current venue ID when user data is loaded
  useEffect(() => {
    if (user && user.venueId) {
      setCurrentVenueId(user.venueId);
    }
  }, [user]);
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return apiCall('/api/auth', {
        method: 'POST',
        data: credentials,
      });
    },
    onSuccess: () => {
      refetch(); // Refetch user data after successful login
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
      setLocation('/dashboard'); // Redirect to dashboard
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Calling logout API endpoint");
      const result = await apiCall('/api/auth/logout', {
        method: 'POST',
      });
      console.log("Logout API response:", result);
      return result;
    },
    onSuccess: () => {
      console.log("Logout successful, updating client state");
      // Set local user state to null immediately
      queryClient.setQueryData(['/api/users/me'], null);
      
      // Show success message
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      
      // Force redirect to login page
      console.log("Redirecting to login page");
      setLocation('/auth/login');
      
      // Wait a moment and then refetch to ensure we've got the latest state
      setTimeout(() => {
        refetch();
      }, 100);
    },
    onError: (error) => {
      console.error("Logout error:", error);
      toast({
        title: 'Error',
        description: 'Failed to logout. Redirecting to login page...',
        variant: 'destructive',
      });
      
      // Even on error, redirect to login page
      setTimeout(() => {
        setLocation('/auth/login');
      }, 500);
    },
  });
  
  // Switch venue mutation
  const switchVenueMutation = useMutation({
    mutationFn: async (venueId: number) => {
      return apiCall(`/api/venues/select/${venueId}`, {
        method: 'GET',
      });
    },
    onSuccess: (data) => {
      refetch();
      if (data.user && data.user.venueId) {
        setCurrentVenueId(data.user.venueId);
        toast({
          title: 'Venue Changed',
          description: data.message || `Now viewing venue ID: ${data.user.venueId}`,
        });
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to switch venue',
        variant: 'destructive',
      });
    },
  });
  
  // Login handler
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };
  
  // Logout handler
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  // Switch venue handler
  const switchVenue = async (venueId: number) => {
    await switchVenueMutation.mutateAsync(venueId);
  };
  
  // Check if the user has a specific permission
  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(user, permission);
  };
  
  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission: checkPermission,
    currentVenueId,
    switchVenue,
  };
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}