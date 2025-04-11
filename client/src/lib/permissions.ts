/**
 * User type with role information
 */
export interface User {
  id: number;
  name: string;
  role: string;
  venueId: number | null;
}

/**
 * Permission type enum representing available permissions in the system
 */
export type Permission = 
  | 'canManageUsers'
  | 'canManageVenues'
  | 'canManageArtists'
  | 'canManageTours'
  | 'canViewAnalytics'
  | 'canSendMessages'
  | 'canViewAllVenueData'
  | 'canCreateWebhooks';

/**
 * Map roles to their corresponding permissions
 */
export const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  admin: ['canManageUsers', 'canManageVenues', 'canManageArtists', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canViewAllVenueData', 'canCreateWebhooks'],
  venue_manager: ['canManageVenues', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canCreateWebhooks'],
  artist_manager: ['canManageArtists', 'canManageTours', 'canViewAnalytics', 'canSendMessages', 'canCreateWebhooks'],
  booking_agent: ['canManageTours', 'canViewAnalytics', 'canSendMessages'],
  staff: ['canSendMessages'],
  user: []
};

/**
 * Check if a user has a specific permission
 * 
 * @param user The user to check
 * @param permission The permission to check for
 * @returns boolean indicating whether the user has the permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) {
    return false;
  }
  
  // Admin users have all permissions
  if (user.role === 'admin') {
    return true;
  }
  
  // Get permissions for the user's role
  const permissions = PERMISSIONS_BY_ROLE[user.role] || [];
  
  // Check if the permission is in the list
  return permissions.includes(permission);
}

/**
 * Check if a user has a specific role
 * 
 * @param user The user to check
 * @param roles The role(s) to check for
 * @returns boolean indicating whether the user has any of the specified roles
 */
export function hasRole(user: User | null, roles: string | string[]): boolean {
  if (!user) {
    return false;
  }
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return allowedRoles.includes(user.role);
}

/**
 * Check if a user has access to a specific venue
 * 
 * @param user The user to check
 * @param venueId The venue ID to check access for
 * @returns boolean indicating whether the user has access to the venue
 */
export function hasVenueAccess(user: User | null, venueId: number): boolean {
  if (!user) {
    return false;
  }
  
  // Admin can access any venue
  if (user.role === 'admin') {
    return true;
  }
  
  // Check if user's venue matches the requested venue
  return user.venueId === venueId;
}