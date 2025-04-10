import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateInput: string | Date | null | undefined) {
  if (!dateInput) return 'No date';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDistance(distanceInKm?: number | null): string {
  if (distanceInKm === undefined || distanceInKm === null) {
    return 'Not calculated';
  }
  return `${Math.round(distanceInKm)} km`;
}

export function formatTravelTime(timeInMinutes?: number | null): string {
  if (timeInMinutes === undefined || timeInMinutes === null) {
    return 'Not calculated';
  }
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = Math.round(timeInMinutes % 60);
  
  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} min`;
  }
}

export function calculateImprovement(current: number, optimized: number): number {
  if (current === 0) return 0;
  return Math.round((1 - optimized / current) * 100);
}
