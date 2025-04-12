import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ChevronRight, Check, X } from 'lucide-react';
import { TourComparisonView } from '../tour-comparison-view';
import { TourOptimizationPanel } from '../tour-optimization-panel';
import { calculateImprovement } from '@/lib/utils';

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
  const [optimizationActive, setOptimizationActive] = useState(false);
  
  const handleStartOptimization = () => {
    setIsOptimizing(true);
    setOptimizationActive(true);
    
    // Simulating a slight delay for UX purposes
    setTimeout(() => {
      setIsOptimizing(false);
    }, 1000);
  };
  
  // Calculate improvements
  const distanceImprovement = calculateImprovement(
    tour.initialTotalDistance || 0, 
    tour.estimatedTravelDistance || 0
  );
  
  const timeImprovement = calculateImprovement(
    tour.initialTravelTime || 0, 
    tour.estimatedTravelTime || 0
  );
  
  return (
    <div className="space-y-6">
      {/* Optimization Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
                Tour Optimizer
              </CardTitle>
              <CardDescription>
                Optimize your tour route to minimize travel time and maximize efficiency
              </CardDescription>
            </div>
            <div>
              {!optimizationActive && (
                <Button 
                  onClick={handleStartOptimization}
                  disabled={isOptimizing}
                  className="bg-gradient-to-r from-purple-600 to-purple-500"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start Optimization
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!optimizationActive && !tour.optimizationScore && (
            <div className="text-center py-8 bg-muted rounded-md">
              <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/60 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Your tour route hasn't been optimized yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                The Tour Optimizer can help you minimize travel distance, save time on the road,
                and find the most efficient route between your venues.
              </p>
              <Button 
                onClick={handleStartOptimization}
                disabled={isOptimizing}
                className="bg-gradient-to-r from-purple-600 to-purple-500"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Optimization
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {(optimizationActive || tour.optimizationScore) && (
        <>
          {/* Optimization Panel */}
          {optimizationActive && (
            <div className="mb-6">
              <TourOptimizationPanel
                tourId={tourId}
                onApplyChanges={() => {
                  onApplyChanges();
                  setOptimizationActive(false);
                }}
              />
            </div>
          )}

          {/* Comparison View */}
          {tour.optimizationScore && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Optimization Results</CardTitle>
                  <CardDescription>
                    Comparison of the original and optimized routes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Optimization Score</h4>
                      <div className="flex items-center">
                        <p className="text-2xl font-bold mr-2">{tour.optimizationScore}/100</p>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Optimized
                        </Badge>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Distance Savings</h4>
                      <div className="flex items-center">
                        <p className="text-2xl font-bold mr-2">{distanceImprovement}%</p>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {Math.round(tour.initialTotalDistance - tour.estimatedTravelDistance)} km
                        </Badge>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Time Savings</h4>
                      <div className="flex items-center">
                        <p className="text-2xl font-bold mr-2">{timeImprovement}%</p>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {Math.round((tour.initialTravelTime - tour.estimatedTravelTime) / 60)} hrs
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <h4 className="font-medium">Optimization Benefits</h4>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium">Reduced travel distance by {distanceImprovement}%</p>
                          <p className="text-sm text-muted-foreground">
                            Your optimized route is {Math.round(tour.initialTotalDistance - tour.estimatedTravelDistance)} km shorter
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium">Saved {Math.round((tour.initialTravelTime - tour.estimatedTravelTime) / 60)} hours of travel time</p>
                          <p className="text-sm text-muted-foreground">
                            Spend less time on the road and more time preparing for shows
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium">Optimized venue sequence</p>
                          <p className="text-sm text-muted-foreground">
                            Your venues are now arranged in the most efficient order
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Before/After Comparison */}
              <TourComparisonView
                tourId={tourId}
                originalVenues={originalVenues}
                optimizedVenues={optimizedVenues}
                originalDistance={tour.initialTotalDistance || (tour.estimatedTravelDistance * 1.25)}
                optimizedDistance={tour.estimatedTravelDistance}
                originalTravelTime={tour.initialTravelTime || (tour.estimatedTravelTime * 1.25)}
                optimizedTravelTime={tour.estimatedTravelTime}
                optimizationScore={tour.optimizationScore}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default OptimizationTab;