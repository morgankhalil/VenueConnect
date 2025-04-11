
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Info, ArrowRight, Check } from 'lucide-react';
import { optimizeTourRoute, applyTourOptimization } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Define the OptimizationResult interface to type the data better
interface OptimizationResult {
  optimizationScore: number;
  totalDistance: number;
  totalTravelTime: number;
  tourVenues?: any[];
  potentialFillVenues?: any[];
  fixedPoints?: any[];
  gaps?: any[];
}

export function UnifiedTourOptimizer({ tourId, onOptimized }: { tourId: number; onOptimized?: () => void }) {
  const { toast } = useToast();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [preferences, setPreferences] = useState({
    optimizationGoal: 'balance',
    focusOnFanbase: true,
    maxDaysBetween: 5
  });

  // First step: Optimize the tour
  const optimizeMutation = useMutation({
    mutationFn: () => {
      console.log("Optimizing tour with preferences:", preferences);
      return optimizeTourRoute(tourId, preferences);
    },
    onSuccess: (data) => {
      console.log("Optimization successful, data received:", data);
      // Store the optimization result so we can display it
      setOptimizationResult(data);
      // Show the apply dialog
      setShowApplyDialog(true);
      
      toast({
        title: 'Tour Optimized',
        description: `New optimization score: ${Math.round(data.optimizationScore)}/100. Review and apply changes.`,
      });
    },
    onError: (error) => {
      console.error("Optimization failed:", error);
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Second step: Apply the optimization
  const applyMutation = useMutation({
    mutationFn: (data: OptimizationResult) => {
      console.log("Applying optimization with data:", data);
      return applyTourOptimization(tourId, data);
    },
    onSuccess: () => {
      toast({
        title: 'Changes Applied',
        description: 'Tour route has been updated with optimized schedule.',
      });
      // Close all dialogs
      setShowApplyDialog(false);
      setIsConfiguring(false);
      // Reset the stored result
      setOptimizationResult(null);
      // Call the callback
      onOptimized?.();
    },
    onError: (error) => {
      console.error("Apply optimization failed:", error);
      toast({
        title: 'Failed to Apply Changes',
        description: 'There was a problem updating the tour. Please try again.',
        variant: 'destructive',
      });
    }
  });

  return (
    <>
      <Button 
        onClick={() => setIsConfiguring(true)}
        className="w-full md:w-auto"
        variant="outline"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Quick Optimize Route
      </Button>

      {/* First dialog: Configure optimization settings */}
      <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Optimize Tour Route</DialogTitle>
            <DialogDescription>
              Configure optimization preferences to improve your tour schedule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Optimization Goal</Label>
              <Select
                value={preferences.optimizationGoal}
                onValueChange={(value) => setPreferences(p => ({ ...p, optimizationGoal: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balanced (Distance & Revenue)</SelectItem>
                  <SelectItem value="distance">Minimize Travel Distance</SelectItem>
                  <SelectItem value="revenue">Maximize Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="fanbase"
                checked={preferences.focusOnFanbase}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, focusOnFanbase: checked }))}
              />
              <Label htmlFor="fanbase">Consider artist fanbase data</Label>
            </div>

            <div className="space-y-2">
              <Label>Maximum Days Between Shows</Label>
              <Select
                value={preferences.maxDaysBetween.toString()}
                onValueChange={(value) => setPreferences(p => ({ ...p, maxDaysBetween: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select max days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsConfiguring(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                optimizeMutation.mutate();
              }}
              disabled={optimizeMutation.isPending || applyMutation.isPending}
            >
              {optimizeMutation.isPending ? (
                "Optimizing..."
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Optimize Route
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Second dialog: Review and apply optimization results */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Optimization</DialogTitle>
            <DialogDescription>
              Review the optimization results before applying changes
            </DialogDescription>
          </DialogHeader>

          {optimizationResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(optimizationResult.optimizationScore)}/100
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Distance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(optimizationResult.totalDistance)} km
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Travel Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(optimizationResult.totalTravelTime / 60)} hrs
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium mb-2">Optimization Summary</h3>
                <ul className="space-y-2">
                  {optimizationResult.tourVenues?.length ? (
                    <>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        <span>
                          {optimizationResult.tourVenues.length} venue locations optimized
                        </span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                        <span>
                          Travel route optimized for {preferences.optimizationGoal === 'distance' 
                            ? 'minimal travel distance' 
                            : preferences.optimizationGoal === 'revenue' 
                              ? 'maximum revenue potential'
                              : 'optimal balance of distance and revenue'}
                        </span>
                      </li>
                    </>
                  ) : (
                    <li className="text-amber-600">No route changes recommended</li>
                  )}

                  {optimizationResult.gaps?.length > 0 && (
                    <li className="flex items-center">
                      <Info className="h-4 w-4 mr-2 text-amber-500" />
                      <span>
                        Found {optimizationResult.gaps.length} gaps in your schedule
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (optimizationResult) {
                  applyMutation.mutate(optimizationResult);
                }
              }}
              disabled={!optimizationResult || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                "Applying changes..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply Optimization
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
