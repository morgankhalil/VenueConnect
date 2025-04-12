import React, { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, ArrowRight, Check, Clock, LocateFixed, Map } from 'lucide-react';
import { VenueMap } from '@/components/maps/venue-map';
import { MapEvent } from '@/types';
import { calculateDistanceBetweenCoords, formatDistance, formatTravelTime } from '@/lib/utils';

interface TourComparisonViewProps {
  tourId: number;
  originalVenues: MapEvent[];
  optimizedVenues: MapEvent[];
  originalDistance: number;
  optimizedDistance: number;
  originalTravelTime: number;
  optimizedTravelTime: number;
  optimizationScore: number;
}

export function TourComparisonView({
  tourId,
  originalVenues,
  optimizedVenues,
  originalDistance,
  optimizedDistance,
  originalTravelTime,
  optimizedTravelTime,
  optimizationScore
}: TourComparisonViewProps) {
  
  // Calculate improvement percentages
  const distanceImprovement = originalDistance > 0 
    ? Math.round((originalDistance - optimizedDistance) / originalDistance * 100) 
    : 0;
  
  const timeImprovement = originalTravelTime > 0 
    ? Math.round((originalTravelTime - optimizedTravelTime) / originalTravelTime * 100) 
    : 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Map className="mr-2 h-5 w-5" />
            Tour Route Comparison
          </div>
          <Badge variant="outline" className="ml-2 bg-primary/10">
            Score: {optimizationScore.toFixed(0)}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="original">Original Route</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="optimized">Optimized Route</TabsTrigger>
          </TabsList>
          
          <TabsContent value="original" className="p-4">
            <div className="h-[400px] relative">
              <VenueMap 
                events={originalVenues}
                height={400}
                showLegend={true}
                showRoute={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-muted rounded-md p-3">
                <div className="text-muted-foreground text-sm mb-1">Total Distance</div>
                <div className="text-lg font-medium">{formatDistance(originalDistance)}</div>
              </div>
              <div className="bg-muted rounded-md p-3">
                <div className="text-muted-foreground text-sm mb-1">Travel Time</div>
                <div className="text-lg font-medium">{formatTravelTime(originalTravelTime)}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="optimized" className="p-4">
            <div className="h-[400px] relative">
              <VenueMap 
                events={optimizedVenues}
                height={400}
                showLegend={true}
                showRoute={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-muted rounded-md p-3">
                <div className="text-muted-foreground text-sm mb-1">Optimized Distance</div>
                <div className="text-lg font-medium">{formatDistance(optimizedDistance)}</div>
              </div>
              <div className="bg-muted rounded-md p-3">
                <div className="text-muted-foreground text-sm mb-1">Optimized Travel Time</div>
                <div className="text-lg font-medium">{formatTravelTime(optimizedTravelTime)}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comparison" className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-[300px] relative">
                <div className="bg-orange-50 p-2 text-sm font-medium text-orange-800 rounded-t-md">
                  Original Route
                </div>
                <VenueMap 
                  events={originalVenues}
                  height={300}
                  showLegend={false}
                  showRoute={true}
                />
              </div>
              <div className="h-[300px] relative">
                <div className="bg-green-50 p-2 text-sm font-medium text-green-800 rounded-t-md">
                  Optimized Route
                </div>
                <VenueMap 
                  events={optimizedVenues}
                  height={300}
                  showLegend={false}
                  showRoute={true}
                />
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-md p-4 mt-2">
              <h4 className="text-lg font-medium mb-2 flex items-center">
                <Check className="mr-2 h-5 w-5 text-green-600" />
                Optimization Benefits
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-md p-3 shadow-sm">
                  <div className="text-muted-foreground text-sm mb-1 flex items-center">
                    <LocateFixed className="mr-1 h-4 w-4" />
                    Distance Reduced
                  </div>
                  <div className="text-lg font-medium flex items-center">
                    {formatDistance(originalDistance - optimizedDistance)}
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                      -{distanceImprovement}%
                    </Badge>
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 shadow-sm">
                  <div className="text-muted-foreground text-sm mb-1 flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    Time Saved
                  </div>
                  <div className="text-lg font-medium flex items-center">
                    {formatTravelTime(originalTravelTime - optimizedTravelTime)}
                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                      -{timeImprovement}%
                    </Badge>
                  </div>
                </div>
                <div className="bg-white rounded-md p-3 shadow-sm">
                  <div className="text-muted-foreground text-sm mb-1 flex items-center">
                    <ArrowRight className="mr-1 h-4 w-4" />
                    Optimized Routing
                  </div>
                  <div className="text-lg font-medium">
                    {originalVenues.length} venues reordered
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}