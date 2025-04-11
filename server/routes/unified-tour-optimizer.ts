/**
 * Unified Tour Optimizer
 * 
 * This module merges the standard optimization and AI optimization approaches
 * to provide a consistent interface for tour optimization.
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

// Import AI optimization client
import { HfInference } from '@huggingface/inference';

// Create router for the unified optimizer
export const unifiedOptimizerRouter = Router();

// Get Hugging Face API token with fallback
function getHfToken(): string {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) {
    console.warn('HUGGINGFACE_API_KEY not found. AI optimization will fall back to utility-based optimization.');
    return 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  }
  return token;
}

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
function performStandardOptimization(tourData: any) {
  // Calculate baseline metrics
  const totalDistance = calculateTotalDistance(tourData.allVenues);
  const totalTravelTimeMinutes = estimateTravelTime(totalDistance);
  
  // Sort venues by latitude as a simple optimization strategy
  const sortedVenues = [...tourData.allVenues].sort((a, b) => {
    if (a.latitude && b.latitude) {
      return a.latitude - b.latitude;
    }
    return 0;
  });
  
  // Calculate optimized metrics
  const optimizedDistance = calculateTotalDistance(sortedVenues);
  const optimizedTimeMinutes = estimateTravelTime(optimizedDistance);
  
  // Calculate and round estimation percentages
  const distanceReduction = Math.round((totalDistance - optimizedDistance) / totalDistance * 100) || 10;
  const timeSavings = Math.round((totalTravelTimeMinutes - optimizedTimeMinutes) / totalTravelTimeMinutes * 100) || 10;
  
  return {
    optimizationMethod: 'standard',
    optimizedSequence: sortedVenues.map(v => v.id),
    suggestedDates: {},
    recommendedVenues: tourData.potentialVenues.map(v => v.id),
    suggestedSkips: [],
    estimatedDistanceReduction: distanceReduction,
    estimatedTimeSavings: timeSavings,
    reasoning: "Generated optimization using distance-based algorithm. Venues are ordered from north to south to create a direct route.",
    calculatedMetrics: {
      totalDistance: `${totalDistance} km`,
      totalTravelTimeMinutes,
      optimizedDistance: `${optimizedDistance} km`,
      optimizedTimeMinutes
    }
  };
}

// Attempt AI optimization with fallback to standard optimization
async function attemptAIOptimization(tourData: any) {
  try {
    // Calculate baseline metrics
    const totalDistance = calculateTotalDistance(tourData.allVenues);
    const totalTravelTimeMinutes = estimateTravelTime(totalDistance);
    
    // Create inference client with API key
    const hf = new HfInference(getHfToken());
    
    // Define prompt for the AI model
    const prompt = `
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
Your response MUST include ONLY a valid JSON object enclosed in triple backticks with the json tag.
Example:
\`\`\`json
{
  "optimizedSequence": [1, 2, 3, 4, 5],
  "suggestedDates": {"1": "2025-06-15", "3": "2025-07-03"},
  "recommendedVenues": [1, 3],
  "suggestedSkips": [],
  "estimatedDistanceReduction": "15%",
  "estimatedTimeSavings": "20%",
  "reasoning": "The optimized sequence minimizes travel distance by placing venues in geographic order."
}
\`\`\`

Do not include any text before or after the JSON code block. Only include valid venue_ids from the provided lists. For the optimizedSequence, include ALL venues that should be kept in the final tour (both confirmed and recommended potential venues).
`;
    
    // Call Hugging Face API
    const response = await hf.textGeneration({
      // Use a more widely accessible model
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: prompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
        return_full_text: false
      }
    });

    // Extract JSON from the response
    const text = response.generated_text;
    let aiSuggestions;
    
    try {
      // Try to find a JSON object in the response
      console.log("Raw AI response:", text);
      
      // First attempt: Look for code block with JSON - This addresses multi-line JSON responses
      // that might be formatted as Markdown code blocks
      let jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          aiSuggestions = JSON.parse(jsonMatch[1]);
          console.log("Successfully parsed JSON from code block");
        } catch (err) {
          console.warn("Error parsing JSON from code block:", err);
          jsonMatch = null; // Reset to try other methods
        }
      }
      
      // Second attempt: Look for a JSON object with the expected fields
      if (!aiSuggestions) {
        jsonMatch = text.match(/\{[\s\S]*?"optimizedSequence"[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            aiSuggestions = JSON.parse(jsonMatch[0]);
            console.log("Successfully parsed JSON with optimizedSequence field");
          } catch (err) {
            console.warn("Error parsing JSON with optimizedSequence field:", err);
          }
        }
      }
      
      // Third attempt: Look for any JSON object
      if (!aiSuggestions) {
        jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            aiSuggestions = JSON.parse(jsonMatch[0]);
            console.log("Successfully parsed generic JSON object");
          } catch (err) {
            console.warn("Error parsing generic JSON object:", err);
          }
        }
      }
      
      // If no JSON could be parsed, create a fallback response
      if (!aiSuggestions) {
        // Extract the sequence from the text based on common patterns
        // Often the model will describe the sequence in natural language first
        const sequenceMatch = text.match(/optimal sequence(?:.*?)(?:is|:)(?:.*?)([0-9][0-9,\s]*[0-9])/i);
        if (sequenceMatch) {
          const sequence = sequenceMatch[1].split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          if (sequence.length > 0) {
            console.log("Extracted sequence from text:", sequence);
            aiSuggestions = {
              optimizedSequence: sequence,
              suggestedDates: {},
              recommendedVenues: [],
              suggestedSkips: [],
              estimatedDistanceReduction: "10%",
              estimatedTimeSavings: "15%",
              reasoning: "Extracted from AI natural language response"
            };
          }
        }
      }
      
      if (!aiSuggestions) {
        throw new Error("Failed to parse AI response");
      }
    } catch (parseError: any) {
      console.error("Error processing AI response:", parseError);
      // Fall back to standard optimization if parsing fails
      return { 
        ...performStandardOptimization(tourData),
        aiError: {
          message: 'Error parsing AI response, using fallback optimization',
          details: parseError?.message || 'Unknown parsing error'
        }
      };
    }

    // Calculate metrics for the AI-optimized sequence
    const aiOptimizedVenues = aiSuggestions.optimizedSequence
      .map((id: number) => tourData.allVenues.find((v: any) => v.id === id))
      .filter(Boolean);
    
    const optimizedDistance = calculateTotalDistance(aiOptimizedVenues);
    const optimizedTimeMinutes = estimateTravelTime(optimizedDistance);

    // Return successful AI optimization
    return {
      optimizationMethod: 'ai',
      ...aiSuggestions,
      calculatedMetrics: {
        totalDistance: `${totalDistance} km`,
        totalTravelTimeMinutes,
        optimizedDistance: `${optimizedDistance} km`,
        optimizedTimeMinutes
      }
    };
  } catch (aiError: any) {
    console.error("Error calling AI service:", aiError);
    
    // Fall back to standard optimization
    return { 
      ...performStandardOptimization(tourData),
      aiError: {
        message: 'AI service unavailable, using fallback optimization',
        details: aiError?.message || 'Unknown error'
      }
    };
  }
}

// Unified endpoint for tour optimization
unifiedOptimizerRouter.post('/optimize/:tourId', async (req: Request, res: Response) => {
  try {
    const { tourId } = req.params;
    const { method = 'auto' } = req.body;
    
    if (!tourId) {
      return res.status(400).json({ error: 'Tour ID is required' });
    }

    // Get formatted tour data
    const tourData = await formatTourDataForOptimization(Number(tourId));
    
    // Determine optimization method
    let result;
    
    switch (method) {
      case 'standard':
        // Use standard optimization only
        result = performStandardOptimization(tourData);
        break;
        
      case 'ai':
        // Attempt AI optimization with fallback
        result = await attemptAIOptimization(tourData);
        break;
        
      case 'auto':
      default:
        // Try AI first, fall back to standard if needed
        try {
          // Check if we have a Hugging Face API key
          if (process.env.HUGGINGFACE_API_KEY) {
            result = await attemptAIOptimization(tourData);
          } else {
            result = performStandardOptimization(tourData);
          }
        } catch (error) {
          console.error("Auto optimization error:", error);
          result = performStandardOptimization(tourData);
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
      
      // Apply suggested date if available
      const suggestedDate = suggestedDates?.[venueId];
      
      // Create a date object from the string if needed
      let dateValue = tourVenue.date;
      if (suggestedDate) {
        try {
          // Convert Date to ISO string for database storage
          const newDate = new Date(suggestedDate);
          dateValue = newDate.toISOString();
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
      .map(id => currentTourVenues.find(tv => tv.id === id))
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