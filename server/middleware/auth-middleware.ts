import { Request, Response, NextFunction } from 'express';

// Define the session user type
interface SessionUser {
  id: number;
  name: string;
  role: string;
  venueId: number | null;
}

// Define session user for Express
declare module 'express-session' {
  interface SessionData {
    user: SessionUser;
  }
}

/**
 * Middleware to check if user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    return next();
  }
  
  return res.status(401).json({
    error: 'Authentication required'
  });
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
 * @param permission The permission to check
 */
export function hasPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { role } = req.session.user;
    
    // Admin has all permissions
    if (role === 'admin') {
      return next();
    }
    
    // Check if the role has the required permission
    const permissions = rolePermissions[role] || [];
    if (permissions.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Permission denied'
    });
  };
}

/**
 * Middleware to check if user has access to a specific venue
 * @param paramName The parameter name containing the venue ID (defaults to 'venueId')
 */
export function hasVenueAccess(paramName: string = 'venueId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { role, venueId } = req.session.user;
    const requestedVenueId = Number(req.params[paramName]);
    
    // Admin can access any venue
    if (role === 'admin') {
      return next();
    }
    
    // Check if user's venue matches the requested venue
    if (venueId === requestedVenueId) {
      return next();
    }
    
    return res.status(403).json({
      error: 'You do not have access to this venue'
    });
  };
}

/**
 * Middleware to check if user has a specific role
 * @param roles Array of allowed roles
 */
export function hasRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { role } = req.session.user;
    
    if (allowedRoles.includes(role)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Role required'
    });
  };
}