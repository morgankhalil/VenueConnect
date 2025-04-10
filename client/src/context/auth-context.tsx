import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { User, hasPermission, Permission } from '@/lib/permissions';
import { apiRequest } from '@/lib/queryClient';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [currentVenueId, setCurrentVenueId] = useState<number | null>(null);
  
  // Get current user information
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: false,
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
      return apiRequest('/api/auth/login', {
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
      return apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      setLocation('/login');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    },
  });
  
  // Switch venue mutation
  const switchVenueMutation = useMutation({
    mutationFn: async (venueId: number) => {
      return apiRequest(`/api/select-venue/${venueId}`, {
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
  
  const value = {
    user,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission: checkPermission,
    currentVenueId,
    switchVenue,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}