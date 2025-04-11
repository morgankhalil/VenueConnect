import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAIOptimizationSuggestions, applyAIOptimization } from '@/lib/api';
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
import { Sparkles, RotateCw, Check, Calendar, MapPin, Brain, ArrowRight, LucideMapPinned } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Type for venue data in the optimization
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

// Type for AI suggestion response
type AiSuggestion = {
  optimizedSequence: number[];
  suggestedDates: Record<string, string>;
  recommendedVenues: number[];
  suggestedSkips: number[];
  estimatedDistanceReduction: number;
  estimatedTimeSavings: number;
  reasoning: string;
};

// Type for tour data
type TourData = {
  tourName: string;
  artistName: string;
  artistGenres: string[];
  startDate: string | null;
  endDate: string | null;
  confirmedVenues: VenueData[];
  potentialVenues: VenueData[];
};

// Type for the complete optimization response
type AiOptimizationResponse = {
  aiSuggestions: AiSuggestion;
  calculatedMetrics: {
    totalDistance: string;
    totalTravelTimeMinutes: number;
  };
  tourData: TourData;
};

export function AITourOptimizer({ tourId, onApplyChanges }: { tourId: number; onApplyChanges?: () => void }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const { toast } = useToast();

  // Fetch AI optimization suggestions
  const { data, isLoading, isError, error, refetch } = useQuery<AiOptimizationResponse>({
    queryKey: ['ai-tour-optimization', tourId],
    queryFn: async () => {
      const response = await getAIOptimizationSuggestions(tourId);
      return response;
    },
    enabled: false, // Don't fetch on component mount
  });

  // Apply AI optimization mutation
  const { mutate: applyOptimization, isPending: isApplying } = useMutation({
    mutationFn: async () => {
      if (!data?.aiSuggestions) return;
      
      const { optimizedSequence, suggestedDates } = data.aiSuggestions;
      return await applyAIOptimization(tourId, optimizedSequence, suggestedDates);
    },
    onSuccess: () => {
      toast({
        title: 'AI optimization applied',
        description: 'Your tour has been optimized with AI suggestions',
      });
      
      // Close the dialog
      setOpen(false);
      
      // Invalidate tour queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
      
      // Call the callback if provided
      if (onApplyChanges) {
        onApplyChanges();
      }
    },
    onError: (err) => {
      toast({
        title: 'Error applying AI optimization',
        description: 'There was a problem applying the AI suggestions. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle dialog open state
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !data) {
      // Fetch data when dialog opens
      refetch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Brain size={16} />
          <span>AI Optimize</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>AI Tour Optimization</DialogTitle>
          <DialogDescription>
            Get intelligent recommendations for your tour routing, scheduling, and venue selection powered by AI.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">
              Error fetching AI recommendations. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data ? (
          <div className="p-6 text-center">
            <p className="mb-4">Click generate to get AI-powered optimization suggestions.</p>
            <p className="text-xs text-muted-foreground mb-2">
              Uses Hugging Face inference API to optimize your tour routing.
            </p>
            <Button onClick={() => refetch()} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate AI Suggestions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="suggestions" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="reasoning">AI Reasoning</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suggestions" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Distance Reduction</p>
                        <p className="text-3xl font-bold">{data.aiSuggestions.estimatedDistanceReduction}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Total: {data.calculatedMetrics.totalDistance}</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Time Savings</p>
                        <p className="text-3xl font-bold">{data.aiSuggestions.estimatedTimeSavings}%</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.floor(data.calculatedMetrics.totalTravelTimeMinutes / 60)}h {data.calculatedMetrics.totalTravelTimeMinutes % 60}m
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Sequence Changes</p>
                        <p className="text-3xl font-bold">{data.aiSuggestions.optimizedSequence.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Venues optimized</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Optimized Sequence */}
                {data.aiSuggestions.optimizedSequence.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Optimized Venue Sequence</h3>
                    <div className="bg-muted p-4 rounded-md space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {data.aiSuggestions.optimizedSequence.map((venueId, index) => {
                          const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                            .find(v => v.id === venueId);
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={venueId} className="flex items-center">
                              {index > 0 && <ArrowRight size={12} className="mx-1 text-muted-foreground" />}
                              <Badge variant={venue.isFixed ? "default" : "outline"} className="flex items-center gap-1">
                                {venue.isFixed ? <LucideMapPinned size={12} /> : <MapPin size={12} />}
                                <span>{venue.name}</span>
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Date Suggestions */}
                {Object.keys(data.aiSuggestions.suggestedDates).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggested Dates</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(data.aiSuggestions.suggestedDates).map(([venueId, date]) => {
                          const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                            .find(v => v.id === Number(venueId));
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={venueId} className="flex items-center justify-between">
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
                {data.aiSuggestions.recommendedVenues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recommended Venues</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.aiSuggestions.recommendedVenues.map(venueId => {
                          const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                            .find(v => v.id === venueId);
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={venueId} className="flex items-center gap-2">
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
                {data.aiSuggestions.suggestedSkips.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggested Skips</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.aiSuggestions.suggestedSkips.map(venueId => {
                          const venue = [...data.tourData.confirmedVenues, ...data.tourData.potentialVenues]
                            .find(v => v.id === venueId);
                          
                          if (!venue) return null;
                          
                          return (
                            <div key={venueId} className="flex items-center gap-2 text-muted-foreground">
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
                      <h3>AI Optimization Reasoning</h3>
                      <p className="whitespace-pre-line">{data.aiSuggestions.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {data && (
            <Button 
              onClick={() => applyOptimization()} 
              disabled={isApplying}
              className="gap-2"
            >
              {isApplying ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Apply AI Optimization
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}