import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Permission } from '@/lib/permissions';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGate permission="canManageUsers">
 *   <UserManagementPanel />
 * </PermissionGate>
 */
export function PermissionGate({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission } = useAuth();
  
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Component that renders children only if user has access to a specific venue
 */
export function VenueAccessGate({ 
  venueId, 
  children, 
  fallback = null 
}: { 
  venueId: number; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  
  // Admin can access any venue
  if (user?.role === 'admin') {
    return <>{children}</>;
  }
  
  // Other roles can only access their assigned venue
  if (user?.venueId === venueId) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Component that renders children only if user has a specific role
 */
export function RoleGate({ 
  role, 
  children, 
  fallback = null 
}: { 
  role: string | string[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const allowedRoles = Array.isArray(role) ? role : [role];
  
  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}