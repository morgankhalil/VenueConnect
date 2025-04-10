/**
 * Tour venue status constants and utilities
 * 
 * This file centralizes all status-related utilities for tour venues.
 * Simplified to use only "potential", "hold", "confirmed", and "cancelled" statuses.
 */

// Complete list of all possible statuses
export const TOUR_VENUE_STATUSES = [
  'potential',
  'hold',
  'confirmed',
  'cancelled'
];

// Human-readable display names for each status
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'potential': 'Potential',
  'hold': 'Hold',
  'confirmed': 'Confirmed',
  'cancelled': 'Cancelled'
};

// Detailed descriptions for each status
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  'potential': 'Identified as a potential venue for the tour',
  'hold': 'Date and venue on hold pending confirmation',
  'confirmed': 'Venue has been confirmed and locked in',
  'cancelled': 'Booking was cancelled after initial confirmation'
};

// Color mappings for status visualization
export const STATUS_COLORS: Record<string, string> = {
  'potential': '#F97316', // Orange
  'hold': '#F59E0B',      // Yellow/Amber
  'confirmed': '#10B981', // Green
  'cancelled': '#EF4444'  // Red
};

// CSS classes for status indicators
export const STATUS_CLASSES: Record<string, string> = {
  'potential': 'bg-orange-100 text-orange-800 border-orange-200',
  'hold': 'bg-amber-100 text-amber-800 border-amber-200',
  'confirmed': 'bg-green-100 text-green-800 border-green-200',
  'cancelled': 'bg-red-100 text-red-800 border-red-200'
};

/**
 * Get status information for the given status code
 * Map legacy statuses to the new simplified system
 */
export function getStatusInfo(status: string) {
  let normalizedStatus = status.toLowerCase();
  
  // Map legacy statuses to the new simplified system
  if (normalizedStatus.startsWith('hold') || 
      normalizedStatus === 'contacted' || 
      normalizedStatus === 'negotiating') {
    normalizedStatus = 'hold';
  } else if (normalizedStatus === 'suggested') {
    normalizedStatus = 'potential';
  }
  
  // If the status doesn't match any of our simplified statuses,
  // default to 'potential' for any unknown status
  if (!TOUR_VENUE_STATUSES.includes(normalizedStatus)) {
    normalizedStatus = 'potential';
  }
  
  return {
    code: normalizedStatus,
    displayName: STATUS_DISPLAY_NAMES[normalizedStatus] || 'Unknown',
    description: STATUS_DESCRIPTIONS[normalizedStatus] || 'Unknown status',
    color: STATUS_COLORS[normalizedStatus] || '#9CA3AF',
    cssClass: STATUS_CLASSES[normalizedStatus] || 'bg-gray-100 text-gray-800 border-gray-200'
  };
}

/**
 * Check if the given status is a hold
 */
export function isPriorityHold(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus === 'hold' || 
         normalizedStatus.startsWith('hold') || 
         normalizedStatus === 'contacted' || 
         normalizedStatus === 'negotiating';
}

/**
 * Get a status badge variant based on status
 * Returns the appropriate shadcn/ui badge variant based on status:
 * - confirmed = default (green)
 * - cancelled = destructive (red)
 * - hold = secondary (yellow/amber accent)
 * - potential = outline with orange styling (applied in component)
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalizedStatus = getStatusInfo(status).code;
  
  if (normalizedStatus === 'confirmed') {
    return 'default'; // green
  } else if (normalizedStatus === 'cancelled') {
    return 'destructive'; // red
  } else if (normalizedStatus === 'hold') {
    return 'secondary'; // yellow/amber
  } else if (normalizedStatus === 'potential') {
    return 'outline'; // will be styled with orange
  }
  
  return 'outline'; // fallback
}