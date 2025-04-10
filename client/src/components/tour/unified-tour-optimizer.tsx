
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { optimizeTourRoute, applyTourOptimization } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function UnifiedTourOptimizer({ tourId }: { tourId: number }) {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(tourId),
    onSuccess: (data) => {
      setOptimizationResult(data);
      toast({
        title: 'Tour Optimized',
        description: `Optimization score: ${data.optimizationScore}`,
      });
      setIsOptimizing(false);
    },
    onError: () => {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route',
        variant: 'destructive',
      });
      setIsOptimizing(false);
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyTourOptimization(tourId, optimizationResult),
    onSuccess: () => {
      toast({
        title: 'Changes Applied',
        description: 'Tour route has been updated',
      });
      window.location.reload();
    },
  });

  const handleOptimize = () => {
    setIsOptimizing(true);
    optimizeMutation.mutate();
  };

  const handleApply = () => {
    applyMutation.mutate();
  };

  const renderWarnings = () => {
    return (
      <div className="text-sm text-muted-foreground">
        <Info className="h-4 w-4 inline-block mr-1" />
        Please ensure you have at least 2 venues with dates to optimize the tour route.
      </div>
    );
  };

  const renderResults = () => {
    if (!optimizationResult) return null;

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-1">Score</h4>
            <p className="text-2xl font-bold">{optimizationResult.optimizationScore}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-1">Total Distance</h4>
            <p className="text-2xl font-bold">{Math.round(optimizationResult.totalDistance)} km</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-1">Travel Time</h4>
            <p className="text-2xl font-bold">{Math.round(optimizationResult.totalTravelTime / 60)} hrs</p>
          </div>
        </div>

        {optimizationResult.potentialFillVenues?.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Recommended Venues</h4>
            <ul className="space-y-2">
              {optimizationResult.potentialFillVenues.map((venue: any) => (
                <li key={venue.venue.id} className="flex justify-between items-center">
                  <span>{venue.venue.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(venue.suggestedDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={handleApply} className="w-full">
          Apply Changes
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold">Tour Optimizer</h2>
      </CardHeader>
      <CardContent>
        {renderWarnings()}
        {renderResults()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          <Info className="h-4 w-4 inline-block mr-1" />
          Click optimize to generate the best route for your tour
        </div>
        <Button 
          onClick={handleOptimize} 
          disabled={isOptimizing}
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize Tour'}
        </Button>
      </CardFooter>
    </Card>
  );
}
