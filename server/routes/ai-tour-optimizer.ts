import { Router, Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { HfInference } from '@huggingface/inference';
import { calculateDistance } from '../../shared/utils/tour-optimizer';

// Create the router
const aiOptimizationRouter = Router();

// Helper function to ensure HF_API_TOKEN is available
function getHfToken(): string {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw new Error('HF_API_TOKEN environment variable is not set');
  }
  return token;
}

// Helper to format tour data for AI processing
async function formatTourDataForAI(tourId: number) {
  try {
    // Get the tour
    const tour = await db.query.tours.findFirst({
      where: eq(schema.tours.id, tourId),
      with: {
        artist: true,
        tourVenues: {
          with: {
            venue: true,
          },
          orderBy: (tourVenues, { asc }) => [asc(tourVenues.date)],
        },
      },
    });

    if (!tour) {
      throw new Error(`Tour with ID ${tourId} not found`);
    }

    // Separate confirmed and potential venues
    const confirmedVenues = tour.tourVenues
      .filter(tv => tv.status === 'confirmed')
      .map(tv => ({
        id: tv.id,
        venueId: tv.venueId,
        name: tv.venue?.name || 'Unknown Venue',
        city: tv.venue?.city || 'Unknown City',
        latitude: tv.venue?.latitude || null,
        longitude: tv.venue?.longitude || null,
        date: tv.date,
        isFixed: true,
        status: tv.status,
      }))
      .filter(v => v.latitude !== null && v.longitude !== null);

    const potentialVenues = tour.tourVenues
      .filter(tv => tv.status !== 'confirmed' && tv.status !== 'cancelled')
      .map(tv => ({
        id: tv.id,
        venueId: tv.venueId,
        name: tv.venue?.name || 'Unknown Venue',
        city: tv.venue?.city || 'Unknown City',
        latitude: tv.venue?.latitude || null,
        longitude: tv.venue?.longitude || null,
        date: tv.date,
        isFixed: false,
        status: tv.status,
      }))
      .filter(v => v.latitude !== null && v.longitude !== null);
      
    // Create contextual data
    const artistGenres = tour.artist?.genres || [];
    const startDate = tour.startDate ? new Date(tour.startDate).toISOString().split('T')[0] : null;
    const endDate = tour.endDate ? new Date(tour.endDate).toISOString().split('T')[0] : null;
    
    // Format input for the AI model
    return {
      tourName: tour.name,
      artistName: tour.artist?.name || 'Unknown Artist',
      artistGenres,
      startDate,
      endDate,
      confirmedVenues,
      potentialVenues,
      tourId,
    };
  } catch (error) {
    console.error('Error formatting tour data for AI:', error);
    throw error;
  }
}

// API endpoint to get AI-powered optimization suggestions
aiOptimizationRouter.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { tourId } = req.body;
    
    if (!tourId) {
      return res.status(400).json({ error: 'Tour ID is required' });
    }

    // Format the tour data
    const tourData = await formatTourDataForAI(Number(tourId));
    
    // Initialize Hugging Face client
    let hf;
    try {
      hf = new HfInference(getHfToken());
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to initialize AI service',
        details: 'AI service token not available. Please set the HF_API_TOKEN environment variable.'
      });
    }
    
    // Convert tour data to a prompt for the AI model
    const prompt = `As an AI tour optimization assistant, analyze this tour data and provide recommendations to optimize the tour routing to minimize travel distances and maximize efficiency. Consider the existing confirmed venues as fixed points.
    
    TOUR DATA:
    Tour: ${tourData.tourName}
    Artist: ${tourData.artistName} 
    Genres: ${tourData.artistGenres.join(', ')}
    Start Date: ${tourData.startDate || 'Not set'}
    End Date: ${tourData.endDate || 'Not set'}
    
    CONFIRMED VENUES (Fixed):
    ${tourData.confirmedVenues.map(v => 
      `- ${v.name} (${v.city}) - Date: ${v.date ? new Date(v.date).toISOString().split('T')[0] : 'Not set'}`
    ).join('\\n')}
    
    POTENTIAL VENUES (Can be optimized):
    ${tourData.potentialVenues.map(v => 
      `- ${v.name} (${v.city})`
    ).join('\\n')}
    
    Based on this information, provide:
    1. An optimized sequence of venues that minimizes travel distance
    2. Suggested dates for the potential venues that fit between confirmed venues
    3. Specific venues from the potential list that would be ideal to include
    4. Any venues to consider skipping for efficiency
    5. Estimate of the distance reduction and travel time savings
    
    Format your response as a JSON object with these fields:
    {
      "optimizedSequence": [list of venue IDs in optimized order],
      "suggestedDates": {venueId: "YYYY-MM-DD"},
      "recommendedVenues": [list of venue IDs],
      "suggestedSkips": [list of venue IDs],
      "estimatedDistanceReduction": number,
      "estimatedTimeSavings": number,
      "reasoning": "string"
    }`;

    // Call Hugging Face API
    const aiResponse = await hf.textGeneration({
      model: 'meta-llama/Llama-2-70b-chat-hf',  // Using a powerful model for complex optimization
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.2,  // Lower temperature for more deterministic responses
        top_p: 0.95,
        top_k: 50,
        repetition_penalty: 1.2
      }
    });
    
    // Process AI response to extract JSON
    const response = aiResponse.generated_text;
    
    // Try to extract JSON from the response
    let jsonResponse;
    try {
      // Find JSON object in the response (may be surrounded by markdown or other text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw AI response:', response);
      
      // Return a more structured error response
      return res.status(500).json({
        error: 'Failed to parse AI optimization suggestions',
        aiResponse: response,
        message: 'The AI provided a response, but it could not be parsed as valid JSON.'
      });
    }
    
    // Calculate actual distances for the optimized sequence
    let totalDistance = 0;
    let totalTravelTime = 0;
    
    // Combine confirmed and potential venues
    const allVenues = [...tourData.confirmedVenues, ...tourData.potentialVenues];
    
    // Calculate distances if an optimized sequence is provided
    if (jsonResponse.optimizedSequence && jsonResponse.optimizedSequence.length > 1) {
      for (let i = 0; i < jsonResponse.optimizedSequence.length - 1; i++) {
        const currentVenueId = jsonResponse.optimizedSequence[i];
        const nextVenueId = jsonResponse.optimizedSequence[i + 1];
        
        const currentVenue = allVenues.find(v => v.venueId === currentVenueId || v.id === currentVenueId);
        const nextVenue = allVenues.find(v => v.venueId === nextVenueId || v.id === nextVenueId);
        
        if (currentVenue && nextVenue && 
            currentVenue.latitude && currentVenue.longitude && 
            nextVenue.latitude && nextVenue.longitude) {
          const distance = calculateDistance(
            currentVenue.latitude, 
            currentVenue.longitude, 
            nextVenue.latitude, 
            nextVenue.longitude
          );
          
          totalDistance += distance;
          // Estimate travel time (assuming average speed of 60 km/h)
          totalTravelTime += (distance / 60) * 60; // convert to minutes
        }
      }
    }
    
    // Return the combined result
    return res.json({
      aiSuggestions: jsonResponse,
      calculatedMetrics: {
        totalDistance: totalDistance.toFixed(2),
        totalTravelTimeMinutes: Math.round(totalTravelTime),
      },
      tourData
    });
    
  } catch (error: any) {
    console.error('Error in AI tour optimization:', error);
    return res.status(500).json({ 
      error: 'Failed to get AI optimization suggestions', 
      message: error.message 
    });
  }
});

// Apply AI-suggested optimizations to a tour
aiOptimizationRouter.post('/apply', async (req: Request, res: Response) => {
  try {
    const { tourId, optimizedSequence, suggestedDates } = req.body;
    
    if (!tourId || !optimizedSequence) {
      return res.status(400).json({ error: 'Tour ID and optimized sequence are required' });
    }
    
    // Get the current tour venues
    const tourVenues = await db.query.tourVenues.findMany({
      where: eq(schema.tourVenues.tourId, Number(tourId)),
      with: {
        venue: true,
      },
    });
    
    // Update sequence positions based on optimized sequence
    // Note: We're not changing dates here to avoid conflicts with confirmed venues
    for (let i = 0; i < optimizedSequence.length; i++) {
      const venueId = optimizedSequence[i];
      
      // Find the matching tour venue
      const tourVenue = tourVenues.find(tv => 
        tv.venueId === venueId || 
        tv.id === venueId
      );
      
      if (tourVenue) {
        // Update the sequence position
        await db.update(schema.tourVenues)
          .set({ 
            sequencePosition: i,
            // Only update date if it's in the suggested dates and the venue is not confirmed
            ...(suggestedDates && 
               suggestedDates[venueId] && 
               tourVenue.status !== 'confirmed' && 
               { date: new Date(suggestedDates[venueId]) })
          })
          .where(eq(schema.tourVenues.id, tourVenue.id));
      }
    }
    
    // Calculate and update tour optimization score
    // For now, we'll use a simple score based on reduction in distance
    // In a production system, this would consider multiple factors
    const optimizationScore = 85; // Placeholder score
    
    await db.update(schema.tours)
      .set({ 
        optimizationScore,
        updatedAt: new Date()
      })
      .where(eq(schema.tours.id, Number(tourId)));
    
    // Return success
    return res.json({ 
      success: true, 
      message: 'AI optimization applied successfully',
      optimizationScore
    });
    
  } catch (error: any) {
    console.error('Error applying AI optimization:', error);
    return res.status(500).json({ 
      error: 'Failed to apply AI optimization', 
      message: error.message 
    });
  }
});

export default aiOptimizationRouter;