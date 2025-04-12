import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Check, 
  Clock, 
  Route, 
  Sparkles, 
  ArrowRight, 
  Lightbulb 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOptimizeTour } from '@/hooks/use-optimize-tour';
import { useToast } from '@/hooks/use-toast';
import { VenueMap } from '@/components/maps/venue-map';
import { Separator } from '@/components/ui/separator';
import { formatDistance, formatTravelTime, calculatePercentageImprovement } from '@/lib/utils';

interface OptimizationTabProps {
  tour: any;
  tourId: number;
  originalVenues: any[];
  optimizedVenues: any[];
  onApplyChanges: () => void;
}

export function OptimizationTab({ 
  tour, 
  tourId, 
  originalVenues, 
  optimizedVenues, 
  onApplyChanges 
}: OptimizationTabProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();
  
  const { 
    mutate: optimizeTour, 
    isPending, 
    isSuccess, 
    data 
  } = useOptimizeTour(tourId);

  const handleOptimize = () => {
    setIsOptimizing(true);
    optimizeTour(null, {
      onSuccess: () => {
        toast({
          title: "Tour optimization completed",
          description: "The tour route has been optimized successfully.",
        });
        setIsOptimizing(false);
      },
      onError: (error) => {
        toast({
          title: "Optimization failed",
          description: `Error: ${error.message || "Something went wrong"}`,
          variant: "destructive",
        });
        setIsOptimizing(false);
      },
    });
  };

  const handleApplyChanges = () => {
    onApplyChanges();
    toast({
      title: "Changes applied",
      description: "The optimized route has been applied to your tour.",
    });
  };

  const distanceImprovement = calculatePercentageImprovement(
    tour.initialTotalDistance || 0,
    tour.totalDistance || 0
  );

  const timeImprovement = calculatePercentageImprovement(
    tour.initialTravelTimeMinutes || 0,
    tour.travelTimeMinutes || 0
  );

  const averageDistanceImprovement = calculatePercentageImprovement(
    (tour.initialTotalDistance || 0) / (originalVenues.length || 1),
    (tour.totalDistance || 0) / (optimizedVenues.length || 1)
  );

  const hasOptimizationResults = tour.optimizationScore !== null && 
    tour.optimizationScore !== undefined && tour.initialOptimizationScore;

  const getOptimizationBadge = () => {
    if (!hasOptimizationResults) return null;
    
    const score = tour.optimizationScore;
    
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-green-400">Very Good</Badge>;
    if (score >= 60) return <Badge className="bg-green-300">Good</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-400">Fair</Badge>;
    return <Badge className="bg-red-400">Poor</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Optimization Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                Tour Optimizer
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Optimize your tour route to minimize travel time and maximize efficiency
              </p>
            </div>

            <Button 
              onClick={handleOptimize} 
              disabled={isPending || isOptimizing}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isPending ? 'Optimizing...' : 'Start Optimization'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasOptimizationResults ? (
        <>
          {/* Optimization Results */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Optimization Score</h4>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold mr-2">{tour.optimizationScore}/100</p>
                    {getOptimizationBadge()}
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Distance Savings</h4>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold mr-2">{Math.abs(distanceImprovement)}%</p>
                    <Badge className="bg-blue-500">{formatDistance(Math.abs(tour.initialTotalDistance - tour.totalDistance))}</Badge>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Time Savings</h4>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold mr-2">{Math.abs(timeImprovement)}%</p>
                    <Badge className="bg-purple-500">{formatTravelTime(Math.abs(tour.initialTravelTimeMinutes - tour.travelTimeMinutes))}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <h4 className="font-medium">Optimization Benefits</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <div className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Reduced travel distance by {Math.abs(distanceImprovement)}%</p>
                      <p className="text-sm text-muted-foreground">
                        Your optimized route is {formatDistance(Math.abs(tour.initialTotalDistance - tour.totalDistance))} shorter
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Saved {formatTravelTime(Math.abs(tour.initialTravelTimeMinutes - tour.travelTimeMinutes))} of travel time</p>
                      <p className="text-sm text-muted-foreground">
                        Spend less time on the road and more time preparing for shows
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Optimized venue sequence</p>
                      <p className="text-sm text-muted-foreground">
                        Your venues are now arranged in the most efficient order
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" disabled={isPending}>
                  Revert Changes
                </Button>
                <Button onClick={handleApplyChanges} disabled={isPending}>
                  Apply Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Before/After Comparison */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Before/After Comparison</CardTitle>
              <CardDescription>Compare your original route with the optimized version</CardDescription>
            </CardHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Original Route */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                  Original Route ({formatDistance(tour.initialTotalDistance || 0)})
                </h4>
                <div className="h-64 rounded-md relative overflow-hidden">
                  <VenueMap
                    venues={originalVenues}
                    showRoute={true}
                    fullWidth={true}
                    fullHeight={true}
                    mapHeight={256}
                    routeColor="#f97316"
                  />
                </div>
              </div>
              
              {/* Optimized Route */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  Optimized Route ({formatDistance(tour.totalDistance || 0)})
                </h4>
                <div className="h-64 rounded-md relative overflow-hidden">
                  <VenueMap
                    venues={optimizedVenues}
                    showRoute={true}
                    fullWidth={true}
                    fullHeight={true}
                    mapHeight={256}
                    routeColor="#22c55e"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Original Tour Statistics */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Original Tour Statistics</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total Distance</span>
                        <span className="font-medium">{formatDistance(tour.initialTotalDistance || 0)}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Travel Time</span>
                        <span className="font-medium">{formatTravelTime(tour.initialTravelTimeMinutes || 0)}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Avg. Distance Between Venues</span>
                        <span className="font-medium">
                          {formatDistance((tour.initialTotalDistance || 0) / (originalVenues.length || 1))}
                        </span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </div>
                
                {/* Optimized Tour Statistics */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Optimized Tour Statistics</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total Distance</span>
                        <span className="font-medium text-green-600">
                          {formatDistance(tour.totalDistance || 0)} ({distanceImprovement < 0 ? '-' : '+'}{Math.abs(distanceImprovement)}%)
                        </span>
                      </div>
                      <Progress value={100 - Math.abs(distanceImprovement)} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Travel Time</span>
                        <span className="font-medium text-green-600">
                          {formatTravelTime(tour.travelTimeMinutes || 0)} ({timeImprovement < 0 ? '-' : '+'}{Math.abs(timeImprovement)}%)
                        </span>
                      </div>
                      <Progress value={100 - Math.abs(timeImprovement)} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Avg. Distance Between Venues</span>
                        <span className="font-medium text-green-600">
                          {formatDistance((tour.totalDistance || 0) / (optimizedVenues.length || 1))} 
                          ({averageDistanceImprovement < 0 ? '-' : '+'}{Math.abs(averageDistanceImprovement)}%)
                        </span>
                      </div>
                      <Progress value={100 - Math.abs(averageDistanceImprovement)} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Optimization Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                AI Optimization Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <p className="text-sm">
                  Our AI analysis identified several opportunities to optimize your tour route. 
                  By reordering venues and adjusting dates, we created a more efficient path that 
                  reduces travel distance by {Math.abs(distanceImprovement)}% and saves approximately 
                  {formatTravelTime(Math.abs(tour.initialTravelTimeMinutes - tour.travelTimeMinutes))} of travel time.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-primary/20 p-2 rounded-md mr-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Regional Grouping</h4>
                    <p className="text-sm text-muted-foreground">
                      We grouped venues by geographic region to minimize long-distance travel between shows.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary/20 p-2 rounded-md mr-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Date Adjustments</h4>
                    <p className="text-sm text-muted-foreground">
                      We suggested adjusted dates for non-fixed venues to create a smoother flow between locations.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary/20 p-2 rounded-md mr-3">
                    <Route className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Route Reconfiguration</h4>
                    <p className="text-sm text-muted-foreground">
                      We eliminated inefficient zigzag patterns in your original route to create a more direct path.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // Not Optimized State
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Sparkles className="h-16 w-16 text-primary/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Optimize Your Tour Route</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Use our AI-powered optimizer to rearrange venues and dates for a more efficient tour with less travel time between venues.
          </p>
          <Button 
            onClick={handleOptimize} 
            disabled={isPending || isOptimizing}
            size="lg" 
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Start Optimization
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full">
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <Route className="h-8 w-8 text-primary/70 mb-2" />
              <h4 className="font-medium">Minimize Distance</h4>
              <p className="text-sm text-muted-foreground text-center">
                Reduce total travel distance between venues
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <Clock className="h-8 w-8 text-primary/70 mb-2" />
              <h4 className="font-medium">Save Time</h4>
              <p className="text-sm text-muted-foreground text-center">
                Spend less time on the road between shows
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <Sparkles className="h-8 w-8 text-primary/70 mb-2" />
              <h4 className="font-medium">Smart Scheduling</h4>
              <p className="text-sm text-muted-foreground text-center">
                Intelligently adjust flexible dates for a better flow
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}