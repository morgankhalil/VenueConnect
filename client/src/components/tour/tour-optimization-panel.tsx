import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUnifiedOptimization, applyUnifiedOptimization } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  BarChart3,
  ArrowDownLeft
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types
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

type TourOptimizationPanelProps = {
  tourId: number;
  onApplyChanges?: () => void;
};

export function TourOptimizationPanel({ tourId, onApplyChanges }: TourOptimizationPanelProps) {
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
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isSuccess
  } = useQuery<UnifiedOptimizationResponse>({
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
      
      // Invalidate tour queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
      
      // Call the callback if provided
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
    }
  });

  // Handle optimization method change
  const handleMethodChange = (value: 'standard' | 'ai' | 'auto') => {
    setOptimizationMethod(value);
  };
  
  // Start the optimization process
  const startOptimization = () => {
    refetch();
  };

  if (!isSuccess && !isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tour Optimization Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
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
          
          <Button 
            onClick={startOptimization} 
            className="w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate {optimizationMethod === 'ai' ? 'AI' : optimizationMethod === 'standard' ? 'Standard' : 'Auto'} Optimization
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tour Optimization Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Sparkles className="h-12 w-12 animate-pulse text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Optimization in Progress</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Analyzing your tour data, calculating optimal routes, and generating recommendations...
            </p>
            <div className="mt-4 w-full max-w-xs">
              <Progress className="h-2" value={80} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tour Optimization Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error fetching optimization</AlertTitle>
            <AlertDescription>
              There was a problem getting optimization recommendations. Please try again.
            </AlertDescription>
          </Alert>
          
          <Button onClick={() => refetch()} className="w-full">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // If we have data, show the optimization results
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Tour Optimization Engine
          <Badge variant="outline" className="ml-2">
            {data.optimizationResult.optimizationMethod === 'ai' ? 'AI-Powered' : 'Standard'} Optimization
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.optimizationResult.aiError && (
          <Alert variant="warning" className="mb-4">
            <AlertTitle>AI Optimization Unavailable</AlertTitle>
            <AlertDescription>
              {data.optimizationResult.aiError.message}. Using standard optimization algorithm instead.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="suggestions" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="venues">Venue Sequence</TabsTrigger>
            <TabsTrigger value="reasoning">AI Reasoning</TabsTrigger>
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
                          <Brain className="h-4 w-4 text-blue-500" />
                          AI-Powered
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 text-green-500" />
                          Standard
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.optimizationResult.optimizationMethod === 'ai' 
                        ? "Customized AI optimization based on venues and routing" 
                        : "Distance-based algorithm"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Suggested dates section */}
            {Object.keys(data.optimizationResult.suggestedDates).length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Suggested Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(data.optimizationResult.suggestedDates).map(([venueId, date]) => {
                    // Find the venue name based on the ID
                    const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                      .find(v => v.id.toString() === venueId);
                    return (
                      <div key={venueId} className="flex items-center p-2 bg-muted/30 rounded-md">
                        <Calendar className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-sm">
                          <strong>{venue?.name || `Venue ${venueId}`}</strong>: {new Date(date).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Skipped venues section */}
            {data.optimizationResult.suggestedSkips.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Suggested Venues to Skip</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.optimizationResult.suggestedSkips.map((venueId) => {
                    // Find the venue name based on the ID
                    const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                      .find(v => v.id === venueId);
                    return (
                      <div key={venueId} className="flex items-center p-2 bg-muted/30 rounded-md">
                        <ArrowDownLeft className="h-4 w-4 mr-2 text-red-500" />
                        <span className="text-sm">
                          {venue?.name || `Venue ${venueId}`} ({venue?.city || 'Unknown City'})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="venues" className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Optimized Venue Sequence</h3>
            <div className="space-y-2">
              {data.optimizationResult.optimizedSequence.map((venueId, index) => {
                // Find the venue based on the ID
                const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                  .find(v => v.id === venueId);
                  
                const isConfirmed = data.tourData.confirmedVenues.some(v => v.id === venueId);
                
                return (
                  <div key={venueId} className="flex items-center p-3 bg-muted/30 rounded-md">
                    <div className="bg-primary/90 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {venue?.name || `Venue ${venueId}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {venue?.city || 'Unknown City'}
                        {venue?.date && ` • ${new Date(venue.date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant={isConfirmed ? "default" : "outline"} className="ml-2">
                      {isConfirmed ? "Confirmed" : "Potential"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="reasoning" className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-medium mb-2">AI Reasoning</h3>
              <p className="text-sm whitespace-pre-wrap">
                {data.optimizationResult.reasoning || 
                "Standard distance-based optimization was used to create an efficient route."}
              </p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Routing Metrics</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Original Distance:</strong> {data.optimizationResult.calculatedMetrics.totalDistance}
                </p>
                <p>
                  <strong>Original Travel Time:</strong> {Math.floor(data.optimizationResult.calculatedMetrics.totalTravelTimeMinutes / 60)}h {data.optimizationResult.calculatedMetrics.totalTravelTimeMinutes % 60}m
                </p>
                <p>
                  <strong>Optimized Distance:</strong> {data.optimizationResult.calculatedMetrics.optimizedDistance}
                </p>
                <p>
                  <strong>Optimized Travel Time:</strong> {Math.floor(data.optimizationResult.calculatedMetrics.optimizedTimeMinutes / 60)}h {data.optimizationResult.calculatedMetrics.optimizedTimeMinutes % 60}m
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => applyOptimization()}
            disabled={isApplying}
            className="gap-2"
          >
            {isApplying ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Apply Optimization
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}