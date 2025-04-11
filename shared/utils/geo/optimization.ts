/**
 * Tour optimization scoring utilities
 * These functions standardize how optimization scores are calculated
 * across different parts of the application.
 */
import { calculateDistance, calculateTotalDistance, estimateTravelTime } from './distance';

/**
 * Interface for optimization score input parameters
 */
export interface OptimizationScoreParams {
  /**
   * Total distance of the tour in kilometers
   */
  totalDistance: number;
  
  /**
   * Total travel time in minutes
   */
  totalTravelTime: number;
  
  /**
   * Quality of gap filling (0-100)
   * Higher is better for filling schedule gaps appropriately
   */
  gapFillingQuality?: number;
  
  /**
   * Geographic clustering score (0-100)
   * Higher is better for venues grouped efficiently
   */
  geographicClustering?: number;
  
  /**
   * Schedule efficiency (0-100)
   * Higher is better for efficient scheduling without long gaps
   */
  scheduleEfficiency?: number;
  
  /**
   * Date coverage percentage (0-100)
   * Higher is better for having dates assigned to venues
   */
  dateCoverage?: number;
}

/**
 * Calculate a standardized optimization score based on various factors
 * 
 * @param params Optimization score calculation parameters
 * @returns Optimization score (0-100)
 */
export function calculateOptimizationScore(params: OptimizationScoreParams): number {
  const {
    totalDistance,
    totalTravelTime,
    gapFillingQuality = 0,
    geographicClustering = 0,
    scheduleEfficiency = 0,
    dateCoverage = 0
  } = params;
  
  // Base score starts at 100
  const baseScore = 100;
  
  // Distance penalty (0-20 points)
  // Higher distances result in a larger penalty
  const distancePenalty = Math.min(20, totalDistance / 100);
  
  // Time penalty (0-20 points)
  // Longer travel times result in a larger penalty
  const timePenalty = Math.min(20, totalTravelTime / 500);
  
  // Gap filling bonus (0-15 points)
  // Better gap filling provides a higher bonus
  const gapFillingBonus = Math.min(15, gapFillingQuality * 0.15);
  
  // Geographic clustering bonus (0-10 points)
  // Better geographic clustering provides a higher bonus
  const clusterBonus = Math.min(10, geographicClustering * 0.1);
  
  // Schedule efficiency bonus (0-15 points)
  // More efficient scheduling provides a higher bonus
  const scheduleBonus = Math.min(15, scheduleEfficiency * 0.15);
  
  // Date coverage bonus (0-15 points)
  // More complete date coverage provides a higher bonus
  const dateBonus = Math.min(15, dateCoverage * 0.15);
  
  // Calculate final score and ensure it's between 0 and 100
  const score = baseScore - distancePenalty - timePenalty + 
                gapFillingBonus + clusterBonus + scheduleBonus + dateBonus;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate geographical clustering score based on venue proximity
 * 
 * @param venues Array of venues with latitude and longitude
 * @returns Clustering score (0-100)
 */
export function calculateGeographicClustering(venues: Array<{
  latitude?: number | null;
  longitude?: number | null;
}>): number {
  if (venues.length < 3) {
    return 50; // Neutral score for too few venues
  }
  
  let clusterScore = 0;
  const maxPossibleScore = (venues.length - 2) * 10; // Maximum possible points
  
  for (let i = 1; i < venues.length - 1; i++) {
    const prev = venues[i - 1];
    const curr = venues[i];
    const next = venues[i + 1];
    
    if (prev.latitude && prev.longitude && 
        curr.latitude && curr.longitude && 
        next.latitude && next.longitude) {
      
      const distanceToPrev = calculateDistance(
        curr.latitude, curr.longitude,
        prev.latitude, prev.longitude
      );
      
      const distanceToNext = calculateDistance(
        curr.latitude, curr.longitude,
        next.latitude, next.longitude
      );
      
      // Award points for venues close to neighbors
      // Scale is 0-10 points per venue based on proximity
      if (distanceToPrev < 50 && distanceToNext < 50) {
        clusterScore += 10; // Best clustering
      } else if (distanceToPrev < 100 && distanceToNext < 100) {
        clusterScore += 8;
      } else if (distanceToPrev < 200 && distanceToNext < 200) {
        clusterScore += 6;
      } else if (distanceToPrev < 300 && distanceToNext < 300) {
        clusterScore += 4;
      } else if (distanceToPrev < 500 && distanceToNext < 500) {
        clusterScore += 2;
      } else {
        clusterScore += 0; // Poor clustering
      }
    }
  }
  
  // Convert to 0-100 scale
  return Math.round((clusterScore / maxPossibleScore) * 100);
}

/**
 * Calculate schedule efficiency based on date spacing
 * 
 * @param venues Array of venues with dates
 * @returns Schedule efficiency score (0-100)
 */
export function calculateScheduleEfficiency(venues: Array<{
  date?: Date | string | null;
}>): number {
  // Filter venues with dates and sort by date
  const venuesWithDates = venues
    .filter(v => v.date !== null && v.date !== undefined)
    .map(v => ({
      ...v,
      dateObj: typeof v.date === 'string' ? new Date(v.date) : v.date
    }))
    .sort((a, b) => {
      if (!a.dateObj || !b.dateObj) return 0;
      return a.dateObj.getTime() - b.dateObj.getTime();
    });
  
  if (venuesWithDates.length < 2) {
    return 40; // Below average score for insufficient data
  }
  
  let efficiencyScore = 0;
  const maxPossibleScore = (venuesWithDates.length - 1) * 10; // Maximum possible points
  
  for (let i = 0; i < venuesWithDates.length - 1; i++) {
    const current = venuesWithDates[i];
    const next = venuesWithDates[i + 1];
    
    if (current.dateObj && next.dateObj) {
      // Calculate days between shows
      const daysBetween = Math.round(
        (next.dateObj.getTime() - current.dateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Award points based on optimal spacing
      // Scale is 0-10 points per pair based on days between
      if (daysBetween === 1) {
        efficiencyScore += 10; // Optimal - shows on consecutive days
      } else if (daysBetween === 2) {
        efficiencyScore += 9; // Very good - one day off
      } else if (daysBetween === 3) {
        efficiencyScore += 7; // Good - two days off
      } else if (daysBetween <= 5) {
        efficiencyScore += 5; // Acceptable
      } else if (daysBetween <= 7) {
        efficiencyScore += 3; // Suboptimal
      } else if (daysBetween <= 14) {
        efficiencyScore += 1; // Poor
      } else {
        efficiencyScore += 0; // Very poor - excessive gap
      }
    }
  }
  
  // Convert to 0-100 scale
  return Math.round((efficiencyScore / maxPossibleScore) * 100);
}

/**
 * Calculate date coverage percentage for a tour
 * 
 * @param venues Array of venues that should have dates
 * @returns Date coverage percentage (0-100)
 */
export function calculateDateCoverage(venues: Array<{
  date?: Date | string | null;
}>): number {
  if (venues.length === 0) {
    return 0;
  }
  
  const venuesWithDates = venues.filter(v => v.date !== null && v.date !== undefined);
  return Math.round((venuesWithDates.length / venues.length) * 100);
}