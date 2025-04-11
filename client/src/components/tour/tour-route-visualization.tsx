import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateTourRoutes, getTourRoutes, TourRoute } from '../../lib/api';
import { OptimizedRouteMap } from './optimized-route-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertTriangle, BarChart, Map, Check, RefreshCw } from 'lucide-react';
import { formatDistance, formatTime } from '../../lib/utils';

interface TourRouteVisualizationProps {
  tourId: number;
  tourName: string;
}

export function TourRouteVisualization({ tourId, tourName }: TourRouteVisualizationProps) {
  const [activeTab, setActiveTab] = useState('map');
  const queryClient = useQueryClient();
  
  // Fetch the tour route data
  const { 
    data: tourRoutes = [],
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['/api/tour-optimization/tours', tourId, 'routes'],
    queryFn: () => getTourRoutes(tourId),
    enabled: Boolean(tourId)
  });
  
  // Mutation to calculate routes
  const calculateRoutesMutation = useMutation({
    mutationFn: () => calculateTourRoutes(tourId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tour-optimization/tours', tourId, 'routes'] 
      });
    }
  });

  const handleCalculateRoutes = () => {
    calculateRoutesMutation.mutate();
  };

  // Calculate summary metrics
  const totalDistance = tourRoutes?.reduce((sum, route) => 
    sum + (route?.distanceKm || 0), 0) || 0;
  
  const totalTime = tourRoutes?.reduce((sum, route) => 
    sum + (route?.estimatedTravelTimeMinutes || 0), 0) || 0;
  
  const avgScore = tourRoutes?.length 
    ? Math.round(tourRoutes.reduce((sum, route) => 
        sum + (route?.optimizationScore || 0), 0) / tourRoutes.length) 
    : 0;

  // Show loading state
  if (isLoading || calculateRoutesMutation.isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-lg font-medium">
              {calculateRoutesMutation.isPending 
                ? "Calculating optimal routes..." 
                : "Loading tour route data..."}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {calculateRoutesMutation.isPending 
                ? "We're analyzing distances and travel times between venues" 
                : "Retrieving route visualization data"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Tour Route</AlertTitle>
        <AlertDescription>
          There was a problem loading the route data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Show empty state with action to calculate routes
  if (!tourRoutes || tourRoutes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Route Optimization</CardTitle>
          <CardDescription>
            Calculate optimal routes between venues for this tour
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="text-center mb-6">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Route Data Available</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Generate route data to visualize the optimal path between venues and get insights on travel distances and times.
            </p>
          </div>
          <Button 
            onClick={handleCalculateRoutes}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Calculate Route Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0">
        <div className="flex justify-between items-center mb-2">
          <CardTitle>Tour Route: {tourName}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCalculateRoutes}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recalculate
          </Button>
        </div>
        <CardDescription>
          {tourRoutes.length} route segments covering {formatDistance(totalDistance)} with an estimated travel time of {formatTime(totalTime)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-0">
        <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart className="h-4 w-4" />
              Route Stats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="mt-0">
            <OptimizedRouteMap 
              tourId={tourId} 
              height="500px" 
              showRouteDetails={true}
            />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-0">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Total Distance</span>
                    <span className="text-3xl font-bold mt-1">{formatDistance(totalDistance)}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Travel Time</span>
                    <span className="text-3xl font-bold mt-1">{formatTime(totalTime)}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-sm">Optimization Score</span>
                    <div className="flex items-center mt-1">
                      <span className="text-3xl font-bold">{avgScore}</span>
                      <div className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                        avgScore > 80 
                          ? 'bg-green-100 text-green-800'
                          : avgScore > 60
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {avgScore > 80 ? "Excellent" : avgScore > 60 ? "Good" : "Fair"}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="font-medium text-lg mb-4">Route Statistics</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Travel Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tourRoutes.map((route) => (
                          <tr key={route.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">{route.startVenue?.name}</div>
                              <div className="text-sm text-gray-500">{route.startVenue?.city}, {route.startVenue?.region}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">{route.endVenue?.name}</div>
                              <div className="text-sm text-gray-500">{route.endVenue?.city}, {route.endVenue?.region}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatDistance(route.distanceKm || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatTime(route.estimatedTravelTimeMinutes || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-sm font-medium">{route.optimizationScore || 0}</span>
                                {(route.optimizationScore || 0) > 70 && (
                                  <Check className="h-4 w-4 text-green-500 ml-2" />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}