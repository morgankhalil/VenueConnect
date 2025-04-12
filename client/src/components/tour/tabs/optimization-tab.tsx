import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOptimizeTour } from '@/hooks/use-optimize-tour';
import { AlertCircle, ArrowRight, Check, Loader2, MapPin, Route, Star, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDistance, formatTravelTime, calculateImprovement, formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/tour/stat-card';

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
  const {
    optimizeTour,
    applyOptimization,
    isOptimizing,
    optimizationResults,
    optimizationError,
    clearOptimizationResults
  } = useOptimizeTour();

  const [optimizationOptions, setOptimizationOptions] = useState({
    optimizeRouteOrder: true,
    optimizeDates: true,
    includeFixedVenues: false,
    useAi: false
  });

  const handleOptimizationOptionChange = (option: string, value: boolean) => {
    setOptimizationOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleOptimize = async () => {
    await optimizeTour(tourId, optimizationOptions);
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResults) return;
    
    const result = await applyOptimization(tourId, optimizationResults.id);
    if (result) {
      onApplyOptimization();
      refetch();
      clearOptimizationResults();
    }
  };

  // Compute improvement metrics from optimization results
  const improvementMetrics = optimizationResults ? {
    distanceImprovement: calculateImprovement(
      tourData.totalDistance || 0, 
      optimizationResults.totalDistance || 0
    ),
    timeImprovement: calculateImprovement(
      tourData.travelTimeMinutes || 0, 
      optimizationResults.travelTimeMinutes || 0
    ),
    scoreImprovement: optimizationResults.scoreImprovement || 0
  } : {
    distanceImprovement: 0,
    timeImprovement: 0,
    scoreImprovement: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tour Optimization</h2>
          <p className="text-muted-foreground">Optimize your tour route and schedule</p>
        </div>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Optimization</TabsTrigger>
          <TabsTrigger value="ai" disabled={!optimizationOptions.useAi}>AI-Powered Optimization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimize Tour Route</CardTitle>
              <CardDescription>
                Our optimization engine will find the most efficient route between venues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="optimizeRouteOrder">Optimize Route Order</Label>
                    <p className="text-sm text-muted-foreground">
                      Rearrange venue order to minimize travel distance
                    </p>
                  </div>
                  <Switch
                    id="optimizeRouteOrder"
                    checked={optimizationOptions.optimizeRouteOrder}
                    onCheckedChange={(checked) => 
                      handleOptimizationOptionChange('optimizeRouteOrder', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="optimizeDates">Optimize Performance Dates</Label>
                    <p className="text-sm text-muted-foreground">
                      Suggest optimal dates for unscheduled venues
                    </p>
                  </div>
                  <Switch
                    id="optimizeDates"
                    checked={optimizationOptions.optimizeDates}
                    onCheckedChange={(checked) => 
                      handleOptimizationOptionChange('optimizeDates', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="includeFixedVenues">Include Confirmed Venues</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow reordering of confirmed venues
                    </p>
                  </div>
                  <Switch
                    id="includeFixedVenues"
                    checked={optimizationOptions.includeFixedVenues}
                    onCheckedChange={(checked) => 
                      handleOptimizationOptionChange('includeFixedVenues', checked)
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="useAi">Use AI Optimization</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable advanced AI optimization
                    </p>
                  </div>
                  <Switch
                    id="useAi"
                    checked={optimizationOptions.useAi}
                    onCheckedChange={(checked) => 
                      handleOptimizationOptionChange('useAi', checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleOptimize} 
                disabled={isOptimizing}
                className="w-full"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Optimize Tour
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {optimizationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Optimization Error</AlertTitle>
              <AlertDescription>
                {optimizationError}
              </AlertDescription>
            </Alert>
          )}
          
          {optimizationResults && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Results</CardTitle>
                  <CardDescription>
                    Here's how your tour could be improved
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                      title="Distance Reduction" 
                      icon={<Route className="h-4 w-4" />}
                      value={`${Math.abs(improvementMetrics.distanceImprovement)}%`}
                      description={`${formatDistance(tourData.totalDistance)} → ${formatDistance(optimizationResults.totalDistance)}`}
                      trend={improvementMetrics.distanceImprovement > 0 ? "down" : "up"}
                      trendLabel={improvementMetrics.distanceImprovement > 0 ? "decreased" : "increased"}
                    />
                    
                    <StatCard 
                      title="Time Savings" 
                      icon={<Timer className="h-4 w-4" />}
                      value={`${Math.abs(improvementMetrics.timeImprovement)}%`}
                      description={`${formatTravelTime(tourData.travelTimeMinutes)} → ${formatTravelTime(optimizationResults.travelTimeMinutes)}`}
                      trend={improvementMetrics.timeImprovement > 0 ? "down" : "up"}
                      trendLabel={improvementMetrics.timeImprovement > 0 ? "decreased" : "increased"}
                    />
                    
                    <StatCard 
                      title="Overall Score" 
                      icon={<Star className="h-4 w-4" />}
                      value={`${improvementMetrics.scoreImprovement > 0 ? '+' : ''}${improvementMetrics.scoreImprovement}%`}
                      description={`Optimization improvement score`}
                      trend={improvementMetrics.scoreImprovement > 0 ? "up" : "down"}
                      trendLabel={improvementMetrics.scoreImprovement > 0 ? "improved" : "decreased"}
                    />
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Optimization Analysis</h3>
                      <div className="text-sm space-y-2">
                        <p>{optimizationResults.analysis || 'No analysis available'}</p>
                      </div>
                    </div>
                    
                    {optimizationResults.changes && optimizationResults.changes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Recommended Changes</h3>
                        <ul className="text-sm space-y-1">
                          {optimizationResults.changes.map((change: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => clearOptimizationResults()}
                  >
                    Discard
                  </Button>
                  <Button onClick={handleApplyOptimization}>
                    Apply Optimization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Original Route</CardTitle>
                    <CardDescription>
                      Current tour sequence
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] bg-primary/5 rounded-lg">
                    {/* Placeholder for original route map */}
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <MapPin className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                        <p className="text-muted-foreground">Original route map</p>
                        <p className="text-xs text-muted-foreground">{tourData.totalDistance ? formatDistance(tourData.totalDistance) : 'No distance data'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Optimized Route</CardTitle>
                    <CardDescription>
                      Proposed optimized sequence
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] bg-primary/5 rounded-lg">
                    {/* Placeholder for optimized route map */}
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <MapPin className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                        <p className="text-muted-foreground">Optimized route map</p>
                        <p className="text-xs text-muted-foreground">{optimizationResults.totalDistance ? formatDistance(optimizationResults.totalDistance) : 'No distance data'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Optimization</CardTitle>
              <CardDescription>
                Advanced optimization using artificial intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>AI Optimization</AlertTitle>
                  <AlertDescription>
                    AI optimization uses OpenAI models to analyze your tour and provide intelligent suggestions for route optimization, scheduling, and venue selection.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="modelSelection">Optimization Model</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select the AI model to use for optimization
                    </p>
                    <select 
                      id="modelSelection"
                      className="w-full p-2 border rounded-md"
                      disabled={!optimizationOptions.useAi || isOptimizing}
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo - Fast & Efficient</option>
                      <option value="gpt-4">GPT-4 - Advanced Analysis</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleOptimize} 
                disabled={!optimizationOptions.useAi || isOptimizing}
                className="w-full"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running AI Analysis...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Run AI Optimization
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {optimizationOptions.useAi && (
            <div className="flex items-center justify-center p-4 text-center text-muted-foreground">
              <p>
                AI optimization requires OpenAI API access. Ensure your OpenAI API key
                is properly configured in your environment.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}