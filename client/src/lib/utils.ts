import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a distance in kilometers to a readable format
 * @param distanceKm Distance in kilometers
 * @returns Formatted string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format a date to a readable format
 * @param date Date to format
 * @returns Formatted string
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format minutes to a readable time format
 * @param minutes Total minutes
 * @returns Formatted string (e.g., "2h 30m")
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Format travel time in minutes to a readable format
 * @param minutes Travel time in minutes
 * @returns Formatted string (e.g., "2h 30m")
 */
export function formatTravelTime(minutes: number): string {
  return formatTime(minutes);
}

/**
 * Format a currency value to a readable format
 * @param value Currency value
 * @param currency Currency code (default: USD)
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a venue capacity to a readable format
 * @param capacity Venue capacity (number of people)
 * @returns Formatted string (e.g., "1,200")
 */
export function formatCapacity(capacity: number): string {
  return capacity.toLocaleString();
}

/**
 * Calculate the percentage improvement between two values
 * @param oldValue Original value
 * @param newValue New value
 * @returns Percentage improvement (negative for decrease, positive for increase)
 */
export function calculateImprovement(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  
  const change = oldValue - newValue;
  return Math.round((change / oldValue) * 100);
}

/**
 * Calculate percentage improvement between original and optimized values
 * @param original The original value (e.g., distance, time)
 * @param optimized The optimized value
 * @returns Percentage improvement (negative means decrease/improvement)
 */
export function calculatePercentageImprovement(original: number, optimized: number): number {
  if (original === 0) return 0;
  return Math.round(((optimized - original) / original) * 100);
}

/**
 * Calculate the distance between two points given their coordinates
 * Uses the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistanceBetweenCoords(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Convert latitude and longitude from degrees to radians
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const radLat1 = toRadians(lat1);
  const radLon1 = toRadians(lon1);
  const radLat2 = toRadians(lat2);
  const radLon2 = toRadians(lon2);
  
  // Earth's radius in kilometers
  const earthRadius = 6371;
  
  // Haversine formula
  const dLat = radLat2 - radLat1;
  const dLon = radLon2 - radLon1;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in kilometers
  const distance = earthRadius * c;
  
  return parseFloat(distance.toFixed(1));
}