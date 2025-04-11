import { Request, Response, NextFunction } from 'express';

// Define the session user type
interface SessionUser {
  id: number;
  name: string;
  role: string;
  // venueId has been removed from the user object
  // Current venue is now tracked via session separately
}

// Define session user for Express
declare module 'express-session' {
  interface SessionData {
    user: SessionUser;
    currentVenueId?: number; // Track the current venue ID in the session
  }
}

/**
 * Middleware to check if user is authenticated
 * In demo mode, this middleware is disabled and allows all requests
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Demo mode: always pass through authentication
  return next();
}

/**
 * Simple role-permission mapping
 */
const rolePermissions: Record<string, string[]> = {
  admin: ['canManageUsers', 'canManageVenues', 'canManageArtists', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canViewAllVenueData', 'canCreateWebhooks'],
  venue_manager: ['canManageVenues', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canCreateWebhooks'],
  artist_manager: ['canManageArtists', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canCreateWebhooks'],
  booking_agent: ['canManageTours', 'canViewAnalytics', 'canSendMessages'],
  staff: ['canSendMessages'],
  user: []
};

/**
 * Middleware to check if user has a specific permission
 * In demo mode, this middleware is disabled and allows all requests
 * @param permission The permission to check
 */
export function hasPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Demo mode: always pass through permission check
    return next();
  };
}

/**
 * Middleware to check if user has access to a specific venue
 * In demo mode, this middleware is disabled and allows all requests
 * @param paramName The parameter name containing the venue ID (defaults to 'venueId')
 */
export function hasVenueAccess(paramName: string = 'venueId') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Demo mode: always pass through venue access check
    return next();
  };
}

/**
 * Middleware to check if user has a specific role
 * In demo mode, this middleware is disabled and allows all requests
 * @param roles Array of allowed roles
 */
export function hasRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Demo mode: always pass through role check
    return next();
  };
}