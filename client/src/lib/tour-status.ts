/**
 * Tour venue status constants and utilities
 * 
 * This file centralizes all status-related utilities for tour venues.
 * It supports a priority-based status system where holds 1-4 represent
 * artist priority levels rather than venue booking stages.
 */

// Status type groupings - for UI organization and filtering
export const PLANNING_STATUSES = ['suggested', 'potential'];
export const CONTACT_STATUSES = ['contacted', 'negotiating'];
export const PRIORITY_HOLD_STATUSES = ['hold1', 'hold2', 'hold3', 'hold4'];
export const CONFIRMATION_STATUSES = ['confirmed', 'cancelled'];

// Complete list of all possible statuses
export const TOUR_VENUE_STATUSES = [
  ...PLANNING_STATUSES,
  ...CONTACT_STATUSES,
  ...PRIORITY_HOLD_STATUSES,
  ...CONFIRMATION_STATUSES
];

// Human-readable display names for each status
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'suggested': 'Suggested',
  'potential': 'Potential',
  'contacted': 'Contacted',
  'negotiating': 'Negotiating',
  'hold1': 'Priority Hold 1',
  'hold2': 'Priority Hold 2',
  'hold3': 'Priority Hold 3',
  'hold4': 'Priority Hold 4',
  'confirmed': 'Confirmed',
  'cancelled': 'Cancelled'
};

// Detailed descriptions for each status
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  'suggested': 'Venue suggested by the system or team member',
  'potential': 'Identified as a potential venue for the tour',
  'contacted': 'Initial contact has been made with the venue',
  'negotiating': 'In negotiations with venue regarding terms',
  'hold1': 'Highest priority hold - first choice for this date',
  'hold2': 'Secondary priority hold - second choice for this date',
  'hold3': 'Tertiary priority hold - third choice for this date',
  'hold4': 'Low priority hold - fourth choice for this date',
  'confirmed': 'Venue has been confirmed and locked in',
  'cancelled': 'Booking was cancelled after initial confirmation'
};

// Color mappings for status visualization
export const STATUS_COLORS: Record<string, string> = {
  'suggested': '#F59E0B', // Amber
  'potential': '#9CA3AF', // Gray
  'contacted': '#3B82F6', // Blue
  'negotiating': '#8B5CF6', // Purple
  'hold1': '#EF4444', // Red - highest priority
  'hold2': '#F97316', // Orange
  'hold3': '#FACC15', // Yellow
  'hold4': '#A3E635', // Lime
  'confirmed': '#10B981', // Green
  'cancelled': '#6B7280' // Gray
};

// CSS classes for status indicators
export const STATUS_CLASSES: Record<string, string> = {
  'suggested': 'bg-amber-100 text-amber-800 border-amber-200',
  'potential': 'bg-gray-100 text-gray-800 border-gray-200',
  'contacted': 'bg-blue-100 text-blue-800 border-blue-200',
  'negotiating': 'bg-purple-100 text-purple-800 border-purple-200',
  'hold1': 'bg-red-100 text-red-800 border-red-200',
  'hold2': 'bg-orange-100 text-orange-800 border-orange-200',
  'hold3': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'hold4': 'bg-lime-100 text-lime-800 border-lime-200',
  'confirmed': 'bg-green-100 text-green-800 border-green-200',
  'cancelled': 'bg-gray-100 text-gray-500 border-gray-200'
};

/**
 * Get status information for the given status code
 */
export function getStatusInfo(status: string) {
  const normalizedStatus = status.toLowerCase();
  
  return {
    code: normalizedStatus,
    displayName: STATUS_DISPLAY_NAMES[normalizedStatus] || 'Unknown',
    description: STATUS_DESCRIPTIONS[normalizedStatus] || 'Unknown status',
    color: STATUS_COLORS[normalizedStatus] || '#9CA3AF',
    cssClass: STATUS_CLASSES[normalizedStatus] || 'bg-gray-100 text-gray-800 border-gray-200'
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
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus.startsWith('hold') && normalizedStatus.length > 4) {
    const level = parseInt(normalizedStatus.substring(4));
    if (!isNaN(level) && level >= 1 && level <= 4) {
      return level;
    }
  }
  
  return null;
}

/**
 * Get a status badge variant based on status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus === 'confirmed') {
    return 'default'; // green
  } else if (normalizedStatus === 'cancelled') {
    return 'destructive'; // red
  } else if (isPriorityHold(normalizedStatus)) {
    return 'secondary'; // gray/neutral
  }
  
  return 'outline'; // transparent with border
}