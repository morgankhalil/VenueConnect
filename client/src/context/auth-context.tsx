import React, { createContext, useContext } from 'react';

// Mock user data for the demo
const mockUser = {
  id: 1,
  username: 'demo',
  name: 'Demo User',
  email: 'demo@example.com',
  role: 'admin',
  permissions: ['view_tours', 'edit_tours', 'create_tours', 'delete_tours', 'view_venues', 'edit_venues']
};

// Define a simplified version of the auth context
interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  currentVenueId: number | null;
  switchVenue: (venueId: number) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple AuthProvider for demo purposes - always authenticated and bypasses server checks
export function AuthProvider({ children }: { children: React.ReactNode }) {  
  // Demo implementation for permission checking
  const checkPermission = (permission: string): boolean => {
    return mockUser.permissions.includes(permission);
  };
  
  // Mock implementations that do nothing
  const login = async () => {
    console.log('Demo login - no authentication required');
  };
  
  const logout = async () => {
    console.log('Demo logout - no authentication required');
  };
  
  const switchVenue = async (venueId: number) => {
    console.log(`Demo venue switch to venue ID: ${venueId}`);
  };
  
  // Create the context value object with mock data
  const contextValue: AuthContextType = {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true, // Always authenticated for demo
    login,
    logout,
    hasPermission: checkPermission,
    currentVenueId: 1, // Default venue ID
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