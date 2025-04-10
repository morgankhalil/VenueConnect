/**
 * User role definitions and permission checks
 */

export type UserRole = 
  | 'admin'               // Full system access
  | 'venue_manager'       // Can manage venue details, events, and bookings
  | 'artist_manager'      // Can manage artist profiles and tour schedules
  | 'booking_agent'       // Can create and manage bookings across venues
  | 'staff'               // Limited venue or artist access
  | 'user';               // Basic access

export interface User {
  id: number;
  name: string;
  role: UserRole;
  venueId: number | null;
}

/**
 * Define permissions for each role
 */
export const rolePermissions = {
  admin: {
    canManageUsers: true,
    canManageVenues: true,
    canManageArtists: true,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: true,
    canCreateWebhooks: true,
  },
  venue_manager: {
    canManageUsers: false,
    canManageVenues: true,
    canManageArtists: false,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: true,
  },
  artist_manager: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: true,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: true,
  },
  booking_agent: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  },
  staff: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: false,
    canViewAnalytics: false,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  },
  user: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: false,
    canViewAnalytics: false,
    canSendMessages: false,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  }
};

export type Permission = keyof typeof rolePermissions.admin;

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  
  const role = user.role as UserRole;
  // Default to user permissions if role is not defined in permissions
  const rolePermission = rolePermissions[role] || rolePermissions.user;
  
  return !!rolePermission[permission];
}

/**
 * Check if a user has access to view data for a specific venue
 */
export function hasVenueAccess(user: User | null | undefined, venueId: number): boolean {
  if (!user) return false;
  
  // Admin can access any venue
  if (user.role === 'admin') return true;
  
  // User must have a venue assigned and it must match the requested venue
  return user.venueId === venueId;
}