
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Info, ArrowRight } from 'lucide-react';
import { optimizeTourRoute, applyTourOptimization } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function UnifiedTourOptimizer({ tourId, onOptimized }: { tourId: number; onOptimized?: () => void }) {
  const { toast } = useToast();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [preferences, setPreferences] = useState({
    optimizationGoal: 'balance',
    focusOnFanbase: true,
    maxDaysBetween: 5
  });

  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(tourId, preferences),
    onSuccess: (data) => {
      toast({
        title: 'Tour Optimized',
        description: `New optimization score: ${Math.round(data.optimizationScore)}/100`,
      });
      applyMutation.mutate(data);
    },
    onError: () => {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (data: any) => applyTourOptimization(tourId, data),
    onSuccess: () => {
      toast({
        title: 'Changes Applied',
        description: 'Tour route has been updated with optimized schedule.',
      });
      onOptimized?.();
    },
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
                setIsConfiguring(false);
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
    </>
  );
}
