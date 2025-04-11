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

/**
 * Check if a user has a specific permission
 * 
 * @param user The user to check
 * @param permission The permission to check for
 * @returns boolean indicating whether the user has the permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  console.log("Checking permission:", permission, "for user:", user);
  
  if (!user) {
    console.log("No user provided, denying permission");
    return false;
  }
  
  // Get permissions for the user's role
  const userRole = user.role as keyof typeof rolePermissions;
  console.log("User role:", userRole);
  
  if (!rolePermissions[userRole]) {
    console.log("Role not found in permissions map, using default 'user' role");
  }
  
  const permissionSet = rolePermissions[userRole] || rolePermissions.user;
  console.log("Permission set for role:", permissionSet);
  
  const hasPermission = !!permissionSet[permission];
  console.log("Permission result:", hasPermission);
  
  return hasPermission;
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