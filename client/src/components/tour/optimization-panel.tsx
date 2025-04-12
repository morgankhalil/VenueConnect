import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  CalendarClock,
  Route,
  BarChart,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Info,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatDistance, formatTravelTime } from '@/lib/utils';
import { useOptimizeTour } from '../../hooks/use-optimize-tour';
import { toast } from '@/hooks/use-toast';

interface OptimizationPanelProps {
  tourId: number;
  venues: any[];
  tourData: any;
  onApplyOptimization: () => void;
  refetch: () => void;
}

export function OptimizationPanel({
  tourId,
  venues,
  tourData,
  onApplyOptimization,
  refetch,
}: OptimizationPanelProps) {
  // Optimization type state
  const [optimizationType, setOptimizationType] = useState<'standard' | 'ai'>('standard');
  
  // Standard optimization settings
  const [prioritizeDistance, setPrioritizeDistance] = useState<boolean>(true);
  const [weightDistance, setWeightDistance] = useState<number[]>([70]);
  
  // AI optimization settings
  const [optimizeForCapacity, setOptimizeForCapacity] = useState<boolean>(false);
  const [respectGenre, setRespectGenre] = useState<boolean>(true);
  const [includeMarketConsiderations, setIncludeMarketConsiderations] = useState<boolean>(true);
  
  // Get the hook for optimization
  const {
    optimize,
    isOptimizing,
    error,
    optimizationResult
  } = useOptimizeTour(tourId);
  
  // Count venues by status
  const confirmedVenues = venues?.filter(v => v.tourVenue?.status === 'confirmed') || [];
  const potentialVenues = venues?.filter(v => v.tourVenue?.status === 'potential' || v.tourVenue?.status === 'hold') || [];
  
  // Calculate current route stats
  const hasPotentialVenues = potentialVenues.length > 0;
  const hasConfirmedVenues = confirmedVenues.length >= 2;
  const hasGeolocation = venues?.filter(v => v.venue?.latitude && v.venue?.longitude).length > 0;
  
  // Determine if we can run an optimization
  const canOptimize = hasGeolocation && (hasPotentialVenues || hasConfirmedVenues);
  
  // Calculate the optimization potential based on number of venues and their distribution
  const calculateOptimizationPotential = (): 'high' | 'medium' | 'low' => {
    if (potentialVenues.length > 5 && hasConfirmedVenues) return 'high';
    if (potentialVenues.length > 2 || venues.length > 8) return 'medium';
    return 'low';
  };
  
  const optimizationPotential = calculateOptimizationPotential();
  
  // Format the optimization score
  const formatScore = (score: number | undefined) => {
    if (score === undefined) return 'N/A';
    return `${Math.round(score)}/100`;
  };
  
  // Calculate improvement percentage
  const calculateImprovement = (current: number | undefined, improved: number | undefined) => {
    if (!current || !improved) return undefined;
    return Math.round(((improved - current) / current) * 100);
  };
  
  // Format improvement value with plus/minus sign
  const formatImprovement = (value: number | undefined) => {
    if (value === undefined) return '';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value}%`;
  };
  
  // Handle the optimization button click
  const handleOptimize = async () => {
    try {
      if (optimizationType === 'standard') {
        await optimize({
          type: 'standard',
          options: {
            prioritizeDistance,
            distanceWeight: weightDistance[0] / 100,
          }
        });
      } else {
        await optimize({
          type: 'ai',
          options: {
            optimizeForCapacity,
            respectGenre,
            includeMarketConsiderations,
          }
        });
      }
      
      toast({
        title: "Optimization complete",
        description: "Tour route has been optimized successfully.",
      });
      
    } catch (err) {
      console.error("Optimization failed:", err);
      toast({
        title: "Optimization failed",
        description: "There was an error optimizing the tour route.",
        variant: "destructive",
      });
    }
  };
  
  // Handle applying the optimized route
  const handleApplyOptimization = async () => {
    try {
      onApplyOptimization();
      refetch();
      
      toast({
        title: "Optimization applied",
        description: "The optimized route has been applied to your tour.",
      });
    } catch (err) {
      console.error("Failed to apply optimization:", err);
      toast({
        title: "Failed to apply optimization",
        description: "There was an error applying the optimized route.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Optimization Controls Panel */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-xl">Tour Route Optimization</CardTitle>
              <CardDescription>
                Optimize your tour route for distance, travel time, and venue suitability
              </CardDescription>
            </div>
            
            <Badge
              className={
                optimizationPotential === 'high'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : optimizationPotential === 'medium'
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }
            >
              {optimizationPotential === 'high' ? (
                <><BarChart className="h-3.5 w-3.5 mr-1" /> High Optimization Potential</>
              ) : optimizationPotential === 'medium' ? (
                <><BarChart className="h-3.5 w-3.5 mr-1" /> Medium Optimization Potential</>
              ) : (
                <><BarChart className="h-3.5 w-3.5 mr-1" /> Low Optimization Potential</>
              )}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2">
          {/* Optimization summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Route className="h-3.5 w-3.5 mr-1" />
                  Current Score
                </span>
                <span className="text-2xl font-bold">
                  {formatScore(tourData?.optimizationScore)}
                </span>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Route className="h-3.5 w-3.5 mr-1" />
                  Distance
                </span>
                <span className="text-2xl font-bold">
                  {formatDistance(tourData?.totalDistance || 0)}
                </span>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center">
                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                  Travel Time
                </span>
                <span className="text-2xl font-bold">
                  {formatTravelTime(tourData?.totalTravelTime || 0)}
                </span>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Fixed Venues
                </span>
                <span className="text-2xl font-bold">
                  {confirmedVenues.length}
                </span>
              </div>
            </div>
          </div>
          
          {optimizationResult && (
            <div className="mb-6 p-4 border rounded-lg bg-blue-50 border-blue-100">
              <h3 className="font-medium text-lg flex items-center text-blue-800">
                <Sparkles className="h-4 w-4 mr-2" />
                Optimization Results
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="flex flex-col">
                  <span className="text-sm text-blue-700 flex items-center">
                    <Calculator className="h-3.5 w-3.5 mr-1" />
                    Optimization Score
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="text-xl font-bold text-blue-900">
                      {formatScore(optimizationResult.optimizationScore)}
                    </span>
                    {tourData?.optimizationScore && (
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                        (optimizationResult.optimizationScore || 0) > tourData.optimizationScore
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {formatImprovement(calculateImprovement(
                          tourData.optimizationScore,
                          optimizationResult.optimizationScore
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-blue-700 flex items-center">
                    <Route className="h-3.5 w-3.5 mr-1" />
                    Total Distance
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="text-xl font-bold text-blue-900">
                      {formatDistance(optimizationResult.totalDistance || 0)}
                    </span>
                    {tourData?.totalDistance && (
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                        (optimizationResult.totalDistance || 0) < tourData.totalDistance
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {formatImprovement(calculateImprovement(
                          -(tourData.totalDistance),
                          -(optimizationResult.totalDistance || 0)
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm text-blue-700 flex items-center">
                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                    Travel Time
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="text-xl font-bold text-blue-900">
                      {formatTravelTime(optimizationResult.totalTravelTime || 0)}
                    </span>
                    {tourData?.totalTravelTime && (
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                        (optimizationResult.totalTravelTime || 0) < tourData.totalTravelTime
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {formatImprovement(calculateImprovement(
                          -(tourData.totalTravelTime),
                          -(optimizationResult.totalTravelTime || 0)
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={handleApplyOptimization}
                  className="gap-1"
                >
                  <ArrowRight className="h-4 w-4" />
                  Apply Optimization
                </Button>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Optimization Error</AlertTitle>
              <AlertDescription>
                {error || "There was a problem optimizing your tour route. Please try again."}
              </AlertDescription>
            </Alert>
          )}
          
          {!canOptimize && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-700">Limited Optimization Potential</AlertTitle>
              <AlertDescription className="text-amber-700">
                For best results, add more venues with location data. Optimization works best with a mix of confirmed and potential venues.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="standard" className="w-full" onValueChange={(v) => setOptimizationType(v as 'standard' | 'ai')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="standard">Standard Optimization</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                AI-Powered Optimization
              </TabsTrigger>
            </TabsList>
            
            {optimizationType === 'standard' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Distance Optimization</div>
                    <div className="text-sm text-muted-foreground">
                      Optimize for shortest total route distance
                    </div>
                  </div>
                  <Switch 
                    checked={prioritizeDistance}
                    onCheckedChange={setPrioritizeDistance}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Distance Weight: {weightDistance[0]}%</Label>
                  </div>
                  <Slider
                    defaultValue={[70]}
                    value={weightDistance}
                    onValueChange={setWeightDistance}
                    max={100}
                    step={5}
                    disabled={!prioritizeDistance}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values prioritize shorter total distance over other factors
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded text-blue-800 text-sm">
                  <Info className="h-4 w-4" />
                  AI optimization uses advanced algorithms to optimize for multiple factors simultaneously
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Venue Capacity Optimization</div>
                      <div className="text-sm text-muted-foreground">
                        Prefer venues with appropriate capacity for your expected audience
                      </div>
                    </div>
                    <Switch 
                      checked={optimizeForCapacity}
                      onCheckedChange={setOptimizeForCapacity}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Genre Compatibility</div>
                      <div className="text-sm text-muted-foreground">
                        Consider venue genre specialization and booking history
                      </div>
                    </div>
                    <Switch 
                      checked={respectGenre}
                      onCheckedChange={setRespectGenre}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Market Timing Optimization</div>
                      <div className="text-sm text-muted-foreground">
                        Optimize the sequence of primary and secondary markets
                      </div>
                    </div>
                    <Switch 
                      checked={includeMarketConsiderations}
                      onCheckedChange={setIncludeMarketConsiderations}
                    />
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" disabled={isOptimizing}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset Settings
          </Button>
          
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing || !canOptimize}
            className="gap-1"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <BarChart className="h-4 w-4" />
                Run Optimization
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}