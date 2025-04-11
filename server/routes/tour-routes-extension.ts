import { Router } from 'express';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { 
  calculateDistance, 
  estimateTravelTime, 
  optimizeTourRoute 
} from '../../shared/utils/tour-optimizer';
import { 
  tours, 
  tourVenues, 
  tourGaps, 
  venues,
  tourRoutes,
  insertTourRouteSchema
} from '../../shared/schema';

// This function enhances the apply-optimization endpoint to store route information
export async function enhanceApplyOptimization(
  tourId: number, 
  optimizedVenues: Array<any>, 
  totalDistance: number, 
  totalTravelTime: number
) {
  try {
    // First delete existing routes for this tour
    await db
      .delete(tourRoutes)
      .where(eq(tourRoutes.tourId, tourId));
    
    const venues = [...optimizedVenues].sort((a, b) => {
      const aSequence = a.sequence || 0;
      const bSequence = b.sequence || 0;
      return aSequence - bSequence;
    });
    
    // Create routes between consecutive venues
    for (let i = 0; i < venues.length - 1; i++) {
      const current = venues[i];
      const next = venues[i + 1];
      
      // Skip if venues don't have coordinates or venue objects
      if (!current.venue || !next.venue || 
          !current.venue.latitude || !current.venue.longitude || 
          !next.venue.latitude || !next.venue.longitude) {
        continue;
      }
      
      // Calculate distance and travel time
      const distance = calculateDistance(
        Number(current.venue.latitude),
        Number(current.venue.longitude),
        Number(next.venue.latitude),
        Number(next.venue.longitude)
      );
      
      const travelTime = estimateTravelTime(distance);
      
      // Calculate a simple optimization score for this segment
      // Lower distances get higher scores
      const segmentScore = Math.round(100 - Math.min(50, distance / 10));
      
      // Store additional metadata about the route segment
      const additionalInfo = {
        // Calculate detour ratio if available
        detourRatio: current.detourRatio || next.detourRatio,
        // Note if this is a gap-filling segment
        isGapFilling: current.gapFilling || next.gapFilling,
        // Capture date information for better scheduling
        startDate: current.date || current.suggestedDate,
        endDate: next.date || next.suggestedDate,
        // Status of the venues
        startStatus: current.status,
        endStatus: next.status
      };
      
      // Insert the route with detailed information
      await db
        .insert(tourRoutes)
        .values({
          tourId: tourId,
          startVenueId: current.venue.id,
          endVenueId: next.venue.id,
          distanceKm: distance,
          estimatedTravelTimeMinutes: travelTime,
          optimizationScore: segmentScore
        });
    }
    
    return true;
  } catch (error) {
    console.error("Error enhancing tour optimization with routes:", error);
    return false;
  }
}

// Enhanced gap filling algorithm to find better matches for schedule gaps
export function findImprovedVenuesForGap(
  startVenue: any,
  endVenue: any,
  startDate: Date,
  endDate: Date,
  allVenues: any[],
  artistPreferences: any = null
) {
  try {
    if (!startVenue || !endVenue || !startDate || !endDate) {
      return [];
    }
    
    // Calculate the gap duration in days
    const gapDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // No gap or gap too small for a show
    if (gapDays <= 1) {
      return [];
    }
    
    // Filter venues with coordinates
    const venuesWithCoordinates = allVenues.filter(v => 
      v.latitude && v.longitude
    );
    
    if (venuesWithCoordinates.length === 0) {
      return [];
    }
    
    // Start with geographic filtering - find venues in the general path between start and end
    const candidateVenues = venuesWithCoordinates.map(venue => {
      // Calculate direct distance between start and end venues
      const directDistance = calculateDistance(
        Number(startVenue.latitude), 
        Number(startVenue.longitude), 
        Number(endVenue.latitude), 
        Number(endVenue.longitude)
      );
      
      // Calculate distances for this venue
      const distanceFromStart = calculateDistance(
        Number(startVenue.latitude), 
        Number(startVenue.longitude), 
        Number(venue.latitude), 
        Number(venue.longitude)
      );
      
      const distanceToEnd = calculateDistance(
        Number(venue.latitude), 
        Number(venue.longitude), 
        Number(endVenue.latitude), 
        Number(endVenue.longitude)
      );
      
      // Calculate the detour ratio - how much this venue adds to the direct path
      // A ratio of 1.0 means it's perfectly on the path, higher means more detour
      const detourRatio = (distanceFromStart + distanceToEnd) / directDistance;
      
      // Calculate a score based on how well this venue fits geographically
      // Lower scores are better
      const geographicScore = (detourRatio - 1) * 100;
      
      // Apply artist preferences if available
      let preferenceScore = 0;
      if (artistPreferences) {
        // Preferred regions
        if (artistPreferences.preferredRegions && 
            artistPreferences.preferredRegions.includes(venue.region)) {
          preferenceScore += 20;
        }
        
        // Preferred venue types
        if (artistPreferences.preferredVenueTypes && 
            venue.venueType && 
            artistPreferences.preferredVenueTypes.includes(venue.venueType)) {
          preferenceScore += 15;
        }
        
        // Preferred venue capacity
        if (artistPreferences.preferredVenueCapacity && 
            venue.capacity &&
            venue.capacity >= artistPreferences.preferredVenueCapacity.min &&
            venue.capacity <= artistPreferences.preferredVenueCapacity.max) {
          preferenceScore += 15;
        }
      }
      
      return {
        venue,
        distanceFromStart,
        distanceToEnd,
        detourRatio,
        geographicScore,
        preferenceScore,
        // Combined score (lower is better for geographic, higher is better for preferences)
        totalScore: 100 - geographicScore + preferenceScore
      };
    });
    
    // Sort venues by total score (higher is better)
    const rankedVenues = candidateVenues
      .filter(v => v.detourRatio < 2.5) // Not too far out of the way
      .sort((a, b) => b.totalScore - a.totalScore);
    
    // Select the best venues based on the gap size
    // For larger gaps, we might want to include more venues
    const maxVenues = Math.min(3, Math.max(1, Math.floor(gapDays / 2)));
    
    // Get the best venues
    const selectedVenues = rankedVenues.slice(0, maxVenues);
    
    // Generate suggested dates for these venues
    return selectedVenues.map((venue, index) => {
      // Distribute venues evenly throughout the gap
      const daysFromStart = Math.round(gapDays * ((index + 1) / (selectedVenues.length + 1)));
      
      // Calculate the suggested date
      const suggestedDate = new Date(startDate);
      suggestedDate.setDate(suggestedDate.getDate() + daysFromStart);
      
      return {
        venue: venue.venue,
        suggestedDate,
        detourRatio: venue.detourRatio,
        score: venue.totalScore,
        gapFilling: true
      };
    });
  } catch (error) {
    console.error("Error finding improved venues for gap:", error);
    return [];
  }
}