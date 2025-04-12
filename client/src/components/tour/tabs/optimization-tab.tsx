import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistance, formatTravelTime, calculateImprovement } from '@/lib/utils';
import { AlertCircle, ArrowDownUp, Check, Clock, MapPin, RotateCw } from 'lucide-react';

interface OptimizationTabProps {
  tourId: number;
  venues: any[];
  tourData: any;
  onApplyOptimization: () => void;
  refetch: () => void;
}

export function OptimizationTab({
  tourId,
  venues,
  tourData,
  onApplyOptimization,
  refetch
}: OptimizationTabProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [optimizationMethod, setOptimizationMethod] = useState<'standard' | 'ai'>('standard');
  const [activeOptimizationTab, setActiveOptimizationTab] = useState<string>('standard');
  const { toast } = useToast();

  const hasConfirmedVenues = venues?.filter(v => v.status === 'confirmed').length >= 2;
  const hasSufficientVenues = venues?.length >= 3;

  // Determine if we can optimize based on venue status
  const canOptimize = hasConfirmedVenues && hasSufficientVenues;

  // Function to run standard optimization
  const runStandardOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const response = await apiRequest(`/api/unified-optimizer/optimize/${tourId}`, {
        method: 'POST',
        data: {
          method: 'standard'
        }
      });
      
      setOptimizationResult(response);
      toast({
        title: 'Optimization Complete',
        description: 'Standard optimization completed successfully',
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: 'There was an error optimizing your tour route',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Function to run AI optimization
  const runAIOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const response = await apiRequest(`/api/unified-optimizer/optimize/${tourId}`, {
        method: 'POST',
        data: {
          method: 'ai'
        }
      });
      
      setOptimizationResult(response);
      toast({
        title: 'AI Optimization Complete',
        description: 'AI-powered optimization completed successfully',
      });
    } catch (error) {
      console.error('AI Optimization error:', error);
      toast({
        title: 'AI Optimization Failed',
        description: 'There was an error with the AI optimization',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Function to apply optimization
  const handleApplyOptimization = async () => {
    if (!optimizationResult) return;
    
    try {
      await apiRequest(`/api/unified-optimizer/apply/${tourId}`, {
        method: 'POST'
      });
      
      toast({
        title: 'Optimization Applied',
        description: 'Your tour route has been updated with the optimized sequence',
      });
      
      onApplyOptimization();
      refetch();
      setOptimizationResult(null);
    } catch (error) {
      console.error('Error applying optimization:', error);
      toast({
        title: 'Failed to Apply Optimization',
        description: 'There was an error applying the optimization to your tour',
        variant: 'destructive',
      });
    }
  };

  // Calculate improvement metrics if we have optimization results
  const improvementMetrics = optimizationResult?.tourData ? {
    distanceImprovement: calculateImprovement(
      tourData.initialTotalDistance || tourData.totalDistance,
      optimizationResult.tourData.totalDistance
    ),
    timeImprovement: calculateImprovement(
      tourData.initialTravelTimeMinutes || tourData.travelTimeMinutes,
      optimizationResult.tourData.travelTimeMinutes
    ),
  } : { distanceImprovement: 0, timeImprovement: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tour Optimization</CardTitle>
          <CardDescription>
            Optimize your tour route to minimize travel time and distance between venues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canOptimize && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cannot Optimize Route</AlertTitle>
              <AlertDescription>
                You need at least 2 confirmed venues and a total of 3 or more venues to optimize your tour route.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs 
            value={activeOptimizationTab} 
            onValueChange={setActiveOptimizationTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="standard"
                onClick={() => setOptimizationMethod('standard')}
              >
                Standard Optimization
              </TabsTrigger>
              <TabsTrigger 
                value="ai"
                onClick={() => setOptimizationMethod('ai')}
              >
                AI Optimization
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard" className="space-y-4">
              <div className="text-sm">
                <p>Standard optimization arranges your venues in the most efficient order to minimize:</p>
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Total travel distance between venues</li>
                  <li>Overall travel time for the entire tour</li>
                </ul>
                <p className="mt-3">Confirmed venues will remain fixed in the sequence, and potential venues will be arranged optimally around them.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="space-y-4">
              <div className="text-sm">
                <p>AI-powered optimization uses advanced algorithms to:</p>
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Create an optimal venue sequence and travel route</li>
                  <li>Suggest optimal dates for unscheduled venues</li>
                  <li>Provide venue recommendations based on your tour patterns</li>
                  <li>Analyze and optimize routing for better fuel efficiency</li>
                </ul>
                <p className="mt-3">For best results, have at least 2 confirmed venues with set dates.</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={optimizationMethod === 'standard' ? runStandardOptimization : runAIOptimization}
              disabled={!canOptimize || isOptimizing}
              size="lg"
              className="w-full max-w-md"
            >
              {isOptimizing ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <ArrowDownUp className="h-4 w-4 mr-2" />
                  {optimizationMethod === 'standard' ? 'Run Standard Optimization' : 'Run AI Optimization'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              Review the suggested optimizations for your tour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Distance</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Original</p>
                    <p className="text-2xl font-bold">
                      {formatDistance(tourData.initialTotalDistance || tourData.totalDistance)}
                    </p>
                  </div>
                  <ArrowDownUp className="h-5 w-5 text-muted-foreground mx-2" />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Optimized</p>
                    <p className="text-2xl font-bold">
                      {formatDistance(optimizationResult.tourData.totalDistance)}
                    </p>
                  </div>
                </div>
                {improvementMetrics.distanceImprovement > 0 && (
                  <div className="flex items-center text-green-600 text-sm">
                    <Check className="h-4 w-4 mr-1" />
                    {improvementMetrics.distanceImprovement}% reduction in travel distance
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Travel Time</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Original</p>
                    <p className="text-2xl font-bold">
                      {formatTravelTime(tourData.initialTravelTimeMinutes || tourData.travelTimeMinutes)}
                    </p>
                  </div>
                  <ArrowDownUp className="h-5 w-5 text-muted-foreground mx-2" />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Optimized</p>
                    <p className="text-2xl font-bold">
                      {formatTravelTime(optimizationResult.tourData.travelTimeMinutes)}
                    </p>
                  </div>
                </div>
                {improvementMetrics.timeImprovement > 0 && (
                  <div className="flex items-center text-green-600 text-sm">
                    <Check className="h-4 w-4 mr-1" />
                    {improvementMetrics.timeImprovement}% reduction in travel time
                  </div>
                )}
              </div>
            </div>
            
            <Separator className="my-6" />
            
            {optimizationMethod === 'ai' && optimizationResult.aiResults && (
              <>
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-medium">AI Optimization Insights</h3>
                  
                  {optimizationResult.aiResults.reasoning && (
                    <div className="text-sm bg-muted p-4 rounded-md">
                      <p>{optimizationResult.aiResults.reasoning}</p>
                    </div>
                  )}
                  
                  {optimizationResult.aiResults.suggestedDates && 
                   Object.keys(optimizationResult.aiResults.suggestedDates).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium">Suggested Dates</h4>
                      <ul className="space-y-1">
                        {Object.entries(optimizationResult.aiResults.suggestedDates).map(([venueIndex, date]) => {
                          const venue = venues.find(v => v.id === parseInt(venueIndex)) || 
                                       venues.find((v, i) => i === parseInt(venueIndex));
                          return (
                            <li key={venueIndex} className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2" />
                              <span className="font-medium mr-2">{venue?.name || `Venue ${venueIndex}`}:</span>
                              <span>{date as string}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {optimizationResult.aiResults.recommendedVenues && 
                   optimizationResult.aiResults.recommendedVenues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium">Recommended Venues</h4>
                      <ul className="space-y-1">
                        {optimizationResult.aiResults.recommendedVenues.map((venue: any, index: number) => (
                          <li key={index} className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{venue.name || venue}</span>
                            {venue.reason && <span className="text-muted-foreground ml-2">({venue.reason})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <Separator className="my-6" />
              </>
            )}
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Venue Sequence</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The optimized sequence of venues for your tour
              </p>
              
              <div className="space-y-3">
                {optimizationResult.optimizedSequence.map((venueId: number, index: number) => {
                  const venue = venues.find(v => v.id === venueId);
                  if (!venue) return null;
                  
                  return (
                    <div key={venue.id} className="flex items-center p-3 border rounded-lg">
                      <div className="bg-primary/10 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{venue.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {venue.city}{venue.region ? `, ${venue.region}` : ''}
                        </div>
                      </div>
                      <div className={`
                        px-2 py-1 rounded-full text-xs
                        ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                        ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700' : ''}
                        ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700' : ''}
                        ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {venue.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => setOptimizationResult(null)}>
              Cancel
            </Button>
            <Button onClick={handleApplyOptimization}>
              Apply Optimization
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}