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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';
import {
  BarChart,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Truck,
  BarChart2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';

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
  const [optimizationType, setOptimizationType] = useState<'standard' | 'ai'>('standard');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [preserveConfirmedDates, setPreserveConfirmedDates] = useState(true);
  const [optimizeFor, setOptimizeFor] = useState<'distance' | 'time' | 'balanced'>('balanced');
  const [preferredDates, setPreferredDates] = useState<string>('');
  
  // Filter venues that can be optimized (not cancelled)
  const optimizableVenues = venues?.filter(venue => venue.status !== 'cancelled') || [];
  const confirmedVenues = venues?.filter(venue => venue.status === 'confirmed') || [];
  
  // Calculate current stats
  const currentTotalDistance = tourData?.totalDistance || 0;
  const currentTravelTime = tourData?.travelTimeMinutes || 0;
  
  // Calculate optimized stats (if available)
  const optimizedTotalDistance = optimizationResult?.totalDistance || 0;
  const optimizedTravelTime = optimizationResult?.travelTimeMinutes || 0;
  
  // Calculate improvements
  const distanceImprovement = optimizationResult 
    ? Math.round(((currentTotalDistance - optimizedTotalDistance) / currentTotalDistance) * 100) 
    : 0;
  
  const timeImprovement = optimizationResult 
    ? Math.round(((currentTravelTime - optimizedTravelTime) / currentTravelTime) * 100) 
    : 0;
  
  // Check if optimization is possible
  const canOptimize = optimizableVenues?.length >= 3;
  const hasDates = venues?.some(venue => venue.date) || false;
  
  // Handler for running standard optimization
  const handleRunStandardOptimization = async () => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/tours/${tourId}/optimize`, 'POST', {
          preserveConfirmedDates,
          optimizeFor,
          preferredDates: preferredDates ? preferredDates.split(',').map(date => date.trim()) : [],
          type: 'standard'
      });
      
      setOptimizationResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to optimize tour');
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Handler for running AI optimization
  const handleRunAIOptimization = async () => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/tours/${tourId}/optimize`, 'POST', {
          preserveConfirmedDates,
          preferredDates: preferredDates ? preferredDates.split(',').map(date => date.trim()) : [],
          type: 'ai'
      });
      
      setOptimizationResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to optimize tour with AI');
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Handler for applying optimization
  const handleApplyOptimization = async () => {
    if (!optimizationResult) return;
    
    try {
      await apiRequest(`/api/tours/${tourId}/apply-optimization`, 'POST', {
          optimizationId: optimizationResult.id
      });
      
      // Refresh tour data and notify parent
      refetch();
      onApplyOptimization();
      setOptimizationResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to apply optimization');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Optimization Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Tour Optimization</CardTitle>
              <CardDescription>
                Optimize your tour route to save time and distance
              </CardDescription>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Badge className={`px-3 py-1 ${tourData?.optimizationScore > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <BarChart className="h-3.5 w-3.5 mr-1" />
                Score: {tourData?.optimizationScore || 'Not optimized'}
              </Badge>
              
              {tourData?.optimizationScore && tourData?.optimizationScore < 70 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                  Needs improvement
                </Badge>
              )}
              
              {tourData?.optimizationScore && tourData?.optimizationScore >= 70 && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Optimized
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Total Distance</h3>
                <p className="text-muted-foreground text-sm">{formatDistance(currentTotalDistance)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Travel Time</h3>
                <p className="text-muted-foreground text-sm">{formatTravelTime(currentTravelTime)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Tour Duration</h3>
                <p className="text-muted-foreground text-sm">
                  {tourData?.startDate && tourData?.endDate 
                    ? `${formatDate(tourData.startDate)} - ${formatDate(tourData.endDate)}`
                    : 'Not finalized'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Optimization Tabs */}
      <Tabs defaultValue="standard" value={optimizationType} onValueChange={(value) => setOptimizationType(value as 'standard' | 'ai')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Optimization</TabsTrigger>
          <TabsTrigger value="ai">AI Optimization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Route Optimization</CardTitle>
              <CardDescription>
                Optimize your tour based on venue locations and travel distance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!canOptimize && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Optimization not available</AlertTitle>
                    <AlertDescription>
                      You need at least 3 non-cancelled venues to optimize your tour.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve-dates">Preserve confirmed venue dates</Label>
                    <Switch
                      id="preserve-dates"
                      checked={preserveConfirmedDates}
                      onCheckedChange={setPreserveConfirmedDates}
                      disabled={!canOptimize}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="optimize-for">Optimize for</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={optimizeFor === 'distance' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOptimizeFor('distance')}
                        disabled={!canOptimize}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Distance
                      </Button>
                      <Button
                        variant={optimizeFor === 'time' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOptimizeFor('time')}
                        disabled={!canOptimize}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Time
                      </Button>
                      <Button
                        variant={optimizeFor === 'balanced' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOptimizeFor('balanced')}
                        disabled={!canOptimize}
                      >
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Balanced
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="preferred-dates">Preferred dates (comma separated, optional)</Label>
                    <Input
                      id="preferred-dates"
                      placeholder="YYYY-MM-DD, YYYY-MM-DD, ..."
                      value={preferredDates}
                      onChange={(e) => setPreferredDates(e.target.value)}
                      disabled={!canOptimize}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add specific dates you'd prefer to include in your tour
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleRunStandardOptimization}
                disabled={!canOptimize || isOptimizing}
              >
                {isOptimizing && optimizationType === 'standard' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <BarChart className="h-4 w-4 mr-2" />
                    Run Optimization
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Optimization</CardTitle>
              <CardDescription>
                Use advanced AI to optimize your tour considering venues, dates, and routing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!canOptimize && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Optimization not available</AlertTitle>
                    <AlertDescription>
                      You need at least 3 non-cancelled venues to optimize your tour.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preserve-dates-ai">Preserve confirmed venue dates</Label>
                    <Switch
                      id="preserve-dates-ai"
                      checked={preserveConfirmedDates}
                      onCheckedChange={setPreserveConfirmedDates}
                      disabled={!canOptimize}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="preferred-dates-ai">Preferred dates (comma separated, optional)</Label>
                    <Input
                      id="preferred-dates-ai"
                      placeholder="YYYY-MM-DD, YYYY-MM-DD, ..."
                      value={preferredDates}
                      onChange={(e) => setPreferredDates(e.target.value)}
                      disabled={!canOptimize}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add specific dates you'd prefer to include in your tour
                    </p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-md space-y-2">
                    <div className="flex items-center">
                      <Sparkles className="h-5 w-5 text-primary mr-2" />
                      <span className="font-medium">AI Optimization Features</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                      <li className="flex items-start">
                        <ChevronRight className="h-3 w-3 mt-1 mr-1 flex-shrink-0" />
                        <span>Considers venue locations, capacity, and venue types</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-3 w-3 mt-1 mr-1 flex-shrink-0" />
                        <span>Balances travel efficiency with optimal date scheduling</span>
                      </li>
                      <li className="flex items-start">
                        <ChevronRight className="h-3 w-3 mt-1 mr-1 flex-shrink-0" />
                        <span>Generates detailed explanations for optimization decisions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleRunAIOptimization}
                disabled={!canOptimize || isOptimizing}
              >
                {isOptimizing && optimizationType === 'ai' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run AI Optimization
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Optimization failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Optimization Results */}
      {optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              Review the optimized tour route and improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Improvements Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-1">Optimization Score</div>
                  <div className="text-2xl font-bold">{optimizationResult.score || '-'}</div>
                  <div className="text-sm text-green-600 mt-1">
                    {optimizationResult.score > (tourData?.optimizationScore || 0) 
                      ? `+${optimizationResult.score - (tourData?.optimizationScore || 0)} improvement` 
                      : 'No change'}
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-1">Distance Savings</div>
                  <div className="text-2xl font-bold">{formatDistance(currentTotalDistance - optimizedTotalDistance)}</div>
                  <div className="text-sm text-green-600 mt-1">
                    {distanceImprovement > 0 ? `${distanceImprovement}% reduction` : 'No change'}
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="text-sm text-muted-foreground mb-1">Time Savings</div>
                  <div className="text-2xl font-bold">{formatTravelTime(currentTravelTime - optimizedTravelTime)}</div>
                  <div className="text-sm text-green-600 mt-1">
                    {timeImprovement > 0 ? `${timeImprovement}% reduction` : 'No change'}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Changes summary */}
              <div>
                <h3 className="text-lg font-medium mb-3">Proposed Changes</h3>
                <div className="space-y-3">
                  {optimizationResult.changedVenues?.map((change: any) => (
                    <div key={change.venueId} className="p-3 border rounded-md">
                      <div className="flex items-start">
                        <div className="bg-primary/10 p-1 rounded-full mr-3 mt-0.5">
                          {change.type === 'date_change' ? (
                            <CalendarIcon className="h-4 w-4 text-primary" />
                          ) : (
                            <MapPin className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{change.venueName}</div>
                          <p className="text-sm text-muted-foreground">
                            {change.type === 'date_change' 
                              ? `Date changed from ${formatDate(change.previousDate) || 'unscheduled'} to ${formatDate(change.newDate)}` 
                              : `Sequence changed from position ${change.previousPosition} to ${change.newPosition}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!optimizationResult.changedVenues || optimizationResult.changedVenues.length === 0) && (
                    <div className="text-center p-4 border rounded-md text-muted-foreground">
                      No venue changes needed
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI explanation */}
              {optimizationType === 'ai' && optimizationResult.explanation && (
                <div>
                  <h3 className="text-lg font-medium mb-3">AI Optimization Explanation</h3>
                  <div className="p-4 border rounded-md bg-primary/5">
                    <p className="text-sm">{optimizationResult.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOptimizationResult(null)}>
              Discard
            </Button>
            <Button onClick={handleApplyOptimization}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply Optimization
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}