import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getTour, optimizeTourRoute } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { 
  Truck, Loader2, MapPin, Calendar, Route, Check, 
  X, Clock, ArrowRight, ChevronRight, Building, Map as MapIcon
} from 'lucide-react';
import { VenueMap } from '@/components/maps/venue-map';
import { MapEvent, OptimizationVenue } from '@/types';

export default function TourOptimizePage() {
  const [match, params] = useRoute('/tours/:id/optimize');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [mapEvents, setMapEvents] = useState<MapEvent[]>([]);
  
  // Get tour data
  const { 
    data: tour, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/tour/tours', params?.id],
    queryFn: () => getTour(Number(params?.id)),
    enabled: !!params?.id,
  });
  
  // Prepare map data when optimization results are available
  useEffect(() => {
    if (optimizationResult && optimizationResult.tourVenues) {
      // Get fixed venues from the tour
      const fixedVenues: MapEvent[] = optimizationResult.tourVenues
        .filter((venue: OptimizationVenue) => venue.venue && venue.latitude && venue.longitude)
        .map((venue: OptimizationVenue, index: number) => ({
          id: venue.id,
          venue: venue.venue?.name || `Venue ${venue.id}`,
          latitude: venue.latitude,
          longitude: venue.longitude,
          date: venue.date || undefined,
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          status: venue.status || 'confirmed',
          venue_id: venue.venue?.id
        }));
      
      // Get suggested venues from the potential fill venues
      const suggestedVenues: MapEvent[] = optimizationResult.potentialFillVenues
        ? optimizationResult.potentialFillVenues
            .filter((venue: any) => 
              venue.venue && 
              venue.venue.latitude && 
              venue.venue.longitude && 
              (!venue.isFixed || venue.status === 'suggested')
            )
            .map((venue: any) => ({
              id: venue.venue.id,
              venue: venue.venue.name || `Venue ${venue.venue.id}`,
              latitude: venue.venue.latitude,
              longitude: venue.venue.longitude,
              date: venue.date || undefined,
              isCurrentVenue: false,
              isRoutingOpportunity: true, // Mark suggested venues as routing opportunities for the map
              status: 'suggested',
              venue_id: venue.venue.id
            }))
        : [];
      
      // Combine and set all map events
      setMapEvents([...fixedVenues, ...suggestedVenues]);
    }
  }, [optimizationResult]);
  
  // Optimize tour mutation
  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(Number(params?.id)),
    onSuccess: (data) => {
      setOptimizationResult(data);
      toast({
        title: 'Tour Optimized',
        description: `Tour route optimized with score: ${data.optimizationScore.toFixed(2)}`,
      });
      // Refresh tour data
      refetch();
    },
    onError: () => {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route. Please ensure you have at least 2 venues with dates (confirmed, booked, or planning).',
        variant: 'destructive',
      });
    },
  });
  
  const handleOptimize = () => {
    optimizeMutation.mutate();
  };
  
  if (!match || !params?.id) {
    return <div>Invalid tour ID</div>;
  }
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-lg font-medium">Error Loading Tour</h2>
          <p className="text-muted-foreground mt-2">
            Failed to load tour details. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  // Check if the tour has enough venues with dates for optimization
  // We accept confirmed, booked, and planning venues as long as they have dates
  const venuesWithDates = tour.venues?.filter(v => 
    (v.tourVenue.status === 'confirmed' || v.tourVenue.status === 'booked' || v.tourVenue.status === 'planning') && 
    v.tourVenue.date
  ) || [];
  
  const confirmedVenues = venuesWithDates.filter(v => v.tourVenue.status === 'confirmed');
  const hasEnoughVenuesWithDates = venuesWithDates.length >= 2;
  
  return (
    <div className="container py-6">
      <PageHeader
        title="Tour Optimization"
        description="Optimize your tour routing based on venue locations and preferences"
        icon={<Truck size={28} />}
        backLink={`/tours/${params?.id}`}
        backLinkText="Back to Tour"
      />
      
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{tour.name}</CardTitle>
            <CardDescription>
              {tour.startDate && tour.endDate ? (
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                </span>
              ) : (
                'No date range set'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Venues</h3>
                <p className="font-medium">
                  {tour.venues?.length || 0} venues
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({confirmedVenues.length} confirmed)
                  </span>
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground">Current Distance</h3>
                <p className="font-medium">
                  {tour.estimatedTravelDistance ? (
                    `${Math.round(tour.estimatedTravelDistance)} km`
                  ) : (
                    'Not calculated'
                  )}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground">Optimization Score</h3>
                <p className="font-medium">
                  {tour.optimizationScore ? (
                    `${tour.optimizationScore.toFixed(2)} / 100`
                  ) : (
                    'Not optimized'
                  )}
                </p>
              </div>
            </div>
            
            {!hasEnoughVenuesWithDates && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md mb-6">
                <h3 className="font-medium flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  More Venues Needed
                </h3>
                <p className="mt-1 text-sm">
                  Tour optimization requires at least 2 venues with dates (confirmed, booked, or planning). 
                  You currently have {venuesWithDates.length} venue(s) with dates.
                </p>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button
                onClick={handleOptimize}
                disabled={!hasEnoughVenuesWithDates || optimizeMutation.isPending}
                size="lg"
              >
                {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Truck className="mr-2 h-5 w-5" />
                Optimize Tour Route
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {optimizationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
              <CardDescription>
                New optimization score: {optimizationResult.optimizationScore.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="route">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="route">
                    <Route className="mr-2 h-4 w-4" />
                    Optimized Route
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <MapIcon className="mr-2 h-4 w-4" />
                    Tour Map
                  </TabsTrigger>
                  <TabsTrigger value="suggestions">
                    <Building className="mr-2 h-4 w-4" />
                    Venue Suggestions
                  </TabsTrigger>
                  <TabsTrigger value="stats">
                    <Clock className="mr-2 h-4 w-4" />
                    Travel Statistics
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="route" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Optimized Venue Sequence</h3>
                    <div className="space-y-2">
                      {optimizationResult.tourVenues?.map((venue: any, index: number) => (
                        <div key={index} className="flex items-center p-3 bg-muted/30 rounded-md">
                          <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full mr-3">
                            <span className="font-medium text-sm">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{venue.venue?.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {venue.venue?.city || 'Location data unavailable'}
                              {venue.venue?.region ? `, ${venue.venue?.region}` : ''}
                            </div>
                          </div>
                          {venue.date && (
                            <Badge variant="outline">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {formatDate(venue.date)}
                            </Badge>
                          )}
                          {venue.status ? (
                            <Badge className={`ml-2 ${venue.status === 'suggested' ? 'bg-blue-500' : ''}`}>
                              {venue.status === 'confirmed' ? 'Confirmed' : 
                               venue.status === 'booked' ? 'Booked' : 
                               venue.status === 'planning' ? 'Planning' : 
                               venue.status === 'suggested' ? 'Suggested' : 
                               venue.isFixed ? 'Fixed' : 'Flexible'}
                            </Badge>
                          ) : (
                            venue.isFixed ? (
                              <Badge className="ml-2">Fixed</Badge>
                            ) : (
                              <Badge variant="outline" className="ml-2">Suggested</Badge>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="map" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Tour Map with Venue Locations</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Visualize your tour route and suggested venues on the map. 
                      Blue markers indicate suggested venues that could fill gaps in your tour schedule.
                    </p>
                    
                    {mapEvents.length > 0 ? (
                      <Card>
                        <CardContent className="p-2">
                          <VenueMap 
                            events={mapEvents} 
                            height={500}
                            showLegend={true}
                            showRoute={true}
                          />
                        </CardContent>
                        <CardFooter className="bg-muted/30 p-4 text-sm flex justify-between items-center">
                          <div className="flex space-x-4">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1"></span>
                              <span>Confirmed/Booked/Planning Venues</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-amber-500 rounded-full inline-block mr-1"></span>
                              <span>Suggested Venues</span>
                            </div>
                          </div>
                          <span className="text-muted-foreground">
                            {mapEvents.length} venues shown
                          </span>
                        </CardFooter>
                      </Card>
                    ) : (
                      <div className="bg-muted/30 p-8 rounded-md text-center">
                        <MapIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          No venue locations available to display.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="suggestions" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Suggested Venues for Tour</h3>
                    
                    {/* Filter for suggested venues from the potential fill venues */}
                    {optimizationResult.potentialFillVenues && 
                     optimizationResult.potentialFillVenues.filter((v: any) => 
                      !v.isFixed || v.status === 'suggested'
                     ).length > 0 ? (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Potential Venues</CardTitle>
                            <CardDescription>
                              Venues that could fill gaps in your tour schedule
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {optimizationResult.potentialFillVenues
                                .filter((venue: any) => !venue.isFixed || venue.status === 'suggested')
                                .map((venue: any, index: number) => (
                                <div key={index} className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full mr-3">
                                    <span className="font-medium text-sm">{index + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-blue-800">{venue.venue?.name}</div>
                                    <div className="text-sm text-blue-600 flex items-center">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {venue.venue?.city || 'Location data unavailable'}
                                      {venue.venue?.region ? `, ${venue.venue?.region}` : ''}
                                    </div>
                                  </div>
                                  {venue.date && (
                                    <Badge variant="outline" className="bg-white">
                                      <Calendar className="h-3.5 w-3.5 mr-1" />
                                      {formatDate(venue.date)}
                                    </Badge>
                                  )}
                                  <Badge className="ml-2 bg-blue-500 hover:bg-blue-600">Suggested</Badge>
                                  <Button size="sm" variant="outline" className="ml-2 border-blue-300 hover:bg-blue-100 hover:text-blue-800">
                                    Add to Tour
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No venue suggestions available for this tour
                      </div>
                    )}
                    
                    {/* Still show gaps if they exist */}
                    {optimizationResult.gaps && optimizationResult.gaps.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-medium mb-4">Detected Tour Gaps</h3>
                        <div className="space-y-4">
                          {optimizationResult.gaps.map((gap: any, index: number) => (
                            <Card key={index}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">Gap {index + 1}</CardTitle>
                                <CardDescription>
                                  {gap.startVenueId} to {gap.endVenueId}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="text-sm">
                                  <p><strong>Days between:</strong> {gap.daysBetween}</p>
                                  <p><strong>Start date:</strong> {formatDate(gap.startDate)}</p>
                                  <p><strong>End date:</strong> {formatDate(gap.endDate)}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Distance</h3>
                        <p className="font-medium text-xl">
                          {Math.round(optimizationResult.totalDistance)} km
                        </p>
                        {tour.estimatedTravelDistance && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {optimizationResult.totalDistance < tour.estimatedTravelDistance ? (
                              <span className="text-green-600">
                                {Math.round((1 - optimizationResult.totalDistance / tour.estimatedTravelDistance) * 100)}% reduction
                              </span>
                            ) : (
                              <span>No change</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Travel Time</h3>
                        <p className="font-medium text-xl">
                          {Math.round(optimizationResult.totalTravelTime / 60)} hours
                        </p>
                        {tour.estimatedTravelTime && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {optimizationResult.totalTravelTime < tour.estimatedTravelTime ? (
                              <span className="text-green-600">
                                {Math.round((1 - optimizationResult.totalTravelTime / tour.estimatedTravelTime) * 100)}% reduction
                              </span>
                            ) : (
                              <span>No change</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/tours/${params?.id}`)}>
                Return to Tour Details
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}