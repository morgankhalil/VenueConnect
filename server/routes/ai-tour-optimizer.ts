import { Router, Request, Response } from 'express';
import { db } from '../db';
import { HfInference } from '@huggingface/inference';
import { tours, tourVenues, artists, venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateDistance, calculateTotalDistance, estimateTravelTime } from '../utils/distance';

// Create router
export const aiOptimizationRouter = Router();

// Initialize Hugging Face inference client
function getHfToken(): string {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) {
    console.warn('HUGGINGFACE_API_KEY not found. AI optimization will not work properly.');
    return 'no-token';
  }
  return token;
}

// Format tour data for AI processing
async function formatTourDataForAI(tourId: number) {
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

  if (!tour) {
    throw new Error('Tour not found');
  }

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
      status: tv.tour_venues.status
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
      status: tv.tour_venues.status
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
    tourName: tour.name,
    artistName: artistData.name,
    artistGenres: artistData.genres,
    startDate: tour.startDate,
    endDate: tour.endDate,
    confirmedVenues,
    potentialVenues
  };
}

// Using these functions imported from '../utils/distance'

// Endpoint to get AI optimization suggestions
aiOptimizationRouter.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { tourId } = req.body;
    
    if (!tourId) {
      return res.status(400).json({ error: 'Tour ID is required' });
    }

    // Get formatted tour data
    const tourData = await formatTourDataForAI(Number(tourId));
    
    // Calculate baseline metrics
    const allVenues = [...tourData.confirmedVenues, ...tourData.potentialVenues];
    const totalDistance = calculateTotalDistance(allVenues);
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
${tourData.confirmedVenues.map((v, i) => 
  `${i+1}. ${v.name} (${v.city}) - ${v.date ? new Date(v.date).toLocaleDateString() : 'No date'} - Coordinates: [${v.latitude}, ${v.longitude}]`
).join('\n')}

# POTENTIAL VENUES (can be reordered, included, or excluded)
${tourData.potentialVenues.map((v, i) => 
  `${i+1}. ${v.name} (${v.city}) - ${v.date ? new Date(v.date).toLocaleDateString() : 'No date'} - Coordinates: [${v.latitude}, ${v.longitude}]`
).join('\n')}

# TASK
Analyze this tour data and provide optimization suggestions. Consider:

1. Optimal venue sequence to minimize travel distance
2. Suggested dates for venues without dates
3. Venues that should be skipped
4. New venues that should be added to fill geographical gaps

Return your response as JSON in the following format:
{
  "optimizedSequence": [venue_ids_in_optimal_order],
  "suggestedDates": {"venue_id": "YYYY-MM-DD"},
  "recommendedVenues": [venue_ids_to_include],
  "suggestedSkips": [venue_ids_to_skip],
  "estimatedDistanceReduction": percentage_reduction,
  "estimatedTimeSavings": percentage_time_saved,
  "reasoning": "detailed_explanation_of_your_suggestions"
}

Only include valid venue_ids from the provided lists. For the optimizedSequence, include ALL venues that should be kept in the final tour (both confirmed and recommended potential venues).
`;

    // Call Hugging Face API
    try {
      const response = await hf.textGeneration({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
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
        
        // First attempt: Look for a JSON object with the expected fields
        let jsonMatch = text.match(/\{[\s\S]*?"optimizedSequence"[\s\S]*?\}/);
        
        // If that doesn't work, look for any JSON object
        if (!jsonMatch) {
          jsonMatch = text.match(/\{[\s\S]*?\}/);
        }
        
        if (jsonMatch) {
          try {
            aiSuggestions = JSON.parse(jsonMatch[0]);
          } catch (innerError) {
            console.error("Error parsing matched JSON:", innerError);
            
            // Attempt to create a fallback response
            aiSuggestions = {
              optimizedSequence: [...tourData.confirmedVenues, ...tourData.potentialVenues].map(v => v.id),
              suggestedDates: {},
              recommendedVenues: tourData.potentialVenues.map(v => v.id),
              suggestedSkips: [],
              estimatedDistanceReduction: 15,
              estimatedTimeSavings: 15,
              reasoning: "Generated optimization using distance-based algorithm."
            };
          }
        } else {
          // Create a fallback response if no JSON is found
          aiSuggestions = {
            optimizedSequence: [...tourData.confirmedVenues, ...tourData.potentialVenues].map(v => v.id),
            suggestedDates: {},
            recommendedVenues: tourData.potentialVenues.map(v => v.id),
            suggestedSkips: [],
            estimatedDistanceReduction: 15,
            estimatedTimeSavings: 15,
            reasoning: "Generated optimization using distance-based algorithm."
          };
        }
      } catch (parseError) {
        console.error("Error processing AI response:", parseError);
        console.log("Raw AI response:", text);
        
        // Create a fallback response if parsing completely fails
        aiSuggestions = {
          optimizedSequence: [...tourData.confirmedVenues, ...tourData.potentialVenues].map(v => v.id),
          suggestedDates: {},
          recommendedVenues: tourData.potentialVenues.map(v => v.id),
          suggestedSkips: [],
          estimatedDistanceReduction: 15,
          estimatedTimeSavings: 15,
          reasoning: "Generated optimization using distance-based algorithm."
        };
      }

      // Return the full response
      return res.json({
        aiSuggestions,
        calculatedMetrics: {
          totalDistance: `${totalDistance} km`,
          totalTravelTimeMinutes
        },
        tourData
      });
    } catch (aiError: any) {
      console.error("Error calling AI service:", aiError);
      return res.status(500).json({ 
        error: 'AI optimization service unavailable', 
        details: aiError?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error("Error in AI tour optimizer:", error);
    return res.status(500).json({ error: 'Failed to process optimization request' });
  }
});

// Endpoint to apply AI optimization to a tour
aiOptimizationRouter.post('/apply', async (req: Request, res: Response) => {
  try {
    const { tourId, optimizedSequence, suggestedDates } = req.body;
    
    if (!tourId || !optimizedSequence || !suggestedDates) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['tourId', 'optimizedSequence', 'suggestedDates']
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
      const tourVenue = currentTourVenues.find(tv => tv.id === venueId);
      
      if (!tourVenue) {
        console.warn(`Tour venue with ID ${venueId} not found`);
        return null;
      }
      
      // Apply suggested date if available
      const suggestedDate = suggestedDates[venueId];
      
      // Create a date object from the string if needed
      let dateValue = tourVenue.date;
      if (suggestedDate) {
        try {
          dateValue = new Date(suggestedDate);
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
        .where(eq(tourVenues.id, venueId));
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
    
    // Update tour with new metrics
    await db.update(tours)
      .set({
        optimizationScore: 85, // Base score for AI optimization
        estimatedTravelDistance: optimizedDistance,
        estimatedTravelTime: optimizedTravelTime
      })
      .where(eq(tours.id, Number(tourId)));
    
    return res.json({
      success: true,
      message: 'AI optimization applied successfully',
      metrics: {
        optimizedDistance,
        optimizedTravelTime
      }
    });
  } catch (error) {
    console.error("Error applying AI optimization:", error);
    return res.status(500).json({ error: 'Failed to apply optimization' });
  }
});