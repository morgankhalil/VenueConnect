
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { optimizeTourRoute } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function UnifiedTourOptimizer({ tourId }: { tourId: number }) {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(tourId),
    onSuccess: (data) => {
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

  const handleOptimize = () => {
    setIsOptimizing(true);
    optimizeMutation.mutate();
  };

  const renderWarnings = () => {
    return (
      <div className="text-sm text-muted-foreground">
        <Info className="h-4 w-4 inline-block mr-1" />
        Please ensure you have at least 2 venues with dates to optimize the tour route.
      </div>
    );
  };

  return (
    <Card>
      <CardContent>
        {renderWarnings()}
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
