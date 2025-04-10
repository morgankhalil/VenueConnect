import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Permission } from '@/lib/permissions';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate - A component that conditionally renders its children based on user permissions
 * 
 * @param permission - The required permission to render children
 * @param children - Content to render if user has the permission
 * @param fallback - Optional content to render if user doesn't have the permission
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, isLoading } = useAuth();
  
  // While authentication is loading, render nothing
  if (isLoading) {
    return null;
  }
  
  // If user has the permission, render children
  if (hasPermission(permission)) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback (if provided)
  return <>{fallback}</>;
}

interface RoleGateProps {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGate - A component that conditionally renders its children based on user role
 * 
 * @param roles - The required role(s) to render children
 * @param children - Content to render if user has the role
 * @param fallback - Optional content to render if user doesn't have the role
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useAuth();
  
  // While authentication is loading, render nothing
  if (isLoading) {
    return null;
  }
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  // If user has one of the allowed roles, render children
  if (user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback (if provided)
  return <>{fallback}</>;
}