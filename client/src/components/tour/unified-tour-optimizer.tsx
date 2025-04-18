import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUnifiedOptimization, applyUnifiedOptimization } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  RotateCw, 
  Check, 
  Calendar, 
  MapPin, 
  Sliders, 
  ArrowRight, 
  LucideMapPinned,
  Brain,
  BarChart3 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Type for venue data
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
  sequence: number | null;
};

// Type for optimization result
type OptimizationResult = {
  optimizationMethod: 'standard' | 'ai';
  optimizedSequence: number[];
  suggestedDates: Record<string, string>;
  recommendedVenues: number[];
  suggestedSkips: number[];
  estimatedDistanceReduction: number;
  estimatedTimeSavings: number;
  reasoning: string;
  calculatedMetrics: {
    totalDistance: string;
    totalTravelTimeMinutes: number;
    optimizedDistance: string;
    optimizedTimeMinutes: number;
  };
  aiError?: {
    message: string;
    details: string;
  };
};

// Type for tour data
type TourData = {
  tourId: number;
  tourName: string;
  artistName: string;
  artistGenres: string[];
  startDate: string;
  endDate: string;
  confirmedVenues: VenueData[];
  potentialVenues: VenueData[];
  allVenues: VenueData[];
};

type UnifiedOptimizationResponse = {
  tourData: TourData;
  optimizationResult: OptimizationResult;
};

type UnifiedTourOptimizerProps = {
  tourId: number;
  onApplyChanges?: () => void;
};

export function UnifiedTourOptimizer({ tourId, onApplyChanges }: UnifiedTourOptimizerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [optimizationMethod, setOptimizationMethod] = useState<'standard' | 'ai' | 'auto'>('auto');
  const { toast } = useToast();

  // Advanced optimization options
  const [optimizationOptions, setOptimizationOptions] = useState({
    method: optimizationMethod,
    respectFixedDates: true,
    optimizeFor: 'balanced' as 'balanced' | 'distance' | 'time'
  });

  // Update optimization options when method changes
  React.useEffect(() => {
    setOptimizationOptions(prev => ({
      ...prev,
      method: optimizationMethod
    }));
  }, [optimizationMethod]);

  // Fetch optimization suggestions
  const { data, isLoading, isError, error, refetch } = useQuery<UnifiedOptimizationResponse>({
    queryKey: ['unified-tour-optimization', tourId, optimizationOptions],
    queryFn: async () => {
      const response = await getUnifiedOptimization(tourId, optimizationOptions);
      return response;
    },
    enabled: false, // Don't fetch on component mount
  });

  // Apply optimization mutation
  const { mutate: applyOptimization, isPending: isApplying } = useMutation({
    mutationFn: async () => {
      if (!data?.optimizationResult) return;
      
      const { optimizedSequence, suggestedDates } = data.optimizationResult;
      return await applyUnifiedOptimization(tourId, optimizedSequence, suggestedDates);
    },
    onSuccess: () => {
      // Check if we're using the fallback optimization (presence of aiError)
      const isUsingFallback = data?.optimizationResult?.aiError !== undefined;
      const isAiOptimization = data?.optimizationResult?.optimizationMethod === 'ai';
      
      toast({
        title: isUsingFallback 
          ? 'Standard optimization applied' 
          : isAiOptimization 
            ? 'AI optimization applied'
            : 'Optimization applied',
        description: isUsingFallback 
          ? 'Your tour has been optimized using standard algorithm (AI service unavailable)'
          : isAiOptimization
            ? 'Your tour has been optimized with AI suggestions'
            : 'Your tour has been optimized for efficiency',
      });
      
      // Close the dialog
      setOpen(false);
      
      // Invalidate tour queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
      
      // If we were called from a route like /tours/{id}/optimize, 
      // navigate back to the tour detail page
      if (window.location.pathname.includes('/optimize')) {
        window.location.href = `/tours/${tourId}`;
        return; // Return early to avoid executing callback
      }
      
      // Call the callback if provided (only if not redirecting)
      if (onApplyChanges) {
        onApplyChanges();
      }
    },
    onError: (err: any) => {
      // Provide more detailed error message if available
      const isApiKeyError = err?.message?.includes('API key') || err?.message?.includes('token');
      
      toast({
        title: isApiKeyError ? 'AI Service Unavailable' : 'Error applying optimization',
        description: isApiKeyError 
          ? 'The system has applied standard optimization instead.'
          : 'There was a problem applying the optimization. Please try again.',
        variant: data?.optimizationResult?.aiError ? 'default' : 'destructive',
      });
      
      // If we have fallback data, still consider it successful and close
      if (data?.optimizationResult?.aiError) {
        setOpen(false);
        
        // Still invalidate queries to refresh the tour data
        queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
        
        // If we were called from a route like /tours/{id}/optimize, 
        // navigate back to the tour detail page
        if (window.location.pathname.includes('/optimize')) {
          window.location.href = `/tours/${tourId}`;
          return; // Return early to avoid executing callback
        }
        
        // Call the callback if provided (only if not redirecting)
        if (onApplyChanges) {
          onApplyChanges();
        }
      }
    }
  });

  // Handle dialog open state
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    
    if (isOpen) {
      // Reset the state when the dialog opens
      setShowMethodSelection(true);
      
      // Enable the button immediately if a non-default method is selected
      setHasSelectedMethod(optimizationMethod !== 'auto');
      
      // If method is auto but we have data from a previous run, keep button enabled
      if (optimizationMethod === 'auto' && data) {
        setHasSelectedMethod(true);
      }
    } else {
      // Reset when dialog closes
      if (!data) {
        setOptimizationMethod('auto');
      }
    }
  };

  // States to track the UI flow
  const [showMethodSelection, setShowMethodSelection] = useState(true);
  // Always enable the button, even for 'auto' selection
  const [hasSelectedMethod, setHasSelectedMethod] = useState(true);
  
  // Handle optimization method change
  const handleMethodChange = (value: 'standard' | 'ai' | 'auto') => {
    setOptimizationMethod(value);
    setHasSelectedMethod(value !== 'auto' || hasSelectedMethod);
    // Don't automatically run the optimization
  };
  
  // Start the optimization process after method selection
  const startOptimization = () => {
    setShowMethodSelection(false);
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80">
          <Sparkles size={16} />
          <span>Optimize Tour</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Tour Optimization Engine
          </DialogTitle>
          <DialogDescription className="text-base">
            Our unified optimizer intelligently routes your tour to minimize travel time, increase efficiency, and 
            suggest optimal venue scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="text-sm font-medium mb-2">Optimization Method</h3>
          <RadioGroup 
            defaultValue="auto" 
            value={optimizationMethod}
            onValueChange={(value) => handleMethodChange(value as 'standard' | 'ai' | 'auto')}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="flex items-center gap-1">
                <Sparkles size={14} />
                <span>Auto (Recommended)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="flex items-center gap-1">
                <BarChart3 size={14} />
                <span>Standard</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ai" id="ai" />
              <Label htmlFor="ai" className="flex items-center gap-1">
                <Brain size={14} />
                <span>AI Powered</span>
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-2">
            Auto method uses AI when available and falls back to standard optimization if needed.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <Sparkles className="h-12 w-12 animate-pulse text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Optimization in Progress</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Analyzing your tour data, calculating optimal routes, and generating recommendations...
              </p>
              <div className="mt-4 w-full max-w-xs">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-progress" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">
              Error fetching optimization recommendations. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data ? (
          <div className="p-6 text-center">
            {showMethodSelection ? (
              <>
                <p className="mb-4">Select an optimization method and click continue to generate optimization suggestions.</p>
                <Button 
                  onClick={startOptimization} 
                  className="gap-2"
                  disabled={!hasSelectedMethod}
                >
                  <Sparkles className="h-4 w-4" />
                  Continue with {optimizationMethod === 'ai' ? 'AI' : optimizationMethod === 'standard' ? 'Standard' : 'Auto'} Optimization
                </Button>
              </>
            ) : (
              <>
                <p className="mb-4">Click generate to get optimization suggestions.</p>
                <Button onClick={() => refetch()} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Optimization
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data.optimizationResult.aiError && (
              <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {data.optimizationResult.aiError.message}
                      </h4>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Using standard optimization algorithm instead.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Tabs defaultValue="suggestions" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suggestions" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Distance Reduction</p>
                        <p className="text-3xl font-bold">{typeof data.optimizationResult.estimatedDistanceReduction === 'string' ? 
                          data.optimizationResult.estimatedDistanceReduction : 
                          `${data.optimizationResult.estimatedDistanceReduction}%`}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total: {data.optimizationResult.calculatedMetrics.totalDistance}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Time Savings</p>
                        <p className="text-3xl font-bold">{typeof data.optimizationResult.estimatedTimeSavings === 'string' ? 
                          data.optimizationResult.estimatedTimeSavings : 
                          `${data.optimizationResult.estimatedTimeSavings}%`}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.floor(data.optimizationResult.calculatedMetrics.totalTravelTimeMinutes / 60)}h {data.optimizationResult.calculatedMetrics.totalTravelTimeMinutes % 60}m
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Optimization Method</p>
                        <p className="text-sm font-bold flex items-center justify-center gap-1">
                          {data.optimizationResult.optimizationMethod === 'ai' ? (
                            <>
                              <Brain size={16} className="text-blue-500" />
                              <span>AI Powered</span>
                            </>
                          ) : (
                            <>
                              <BarChart3 size={16} className="text-green-500" />
                              <span>Standard</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.optimizationResult.optimizedSequence.length} venues optimized
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Optimized Sequence */}
                {data.optimizationResult.optimizedSequence.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Optimized Venue Sequence</h3>
                    <div className="bg-muted p-4 rounded-md space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {data.optimizationResult.optimizedSequence.map((venueId, index) => {
                          // Try to find by id first (actual ID)
                          let venue = data.tourData.allVenues.find(v => v.id === venueId);
                          
                          // If not found, try by index+1 (AI might be using 1-based indexing)
                          if (!venue && typeof venueId === 'number' && venueId <= data.tourData.allVenues.length) {
                            venue = data.tourData.allVenues[venueId - 1];
                          }
                          
                          if (!venue) {
                            console.warn(`Venue not found for ID ${venueId}`);
                            return null;
                          }
                          
                          return (
                            <div key={index} className="flex items-center">
                              {index > 0 && <ArrowRight size={12} className="mx-1 text-muted-foreground" />}
                              <Badge variant={venue.isFixed ? "default" : "outline"} className="flex items-center gap-1">
                                {venue.isFixed ? <LucideMapPinned size={12} /> : <MapPin size={12} />}
                                <span>{venue.name} (ID: {venue.id})</span>
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Date Suggestions */}
                {Object.keys(data.optimizationResult.suggestedDates).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggested Dates</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(data.optimizationResult.suggestedDates).map(([venueId, date], index) => {
                          // Try to find by id first (actual ID)
                          let venue = data.tourData.allVenues.find(v => v.id === Number(venueId));
                          
                          // If not found, try by index+1 (AI might be using 1-based indexing)
                          if (!venue && !isNaN(Number(venueId)) && Number(venueId) <= data.tourData.allVenues.length) {
                            venue = data.tourData.allVenues[Number(venueId) - 1];
                          }
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <span className="font-medium">{venue.name}</span>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>{new Date(date).toLocaleDateString()}</span>
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recommended Venues */}
                {data.optimizationResult.recommendedVenues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recommended Venues</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.optimizationResult.recommendedVenues.map((venueId, index) => {
                          // Try to find by id first (actual ID)
                          let venue = data.tourData.allVenues.find(v => v.id === venueId);
                          
                          // If not found, try by index+1 (AI might be using 1-based indexing)
                          if (!venue && typeof venueId === 'number' && venueId <= data.tourData.allVenues.length) {
                            venue = data.tourData.allVenues[venueId - 1];
                          }
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <Check size={14} className="text-green-500" />
                              <span>{venue.name}, {venue.city}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Suggested Skips */}
                {data.optimizationResult.suggestedSkips.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggested Skips</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.optimizationResult.suggestedSkips.map((venueId, index) => {
                          // Try to find by id first (actual ID)
                          let venue = data.tourData.allVenues.find(v => v.id === venueId);
                          
                          // If not found, try by index+1 (AI might be using 1-based indexing)
                          if (!venue && typeof venueId === 'number' && venueId <= data.tourData.allVenues.length) {
                            venue = data.tourData.allVenues[venueId - 1];
                          }
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={index} className="flex items-center gap-2 text-muted-foreground">
                              <span className="line-through">{venue.name}, {venue.city}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="reasoning">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose max-w-none dark:prose-invert">
                      <h3>Optimization Reasoning</h3>
                      <p className="whitespace-pre-line">{data.optimizationResult.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="text-sm text-muted-foreground mr-auto">
            {data?.optimizationResult && (
              <div className="flex flex-col">
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-500" />
                  Optimized route ready to apply
                </span>
                <span className="text-xs flex items-center gap-1 mt-1">
                  {data.optimizationResult.optimizationMethod === 'ai' 
                    ? (
                      <>
                        <Brain size={12} className="text-blue-500" />
                        <span>AI-powered optimization</span>
                      </>
                    ) 
                    : (
                      <>
                        <BarChart3 size={12} className="text-green-500" />
                        <span>Standard optimization algorithm</span>
                      </>
                    )}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {data ? 'Cancel' : 'Close'}
            </Button>
            {data && (
              <Button 
                onClick={() => applyOptimization()} 
                disabled={isApplying}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                {isApplying ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Applying Optimization...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Apply Optimization
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}