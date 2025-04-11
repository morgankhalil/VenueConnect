import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BrainCircuit, CheckCircle, Loader2, Map, Send, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Type definitions for AI optimization
type VenueData = {
  id: number;
  venueId: number;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  date: string | null;
  isFixed: boolean;
  status: string;
};

type AiSuggestion = {
  optimizedSequence: number[];
  suggestedDates: Record<string, string>;
  recommendedVenues: number[];
  suggestedSkips: number[];
  estimatedDistanceReduction: number;
  estimatedTimeSavings: number;
  reasoning: string;
};

type TourData = {
  tourName: string;
  artistName: string;
  artistGenres: string[];
  startDate: string | null;
  endDate: string | null;
  confirmedVenues: VenueData[];
  potentialVenues: VenueData[];
};

type AiOptimizationResponse = {
  aiSuggestions: AiSuggestion;
  calculatedMetrics: {
    totalDistance: string;
    totalTravelTimeMinutes: number;
  };
  tourData: TourData;
};

export function AITourOptimizer({ tourId, onApplyChanges }: { tourId: number; onApplyChanges?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiOptimizationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const optimizeTour = async () => {
    setOptimizing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-optimization/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tourId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get AI optimization suggestions');
      }
      
      const data: AiOptimizationResponse = await response.json();
      setAiResponse(data);
      setShowResults(true);
      
    } catch (err: any) {
      console.error('Error optimizing tour:', err);
      setError(err.message || 'An error occurred while optimizing the tour');
      toast({
        title: 'Optimization Error',
        description: err.message || 'Failed to get AI optimization suggestions',
        variant: 'destructive',
      });
    } finally {
      setOptimizing(false);
    }
  };
  
  const applyOptimization = async () => {
    if (!aiResponse?.aiSuggestions) return;
    
    setApplying(true);
    
    try {
      const response = await fetch('/api/ai-optimization/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tourId,
          optimizedSequence: aiResponse.aiSuggestions.optimizedSequence,
          suggestedDates: aiResponse.aiSuggestions.suggestedDates,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply AI optimization');
      }
      
      toast({
        title: 'Success',
        description: 'AI optimization applied successfully',
        variant: 'default',
      });
      
      setShowResults(false);
      
      // Callback to refresh parent component if provided
      if (onApplyChanges) {
        onApplyChanges();
      }
      
    } catch (err: any) {
      console.error('Error applying optimization:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to apply AI optimization',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Tour Optimizer
          </CardTitle>
          <CardDescription>
            Let our AI analyze your tour and suggest improvements to minimize travel time and distance
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="bg-primary/10">
                <Star className="h-3 w-3 mr-1 text-primary" /> AI-Powered
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                <Map className="h-3 w-3 mr-1 text-primary" /> Route Optimization
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Our AI can analyze your tour's confirmed and potential venues to suggest the most efficient route,
              potentially reducing travel distance by up to 30% and saving valuable time on the road.
            </p>
            
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Key features:</p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Optimize routing between venues to minimize travel</li>
                <li>Suggest optimal dates for booking potential venues</li>
                <li>Identify which potential venues fit best in your route</li>
                <li>Preserve your confirmed bookings while optimizing around them</li>
              </ul>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button
            onClick={optimizeTour}
            disabled={optimizing}
            className="w-full"
          >
            {optimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Analyzing Tour Data...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" /> 
                Start AI Optimization
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              AI Optimization Results
            </DialogTitle>
            <DialogDescription>
              {aiResponse?.tourData?.tourName} - {aiResponse?.tourData?.artistName}
            </DialogDescription>
          </DialogHeader>
          
          {aiResponse && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Distance Reduction</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-primary">
                      {aiResponse.aiSuggestions.estimatedDistanceReduction}%
                    </div>
                    <Progress 
                      value={aiResponse.aiSuggestions.estimatedDistanceReduction} 
                      className="h-2 mt-2" 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Travel Time Savings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-primary">
                      {aiResponse.aiSuggestions.estimatedTimeSavings} min
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.floor(aiResponse.aiSuggestions.estimatedTimeSavings / 60)} hours {aiResponse.aiSuggestions.estimatedTimeSavings % 60} minutes
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">
                      {aiResponse.calculatedMetrics.totalDistance} km
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Optimized route total distance
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Venue Sequence */}
              <div>
                <h3 className="text-lg font-medium mb-3">Optimized Venue Sequence</h3>
                <div className="rounded-md border">
                  <div className="flex flex-col divide-y">
                    {aiResponse.aiSuggestions.optimizedSequence.map((venueId, index) => {
                      // Find venue details from either confirmed or potential venues
                      const venue = [...aiResponse.tourData.confirmedVenues, ...aiResponse.tourData.potentialVenues]
                        .find(v => v.id === venueId || v.venueId === venueId);
                        
                      if (!venue) return null;
                      
                      // Get suggested date if available
                      const suggestedDate = aiResponse.aiSuggestions.suggestedDates[venueId];
                      const displayDate = venue.isFixed ? 
                        (venue.date ? new Date(venue.date).toLocaleDateString() : 'No date') : 
                        (suggestedDate ? new Date(suggestedDate).toLocaleDateString() : 'Suggested date pending');
                      
                      const isRecommended = aiResponse.aiSuggestions.recommendedVenues.includes(venueId);
                      const isSkippable = aiResponse.aiSuggestions.suggestedSkips.includes(venueId);
                      
                      return (
                        <div 
                          key={`venue-${venueId}-${index}`} 
                          className={`p-3 flex justify-between items-center ${
                            venue.isFixed ? 'bg-muted/30' : 
                            isRecommended ? 'bg-green-50/50 dark:bg-green-950/20' : 
                            isSkippable ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{venue.name}</div>
                              <div className="text-sm text-muted-foreground">{venue.city}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {venue.isFixed && (
                              <Badge variant="outline" className="bg-muted/50">
                                Fixed
                              </Badge>
                            )}
                            
                            {isRecommended && !venue.isFixed && (
                              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Recommended
                              </Badge>
                            )}
                            
                            {isSkippable && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                Optional
                              </Badge>
                            )}
                            
                            <div className="text-sm">
                              {displayDate}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* AI Reasoning */}
              <div>
                <h3 className="text-lg font-medium mb-2">AI Reasoning</h3>
                <Card>
                  <CardContent className="p-4 text-sm whitespace-pre-line">
                    {aiResponse.aiSuggestions.reasoning}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex sm:justify-between gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyOptimization} 
              disabled={applying}
              className="min-w-[120px]"
            >
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" /> 
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}