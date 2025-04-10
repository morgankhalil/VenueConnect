// Tour venue status constants and helper functions

// Status groups
export const PLANNING_STATUSES = ['potential', 'suggested'];
export const CONTACT_STATUSES = ['contacted', 'negotiating'];
export const PRIORITY_HOLD_STATUSES = ['hold1', 'hold2', 'hold3', 'hold4'];
export const CONFIRMATION_STATUSES = ['confirmed', 'cancelled'];

// All valid statuses
export const TOUR_VENUE_STATUSES = [
  ...PLANNING_STATUSES,
  ...CONTACT_STATUSES,
  ...PRIORITY_HOLD_STATUSES,
  ...CONFIRMATION_STATUSES
];

// Status display names (for UI)
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  potential: 'Potential',
  suggested: 'Suggested',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  hold1: 'Priority 1 Hold',
  hold2: 'Priority 2 Hold', 
  hold3: 'Priority 3 Hold',
  hold4: 'Priority 4 Hold',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled'
};

// Status descriptions for tooltips
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  potential: 'Venue manually added to tour but no contact made yet',
  suggested: 'Venue suggested by the optimization engine',
  contacted: 'Initial outreach made to venue',
  negotiating: 'Active discussions about booking',
  hold1: 'Highest priority artist/band hold (1st position)',
  hold2: 'High priority artist/band hold (2nd position)',
  hold3: 'Medium priority artist/band hold (3rd position)',
  hold4: 'Lower priority artist/band hold (4th position)',
  confirmed: 'Booking is fully confirmed',
  cancelled: 'No longer part of the tour'
};

// Status colors for map markers and UI elements
export const STATUS_COLORS: Record<string, string> = {
  potential: '#6B7280', // Gray
  suggested: '#3B82F6', // Blue
  contacted: '#8B5CF6', // Purple
  negotiating: '#9333EA', // Deep purple
  hold1: '#F59E0B', // Amber
  hold2: '#EAB308', // Yellow
  hold3: '#84CC16', // Lime
  hold4: '#10B981', // Emerald
  confirmed: '#059669', // Green
  cancelled: '#EF4444'  // Red
};

// CSS classes for badges and UI elements
export const STATUS_CLASSES: Record<string, string> = {
  potential: 'bg-gray-500 hover:bg-gray-600',
  suggested: 'bg-blue-500 hover:bg-blue-600',
  contacted: 'bg-purple-500 hover:bg-purple-600',
  negotiating: 'bg-purple-700 hover:bg-purple-800',
  hold1: 'bg-amber-500 hover:bg-amber-600',
  hold2: 'bg-yellow-500 hover:bg-yellow-600',
  hold3: 'bg-lime-500 hover:bg-lime-600',
  hold4: 'bg-emerald-500 hover:bg-emerald-600',
  confirmed: 'bg-green-600 hover:bg-green-700',
  cancelled: 'bg-red-600 hover:bg-red-700'
};

/**
 * Get status information for the given status code
 */
export function getStatusInfo(status: string) {
  const normalizedStatus = status.toLowerCase();
  return {
    displayName: STATUS_DISPLAY_NAMES[normalizedStatus] || status,
    description: STATUS_DESCRIPTIONS[normalizedStatus] || 'Unknown status',
    color: STATUS_COLORS[normalizedStatus] || '#6B7280',
    cssClass: STATUS_CLASSES[normalizedStatus] || 'bg-gray-500 hover:bg-gray-600'
  };
}

/**
 * Check if the given status is a priority hold
 */
export function isPriorityHold(status: string): boolean {
  return PRIORITY_HOLD_STATUSES.includes(status.toLowerCase());
}

/**
 * Get the priority level number from a hold status
 */
export function getPriorityLevel(status: string): number | null {
  if (!isPriorityHold(status)) return null;
  
  // Extract number from "hold1", "hold2", etc.
  const match = status.match(/hold(\d)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get a status badge variant based on status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus === 'confirmed') {
    return 'default';
  }
  
  if (PRIORITY_HOLD_STATUSES.includes(normalizedStatus)) {
    return 'secondary';
  }
  
  if (normalizedStatus === 'cancelled') {
    return 'destructive';
  }
  
  return 'outline';
}