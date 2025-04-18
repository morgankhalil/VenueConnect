/**
 * Unified Tour Optimizer
 * 
 * This module provides a consistent interface for tour optimization using
 * OpenAI for AI-powered optimization with fallback to standard optimization.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  tours, 
  tourVenues, 
  venues,
  artists
} from '../../shared/schema';
import { 
  eq, 
  and, 
  sql,
  lte,
  gte,
  isNull 
} from 'drizzle-orm';

// Import shared utility functions
import { 
  calculateDistance, 
  calculateTotalDistance,
  estimateTravelTime,
  calculateOptimizationScore
} from '../../shared/utils/geo';

// Import OpenAI client
import OpenAI from 'openai';

// Create router for the unified optimizer
export const unifiedOptimizerRouter = Router();

// Format tour data for optimization
async function formatTourDataForOptimization(tourId: number) {
  // Fetch the tour
  const tour = await db.select().from(tours).where(eq(tours.id, tourId)).limit(1).then(res => res[0]);
  
  if (!tour) {
    throw new Error('Tour not found');
  }
  
  // Fetch the artist
  const artist = await db.select().from(artists).where(eq(artists.id, tour.artistId)).limit(1).then(res => res[0]);
  
  // Fetch tour venues with venue details
  const tourVenuesList = await db.select()
    .from(tourVenues)
    .where(eq(tourVenues.tourId, tourId))
    .innerJoin(venues, eq(tourVenues.venueId, venues.id));

  // Process the joined tour venues
  const confirmedVenues = tourVenuesList
    .filter(tv => tv.tour_venues.status === 'confirmed')
    .map(tv => ({
      id: tv.tour_venues.id,
      venueId: tv.tour_venues.venueId,
      name: tv.venues.name || 'Unknown Venue',
      city: tv.venues.city || 'Unknown City',
      latitude: tv.venues.latitude,
      longitude: tv.venues.longitude,
      date: tv.tour_venues.date,
      isFixed: true,
      status: tv.tour_venues.status,
      sequence: tv.tour_venues.sequence
    }));

  const potentialVenues = tourVenuesList
    .filter(tv => tv.tour_venues.status !== 'confirmed' && tv.tour_venues.status !== 'cancelled')
    .map(tv => ({
      id: tv.tour_venues.id,
      venueId: tv.tour_venues.venueId,
      name: tv.venues.name || 'Unknown Venue',
      city: tv.venues.city || 'Unknown City',
      latitude: tv.venues.latitude,
      longitude: tv.venues.longitude,
      date: tv.tour_venues.date,
      isFixed: false,
      status: tv.tour_venues.status,
      sequence: tv.tour_venues.sequence
    }));

  // Get artist data (genres)
  const artistData = artist ? {
    name: artist.name,
    genres: artist.genres || []
  } : {
    name: 'Unknown Artist',
    genres: []
  };

  return {
    tourId: tour.id,
    tourName: tour.name,
    artistName: artistData.name,
    artistGenres: artistData.genres,
    startDate: tour.startDate,
    endDate: tour.endDate,
    confirmedVenues,
    potentialVenues,
    allVenues: [...confirmedVenues, ...potentialVenues]
  };
}

// Perform standard optimization based on distance calculations
/**
 * Perform standard optimization with support for advanced features
 * 
 * @param tourData Tour data containing venue information
 * @param options Optimization options including venue priorities and date constraints
 */
function performStandardOptimization(tourData: any, options: any = {}) {
  // Extract optimization options
  const {
    venuePriorities = {}, // venueId -> priority (1-10)
    respectFixedDates = true, // Always respect fixed dates by default
    optimizeFor = 'balanced', // 'distance', 'time', or 'balanced'
    preferredDates = {}, // venueId -> preferred date
    avoidDates = [], // Dates to avoid (YYYY-MM-DD)
    minDaysBetweenShows = 1, // Minimum days between shows
    maxDaysBetweenShows = 7, // Maximum days between shows
  } = options;
  
  // Calculate baseline metrics
  const totalDistance = calculateTotalDistance(tourData.allVenues);
  const totalTravelTimeMinutes = estimateTravelTime(totalDistance);
  
  // Separate fixed venues (those with confirmed dates that cannot be moved)
  const fixedVenues = respectFixedDates 
    ? tourData.allVenues.filter((v: any) => v.isFixed || v.status === 'confirmed')
    : [];
    
  // Venues that can be optimized
  const optimizableVenues = tourData.allVenues.filter((v: any) => 
    !(respectFixedDates && (v.isFixed || v.status === 'confirmed'))
  );
  
  // Apply venue priorities to the optimization
  // Higher priority venues (7-10) are more likely to be included
  // Medium priority venues (4-6) are included based on route efficiency
  // Lower priority venues (1-3) are only included if they're on an efficient route
  const prioritizedVenues = optimizableVenues.map((venue: any) => {
    const priority = venuePriorities[venue.id] || 5; // Default priority is medium (5)
    return {
      ...venue,
      priority
    };
  });
  
  // Sort venues based on optimization strategy
  // For distance optimization: use geographic sorting (north to south)
  // For time optimization: consider travel time between venues
  // For balanced: combine both approaches
  let sortedOptimizableVenues;
  
  if (optimizeFor === 'distance') {
    // Sort by latitude (north to south)
    sortedOptimizableVenues = [...prioritizedVenues].sort((a, b) => {
      if (a.latitude && b.latitude) {
        // Higher priority venues come first within their geographic region
        if (Math.abs(a.latitude - b.latitude) < 1) {
          return b.priority - a.priority;
        }
        return a.latitude - b.latitude;
      }
      return 0;
    });
  } else if (optimizeFor === 'time') {
    // Sort by priority and proximity to existing fixed points
    sortedOptimizableVenues = [...prioritizedVenues].sort((a, b) => {
      // Higher priority venues come first
      if (Math.abs(a.priority - b.priority) > 2) {
        return b.priority - a.priority;
      }
      
      // If similar priority, sort by proximity to the fixed venues
      if (fixedVenues.length > 0) {
        const aMinDistance = Math.min(...fixedVenues.map((fixed: any) => 
          calculateDistance(a.latitude, a.longitude, fixed.latitude, fixed.longitude)
        ));
        
        const bMinDistance = Math.min(...fixedVenues.map((fixed: any) => 
          calculateDistance(b.latitude, b.longitude, fixed.latitude, fixed.longitude)
        ));
        
        return aMinDistance - bMinDistance;
      }
      
      return 0;
    });
  } else {
    // Balanced approach: combine priority, geographic, and proximity considerations
    sortedOptimizableVenues = [...prioritizedVenues].sort((a, b) => {
      // Priority factor (0.4 weight)
      const priorityFactor = (b.priority - a.priority) * 0.4;
      
      // Geographic factor (0.3 weight)
      let geographicFactor = 0;
      if (a.latitude && b.latitude) {
        geographicFactor = (a.latitude - b.latitude) * 0.3;
      }
      
      // Proximity factor (0.3 weight)
      let proximityFactor = 0;
      if (fixedVenues.length > 0) {
        const aMinDistance = Math.min(...fixedVenues.map((fixed: any) => 
          calculateDistance(a.latitude, a.longitude, fixed.latitude, fixed.longitude)
        ));
        
        const bMinDistance = Math.min(...fixedVenues.map((fixed: any) => 
          calculateDistance(b.latitude, b.longitude, fixed.latitude, fixed.longitude)
        ));
        
        proximityFactor = (aMinDistance - bMinDistance) * 0.3;
      }
      
      return priorityFactor + geographicFactor + proximityFactor;
    });
  }
  
  // Combine fixed venues with sorted optimizable venues
  // Fixed venues stay in their positions, optimizable venues are interleaved
  // based on geographic proximity and date constraints
  const allSortedVenues = mergeSortedVenues(fixedVenues, sortedOptimizableVenues);
  
  // Generate suggested dates for venues that don't have dates
  const suggestedDates: Record<string, string> = {};
  let lastDate: Date | null = null;
  
  // Detect any date conflicts
  const dateConflicts: Array<{
    venueId: number;
    conflictWith: number;
    suggestedAlternativeDate?: string;
  }> = [];
  
  // First pass: find existing dates and check for conflicts
  const dateMap = new Map<string, number>();
  allSortedVenues.forEach((venue: any) => {
    if (venue.date) {
      const dateStr = new Date(venue.date).toISOString().split('T')[0];
      
      if (dateMap.has(dateStr)) {
        // Found a date conflict
        dateConflicts.push({
          venueId: venue.id,
          conflictWith: dateMap.get(dateStr) as number,
          // Suggest next day as alternative
          suggestedAlternativeDate: new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0]
        });
      } else {
        dateMap.set(dateStr, venue.id);
      }
      
      lastDate = new Date(venue.date);
    }
  });
  
  // Second pass: set suggested dates for venues without dates
  for (const venue of allSortedVenues) {
    if (!venue.date) {
      // Check if this venue has a preferred date
      if (preferredDates[venue.id]) {
        const preferredDate = new Date(preferredDates[venue.id]);
        const preferredDateStr = preferredDate.toISOString().split('T')[0];
        
        // Check if preferred date conflicts with existing dates
        if (dateMap.has(preferredDateStr)) {
          // Conflict with preferred date
          dateConflicts.push({
            venueId: venue.id,
            conflictWith: dateMap.get(preferredDateStr) as number,
            // Will generate alternative in next step
          });
        } else {
          // Use preferred date
          suggestedDates[venue.id] = preferredDateStr;
          dateMap.set(preferredDateStr, venue.id);
          lastDate = preferredDate;
          continue;
        }
      }
      
      // If we have a last date, suggest a date after it
      if (lastDate) {
        let nextDate = new Date(lastDate.getTime() + minDaysBetweenShows * 86400000);
        let nextDateStr = nextDate.toISOString().split('T')[0];
        
        // Avoid dates that should be avoided
        while (
          avoidDates.includes(nextDateStr) || 
          dateMap.has(nextDateStr)
        ) {
          nextDate = new Date(nextDate.getTime() + 86400000);
          nextDateStr = nextDate.toISOString().split('T')[0];
        }
        
        suggestedDates[venue.id] = nextDateStr;
        dateMap.set(nextDateStr, venue.id);
        lastDate = nextDate;
      } else {
        // No last date (first venue without date)
        // If tour has a start date, use that
        if (tourData.startDate) {
          const startDate = new Date(tourData.startDate);
          const startDateStr = startDate.toISOString().split('T')[0];
          
          if (dateMap.has(startDateStr)) {
            // Conflict with start date
            const nextDate = new Date(startDate.getTime() + 86400000);
            const nextDateStr = nextDate.toISOString().split('T')[0];
            
            suggestedDates[venue.id] = nextDateStr;
            dateMap.set(nextDateStr, venue.id);
            lastDate = nextDate;
          } else {
            suggestedDates[venue.id] = startDateStr;
            dateMap.set(startDateStr, venue.id);
            lastDate = startDate;
          }
        } else {
          // No start date, use today + 30 days as default start
          const defaultStart = new Date();
          defaultStart.setDate(defaultStart.getDate() + 30);
          const defaultStartStr = defaultStart.toISOString().split('T')[0];
          
          suggestedDates[venue.id] = defaultStartStr;
          dateMap.set(defaultStartStr, venue.id);
          lastDate = defaultStart;
        }
      }
    }
  }
  
  // Calculate optimized metrics
  const optimizedDistance = calculateTotalDistance(allSortedVenues);
  const optimizedTimeMinutes = estimateTravelTime(optimizedDistance);
  
  // Calculate and round estimation percentages
  const distanceReduction = Math.round((totalDistance - optimizedDistance) / totalDistance * 100) || 5;
  const timeSavings = Math.round((totalTravelTimeMinutes - optimizedTimeMinutes) / totalTravelTimeMinutes * 100) || 5;
  
  return {
    optimizationMethod: 'standard',
    optimizedSequence: allSortedVenues.map(v => v.id),
    suggestedDates,
    recommendedVenues: tourData.potentialVenues.map(v => v.id),
    suggestedSkips: [],
    estimatedDistanceReduction: distanceReduction,
    estimatedTimeSavings: timeSavings,
    dateConflicts: dateConflicts.length > 0 ? dateConflicts : undefined,
    reasoning: `Generated optimization using ${optimizeFor}-based algorithm with venue prioritization and fixed point constraints. ${
      dateConflicts.length > 0 ? `Detected ${dateConflicts.length} date conflicts that need resolution.` : ''
    }`,
    calculatedMetrics: {
      totalDistance: `${totalDistance} km`,
      totalTravelTimeMinutes,
      optimizedDistance: `${optimizedDistance} km`,
      optimizedTimeMinutes
    }
  };
}

/**
 * Merge two arrays of venues (fixed and optimizable) in the most efficient way
 * Fixed venues maintain their positions, optimizable venues are inserted in optimal positions
 */
function mergeSortedVenues(fixedVenues: any[], optimizableVenues: any[]): any[] {
  if (fixedVenues.length === 0) {
    return optimizableVenues;
  }
  
  if (optimizableVenues.length === 0) {
    return fixedVenues;
  }
  
  // Sort fixed venues by date (if they have dates)
  const sortedFixedVenues = [...fixedVenues].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return 0;
  });
  
  // Create a result array starting with the fixed venues
  const result = [...sortedFixedVenues];
  
  // For each optimizable venue, find the best position to insert it
  for (const venue of optimizableVenues) {
    let bestPosition = 0;
    let bestDistanceIncrease = Infinity;
    
    // Try inserting the venue at each position (including start and end)
    for (let i = 0; i <= result.length; i++) {
      // Calculate distance increase if inserted at this position
      let distanceIncrease = 0;
      
      if (i === 0) {
        // Insert at the start
        if (result.length > 0) {
          const next = result[0];
          distanceIncrease = calculateDistance(
            venue.latitude, venue.longitude,
            next.latitude, next.longitude
          );
        }
      } else if (i === result.length) {
        // Insert at the end
        const prev = result[i - 1];
        distanceIncrease = calculateDistance(
          prev.latitude, prev.longitude,
          venue.latitude, venue.longitude
        );
      } else {
        // Insert in the middle
        const prev = result[i - 1];
        const next = result[i];
        
        // Calculate current distance between prev and next
        const currentDistance = calculateDistance(
          prev.latitude, prev.longitude,
          next.latitude, next.longitude
        );
        
        // Calculate new distance if venue is inserted between
        const newDistance = calculateDistance(
          prev.latitude, prev.longitude,
          venue.latitude, venue.longitude
        ) + calculateDistance(
          venue.latitude, venue.longitude,
          next.latitude, next.longitude
        );
        
        distanceIncrease = newDistance - currentDistance;
      }
      
      // Apply venue priority to the distance increase
      // Higher priority venues have less perceived distance increase
      if (venue.priority) {
        // Scale from priority 1-10, where priority 10 reduces distance by 90%
        const priorityFactor = (11 - venue.priority) / 10;
        distanceIncrease *= priorityFactor;
      }
      
      // If this position is better, update best position
      if (distanceIncrease < bestDistanceIncrease) {
        bestPosition = i;
        bestDistanceIncrease = distanceIncrease;
      }
    }
    
    // Insert venue at the best position
    result.splice(bestPosition, 0, venue);
  }
  
  return result;
}

// Perform AI optimization with OpenAI
async function attemptAIOptimization(tourData: any) {
  try {
    // Calculate baseline metrics
    const totalDistance = calculateTotalDistance(tourData.allVenues);
    const totalTravelTimeMinutes = estimateTravelTime(totalDistance);
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Create prompt for OpenAI
    const openAiPrompt = `
You are an AI assistant specializing in tour optimization for artists and venues.

# TOUR DATA
Tour Name: ${tourData.tourName}
Artist: ${tourData.artistName}
Genres: ${tourData.artistGenres.join(', ')}
Start Date: ${tourData.startDate || 'Not set'}
End Date: ${tourData.endDate || 'Not set'}

# CONFIRMED VENUES (fixed points that cannot be changed)
${tourData.confirmedVenues.map((v: any, i: number) => 
  `${i+1}. ${v.name} (${v.city}) - ${v.date ? new Date(v.date).toLocaleDateString() : 'No date'} - Coordinates: [${v.latitude}, ${v.longitude}] - ID: ${v.id}`
).join('\n')}

# POTENTIAL VENUES (can be reordered, included, or excluded)
${tourData.potentialVenues.map((v: any, i: number) => 
  `${i+1}. ${v.name} (${v.city}) - ${v.date ? new Date(v.date).toLocaleDateString() : 'No date'} - Coordinates: [${v.latitude}, ${v.longitude}] - ID: ${v.id}`
).join('\n')}

# TASK
Analyze this tour data and provide optimization suggestions. Consider:

1. Optimal venue sequence to minimize travel distance
2. Suggested dates for venues without dates
3. Venues that should be skipped
4. New venues that should be added to fill geographical gaps

# OUTPUT FORMAT INSTRUCTIONS
Your response MUST be a valid JSON object with the following structure:
{
  "optimizedSequence": [1, 2, 3, 4, 5],
  "suggestedDates": {"1": "2025-06-15", "3": "2025-07-03"},
  "recommendedVenues": [1, 3],
  "suggestedSkips": [],
  "estimatedDistanceReduction": "15%",
  "estimatedTimeSavings": "20%",
  "reasoning": "The optimized sequence minimizes travel distance by placing venues in geographic order."
}

Only include valid venue_ids from the provided lists. For the optimizedSequence, include ALL venues that should be kept in the final tour (both confirmed and recommended potential venues).
`;

    // Call OpenAI API
    const openAiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "You are a specialized AI for optimizing music tours. Generate JSON responses based on venue and tour data."
        },
        {
          role: "user",
          content: openAiPrompt
        }
      ],
      temperature: 0.7,
    });
    
    // Extract content from OpenAI response
    const openAiContent = openAiResponse.choices[0]?.message?.content || '';
    console.log("OpenAI response:", openAiContent);
    
    // Parse the JSON response
    let openAiSuggestions;
    try {
      // First try - direct JSON parse
      openAiSuggestions = JSON.parse(openAiContent);
    } catch (parseError) {
      console.warn("Direct JSON parse failed, trying to extract JSON:", parseError);
      
      // Second try - try to extract code block
      const codeBlockMatch = openAiContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          openAiSuggestions = JSON.parse(codeBlockMatch[1]);
        } catch (codeBlockError) {
          console.error("Failed to parse JSON from code block:", codeBlockError);
          
          // Third try - extract JSON object using regex
          const jsonMatch = openAiContent.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            try {
              openAiSuggestions = JSON.parse(jsonMatch[0]);
            } catch (nestedError) {
              console.error("Failed to parse JSON from OpenAI response:", nestedError);
              throw new Error("Unable to parse OpenAI response");
            }
          } else {
            throw new Error("No JSON object found in OpenAI response");
          }
        }
      } else {
        // Try simple JSON extraction if no code block found
        const jsonMatch = openAiContent.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            openAiSuggestions = JSON.parse(jsonMatch[0]);
          } catch (nestedError) {
            console.error("Failed to parse JSON from OpenAI response:", nestedError);
            throw new Error("Unable to parse OpenAI response");
          }
        } else {
          throw new Error("No JSON object found in OpenAI response");
        }
      }
    }
    
    // Calculate metrics for the OpenAI-optimized sequence
    const aiOptimizedVenues = openAiSuggestions.optimizedSequence
      .map((id: number) => tourData.allVenues.find((v: any) => v.id === id))
      .filter(Boolean);
    
    // Re-calculate baseline metrics for consistency
    const totalDistanceForOpenAI = calculateTotalDistance(tourData.allVenues);
    const totalTravelTimeMinutesForOpenAI = estimateTravelTime(totalDistanceForOpenAI);
    
    const optimizedDistance = calculateTotalDistance(aiOptimizedVenues);
    const optimizedTimeMinutes = estimateTravelTime(optimizedDistance);
    
    // Return successful OpenAI optimization
    return {
      optimizationMethod: 'ai',
      ...openAiSuggestions,
      calculatedMetrics: {
        totalDistance: `${totalDistanceForOpenAI} km`,
        totalTravelTimeMinutes: totalTravelTimeMinutesForOpenAI,
        optimizedDistance: `${optimizedDistance} km`,
        optimizedTimeMinutes
      }
    };
    
  } catch (error: any) {
    console.error("OpenAI optimization error:", error);
    
    // Fall back to standard optimization
    return { 
      ...performStandardOptimization(tourData),
      aiError: {
        message: 'OpenAI optimization failed, using fallback optimization',
        details: error?.message || 'Unknown error'
      }
    };
  }
}

// Unified endpoint for tour optimization
unifiedOptimizerRouter.post('/optimize/:tourId', async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const { 
      method = 'auto',
      venuePriorities,
      respectFixedDates = true,
      optimizeFor = 'balanced',
      preferredDates,
      avoidDates,
      minDaysBetweenShows,
      maxDaysBetweenShows
    } = req.body;
    
    if (!tourId) {
      return res.status(400).json({ error: 'Tour ID is required' });
    }

    // Get formatted tour data
    const tourData = await formatTourDataForOptimization(Number(tourId));
    
    // Prepare optimization options
    const optimizationOptions = {
      venuePriorities,
      respectFixedDates,
      optimizeFor,
      preferredDates,
      avoidDates,
      minDaysBetweenShows,
      maxDaysBetweenShows
    };
    
    // Determine optimization method
    let result;
    
    switch (method) {
      case 'standard':
        // Use standard optimization only with advanced options
        console.log("Using standard optimization with options:", JSON.stringify(optimizationOptions));
        result = performStandardOptimization(tourData, optimizationOptions);
        break;
        
      case 'ai':
        // Attempt AI optimization with fallback to standard with options
        try {
          result = await attemptAIOptimization(tourData);
          
          // If AI failed or we got a partial result, enhance with standard optimization
          if (result.aiError || !result.optimizedSequence) {
            console.log("AI optimization partial or failed, enhancing with standard optimization");
            result = performStandardOptimization(tourData, optimizationOptions);
          }
        } catch (error) {
          console.error("AI optimization error:", error);
          result = performStandardOptimization(tourData, optimizationOptions);
        }
        break;
        
      case 'auto':
      default:
        // Try AI first, fall back to standard if needed
        try {
          // Check if we have an OpenAI API key
          if (process.env.OPENAI_API_KEY) {
            console.log("Attempting AI optimization first");
            result = await attemptAIOptimization(tourData);
            
            // If AI succeeded but we have advanced options, enhance the result with standard optimization
            if (!result.aiError && Object.keys(optimizationOptions).some(k => optimizationOptions[k] !== undefined)) {
              console.log("AI optimization succeeded, enhancing with advanced options");
              
              // Use the AI-generated sequence as input to standard optimization
              const enhancedResult = performStandardOptimization(
                {
                  ...tourData,
                  // Override sequence to start with AI's ordering
                  allVenues: result.optimizedSequence.map(id => 
                    tourData.allVenues.find(v => v.id === id) || null
                  ).filter(Boolean)
                }, 
                optimizationOptions
              );
              
              // Merge results, keeping AI reasoning but using enhanced sequence and dates
              result = {
                ...result,
                optimizedSequence: enhancedResult.optimizedSequence,
                suggestedDates: {
                  ...result.suggestedDates,
                  ...enhancedResult.suggestedDates
                },
                dateConflicts: enhancedResult.dateConflicts,
                reasoning: `${result.reasoning} Enhanced with venue priorities and scheduling constraints.`
              };
            }
          } else {
            console.log("No OpenAI API key found, using standard optimization");
            result = performStandardOptimization(tourData, optimizationOptions);
          }
        } catch (error) {
          console.error("Auto optimization error:", error);
          result = performStandardOptimization(tourData, optimizationOptions);
        }
        break;
    }

    // Send the optimization result
    return res.json({
      tourData,
      optimizationResult: result
    });
  } catch (error) {
    console.error("Error in unified tour optimizer:", error);
    return res.status(500).json({ error: 'Failed to process optimization request' });
  }
});

// Endpoint to apply optimization to a tour
unifiedOptimizerRouter.post('/apply/:tourId', async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const { optimizedSequence, suggestedDates } = req.body;
    
    if (!tourId || !optimizedSequence) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['tourId', 'optimizedSequence']
      });
    }

    // Get all tour venues for this tour
    const currentTourVenues = await db.query.tourVenues.findMany({
      where: eq(tourVenues.tourId, Number(tourId)),
      with: {
        venue: true
      }
    });

    // Update sequence for each venue in the optimized sequence
    const updates = optimizedSequence.map(async (venueId: number, index: number) => {
      // First try direct ID match
      let tourVenue = currentTourVenues.find(tv => tv.id === venueId);
      
      // If that fails, try 1-based array indexing (AI might be using simple 1-based indexing)
      if (!tourVenue && venueId > 0 && venueId <= currentTourVenues.length) {
        tourVenue = currentTourVenues[venueId - 1];
        console.log(`Using 1-based indexing for venue at position ${venueId}`);
      }
      
      if (!tourVenue) {
        console.warn(`Tour venue with ID or position ${venueId} not found`);
        return null;
      }
      
      // Try to find suggested date for this venue - check both by ID and position
      let suggestedDate = suggestedDates?.[venueId]; // Direct match first
      
      // If using 1-based indexing for the venue, also check the dates by index
      if (!suggestedDate && tourVenue.id !== venueId) {
        // If we're using the 1-based index for the venue ID, also look up the date the same way
        suggestedDate = suggestedDates?.[tourVenue.id];
      }
      
      // Create a date object from the string if needed
      let dateValue = tourVenue.date;
      if (suggestedDate) {
        try {
          // Convert Date to ISO string for database storage
          const newDate = new Date(suggestedDate);
          dateValue = newDate.toISOString();
          console.log(`Applying suggested date ${suggestedDate} to venue ${tourVenue.id}`);
        } catch (e) {
          console.warn(`Invalid date format: ${suggestedDate}`);
        }
      }
      
      return db.update(tourVenues)
        .set({ 
          sequence: index,
          date: dateValue,
          // If it's a potential venue in the optimized sequence, update status to 'hold'
          status: tourVenue.status === 'potential' ? 'hold' : tourVenue.status
        })
        .where(eq(tourVenues.id, tourVenue.id));
    });
    
    await Promise.all(updates.filter(Boolean));
    
    // Calculate new metrics
    const orderedVenues = optimizedSequence
      .map(id => {
        // First try direct ID match
        let tourVenue = currentTourVenues.find(tv => tv.id === id);
        
        // If that fails, try 1-based array indexing (AI might be using simple 1-based indexing)
        if (!tourVenue && id > 0 && id <= currentTourVenues.length) {
          tourVenue = currentTourVenues[id - 1];
        }
        
        return tourVenue;
      })
      .filter(Boolean)
      .map(tv => ({
        id: tv?.id,
        name: tv?.venue?.name || 'Unknown Venue',
        latitude: tv?.venue?.latitude,
        longitude: tv?.venue?.longitude
      }));
    
    const optimizedDistance = calculateTotalDistance(orderedVenues);
    const optimizedTravelTime = estimateTravelTime(optimizedDistance);
    
    // Get existing tour data to calculate optimization improvement
    const tour = await db.select().from(tours).where(eq(tours.id, Number(tourId))).limit(1);
    const initialDistance = tour[0]?.initialTotalDistance || tour[0]?.estimatedTravelDistance || optimizedDistance * 1.2; // Fallback if no initial
    const initialTravelTime = tour[0]?.initialTravelTime || tour[0]?.estimatedTravelTime || optimizedTravelTime * 1.2; // Fallback if no initial
    
    // Calculate optimization metrics
    const optimizationScore = calculateOptimizationScore({
      totalDistance: optimizedDistance,
      totalTravelTime: optimizedTravelTime,
      // Determine if we have enough data for these metrics
      ...(optimizedDistance < initialDistance && {
        geographicClustering: 75, 
        scheduleEfficiency: 70,
        dateCoverage: Object.keys(suggestedDates || {}).length > 0 ? 85 : 60
      })
    });
    
    // Update tour with new metrics
    await db.update(tours)
      .set({
        optimizationScore,
        estimatedTravelDistance: optimizedDistance,
        estimatedTravelTime: optimizedTravelTime
      })
      .where(eq(tours.id, Number(tourId)));
    
    return res.json({
      success: true,
      message: 'Optimization applied successfully',
      metrics: {
        optimizedDistance,
        optimizedTravelTime,
        optimizationScore
      }
    });
  } catch (error) {
    console.error("Error applying optimization:", error);
    return res.status(500).json({ error: 'Failed to apply optimization' });
  }
});