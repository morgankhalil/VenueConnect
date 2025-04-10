import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTour, optimizeTourRoute, updateTour } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { VenueStatusBadge } from './venue-status-badge';
import { 
  getStatusInfo, 
  getStatusBadgeVariant, 
  STATUS_DISPLAY_NAMES,
  isPriorityHold
} from '@/lib/tour-status';
import { UpdateVenueForm } from './update-venue-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TourVenueForm } from './tour-venue-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  CalendarDays, Info, Map, MapPin, Loader2, PenLine, Truck, BarChart3, 
  ArrowRight, Check, Ban, Clock, Route, Calendar, Building, ChevronRight
} from 'lucide-react';
import { MapEvent } from '@/types';
import { VenueMap } from '@/components/maps/venue-map';

type TourDetailProps = {
  tourId: number | string;
};

export function TourDetail({ tourId }: TourDetailProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [mapEvents, setMapEvents] = useState<MapEvent[]>([]);
  const [showOptimizationResults, setShowOptimizationResults] = useState(false);
  
  // Fetch tour details
  const { 
    data: tour, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/tour/tours', tourId],
    queryFn: () => getTour(Number(tourId)),
  });
  
  // Create map events from tour venues (even without optimization)
  useEffect(() => {
    if (tour?.venues) {
      const venues = tour.venues
        .filter(v => v.venue && v.venue.latitude && v.venue.longitude)
        .map(v => ({
          id: v.venue.id,
          venue: v.venue.name || `Venue ${v.venue.id}`,
          latitude: v.venue.latitude,
          longitude: v.venue.longitude,
          date: v.tourVenue.date || undefined,
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          status: v.tourVenue.status || 'confirmed',
          venue_id: v.venue.id
        }));
      
      if (venues.length > 0) {
        setMapEvents(venues);
      }
    }
  }, [tour]);
  
  // Prepare map data when optimization results are available
  useEffect(() => {
    if (optimizationResult) {
      // Get fixed venues from the optimization fixedPoints array
      const fixedVenues: MapEvent[] = optimizationResult.fixedPoints
        ? optimizationResult.fixedPoints
            .filter((point: any) => point.latitude && point.longitude)
            .map((point: any, index: number) => {
              // Find the matching venue from the tour data
              const matchingVenue = tour?.venues?.find(v => v.venue?.id === point.id)?.venue;
              
              return {
                id: point.id,
                venue: matchingVenue?.name || `Venue ${point.id}`,
                latitude: point.latitude,
                longitude: point.longitude,
                date: point.date || undefined,
                isCurrentVenue: false,
                isRoutingOpportunity: false,
                status: point.status || 'confirmed',
                venue_id: point.id
              };
            })
        : [];
      
      // Get suggested venues from the potential fill venues
      const suggestedVenues: MapEvent[] = optimizationResult.potentialFillVenues
        ? optimizationResult.potentialFillVenues
            .filter((item: any) => 
              item.venue && 
              item.venue.latitude !== null && 
              item.venue.longitude !== null &&
              // Only include venues that are not already in fixedVenues
              !fixedVenues.some(v => v.id === item.venue.id)
            )
            .map((item: any) => ({
              id: item.venue.id,
              venue: item.venue.name || `Venue ${item.venue.id}`,
              latitude: item.venue.latitude,
              longitude: item.venue.longitude,
              date: item.suggestedDate || undefined,
              isCurrentVenue: false,
              isRoutingOpportunity: true, // Mark suggested venues as routing opportunities for the map
              status: 'suggested',
              venue_id: item.venue.id
            }))
        : [];
      
      // Combine and set all map events
      const allEvents = [...fixedVenues, ...suggestedVenues];
      setMapEvents(allEvents);
    }
  }, [optimizationResult, tour]);
  
  // Update tour status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => 
      updateTour(Number(tourId), { status }),
    onSuccess: () => {
      toast({
        title: 'Tour Status Updated',
        description: 'The tour status has been updated successfully.',
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update tour status.',
        variant: 'destructive',
      });
    },
  });
  
  // Tour optimization mutation (for direct optimization via API)
  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(Number(tourId)),
    onSuccess: (data) => {
      setOptimizationResult(data);
      setShowOptimizationResults(true);
      toast({
        title: 'Tour Optimized',
        description: `Tour route optimized with score: ${data.optimizationScore.toFixed(2)}`,
      });
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
  
  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate(status);
  };
  
  // Check if the tour has enough venues with dates for optimization
  const venuesWithDates = tour?.venues?.filter(v => 
    (v.tourVenue.status === 'confirmed' || v.tourVenue.status === 'booked' || v.tourVenue.status === 'planning') && 
    v.tourVenue.date
  ) || [];
  
  const hasEnoughVenuesWithDates = venuesWithDates.length >= 2;
  
  const handleOptimize = () => {
    optimizeMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !tour) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Tour</CardTitle>
          <CardDescription>There was an error loading the tour details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load tour details. Please try again later.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => navigate('/tours')}>Back to Tours</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{tour.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={getTourStatusVariant(tour.status)}>
                  {tour.status || 'Unknown Status'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  <CalendarDays className="inline mr-1 h-4 w-4" />
                  {tour.startDate && tour.endDate ? (
                    `${formatDate(tour.startDate)} - ${formatDate(tour.endDate)}`
                  ) : (
                    'No dates set'
                  )}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOptimize}
                disabled={!hasEnoughVenuesWithDates || optimizeMutation.isPending}
              >
                {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Truck className="mr-2 h-4 w-4" />
                Optimize
              </Button>
              <Link href={`/tours/${tourId}/edit`}>
                <Button size="sm">
                  <PenLine className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Artist</h3>
              <p className="font-medium">
                {tour.artist ? tour.artist.name : 'No artist assigned'}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Venues</h3>
              <p className="font-medium">
                {tour.venues ? tour.venues.length : 0} venues
                <span className="ml-2 text-sm text-muted-foreground">
                  ({tour.venues?.filter(v => v.tourVenue.status === 'confirmed').length || 0} confirmed)
                </span>
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Budget</h3>
              <p className="font-medium">
                {tour.totalBudget ? formatCurrency(tour.totalBudget) : 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <h3 className="font-medium">Description</h3>
            <p className="text-muted-foreground">
              {tour.description || 'No description provided.'}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Status</h3>
              <Select
                value={tour.status || 'planning'}
                onValueChange={handleStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tour Optimization Results Card (displayed when optimization is complete) */}
      {showOptimizationResults && optimizationResult && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                <Truck className="inline-block mr-2 h-5 w-5" />
                Tour Optimization Results
              </CardTitle>
              <Badge variant="outline" className="bg-primary/10">
                Score: {optimizationResult.optimizationScore.toFixed(2)}/100
              </Badge>
            </div>
            <CardDescription>
              Route optimization completed with {optimizationResult.fixedPoints?.length || 0} fixed venues 
              and {optimizationResult.potentialFillVenues?.filter((v: any) => !v.isFixed)?.length || 0} suggested venues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="map">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="map">
                  <Map className="mr-2 h-4 w-4" />
                  Route Map
                </TabsTrigger>
                <TabsTrigger value="suggested-venues">
                  <Building className="mr-2 h-4 w-4" />
                  Suggested Venues
                </TabsTrigger>
                <TabsTrigger value="stats">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Optimization Stats
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="map" className="mt-4">
                {mapEvents.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        See the optimized tour map with confirmed venues (green markers) and suggested venues (amber markers)
                        that could fill gaps in your schedule.
                      </p>
                    </div>
                    <div className="bg-muted rounded-md h-[400px] overflow-hidden">
                      <VenueMap 
                        events={mapEvents}
                        height={400}
                        showLegend={true}
                        showRoute={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-muted rounded-md">
                    <Map className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-muted-foreground">
                      No venue locations available to display
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="suggested-venues" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    These venues could be added to your tour to fill gaps in your schedule
                  </p>
                  
                  {optimizationResult.potentialFillVenues && 
                   optimizationResult.potentialFillVenues
                    .filter((item: any) => 
                      item.venue && 
                      !optimizationResult.fixedPoints.some((p: any) => p.id === item.venue.id)
                    )
                    .length > 0 ? (
                    <div className="space-y-2">
                      {optimizationResult.potentialFillVenues
                        .filter((item: any) => 
                          item.venue && 
                          !optimizationResult.fixedPoints.some((p: any) => p.id === item.venue.id)
                        )
                        .map((item: any, index: number) => (
                          <div key={index} className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3">
                              <span className="font-medium text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.venue.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.venue.city || 'Location data unavailable'}
                                {item.venue.region ? `, ${item.venue.region}` : ''}
                              </div>
                            </div>
                            {item.suggestedDate && (
                              <Badge variant="outline" className="bg-white">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                {formatDate(item.suggestedDate)}
                              </Badge>
                            )}
                            <Badge 
                              className="ml-2" 
                              style={{
                                backgroundColor: item.status ? getStatusInfo(item.status).color : getStatusInfo('suggested').color,
                                color: 'white'
                              }}
                            >
                              {item.status ? STATUS_DISPLAY_NAMES[item.status] : 'Suggested'}
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="ml-2"
                                  style={{
                                    borderColor: `${getStatusInfo(item.status || 'suggested').color}30`,
                                    color: getStatusInfo(item.status || 'suggested').color
                                  }}
                                >
                                  Add to Tour
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add {item.venue.name} to Tour</DialogTitle>
                                  <DialogDescription>
                                    This venue is a good fit for your tour schedule.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Suggested Date</p>
                                    <Badge>
                                      <Calendar className="h-3.5 w-3.5 mr-1" />
                                      {formatDate(item.suggestedDate)}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Recommended Priority</p>
                                    <div className="flex space-x-2">
                                      {item.status ? (
                                        <Badge
                                          style={{
                                            backgroundColor: getStatusInfo(item.status).color,
                                            color: 'white'
                                          }}
                                        >
                                          {STATUS_DISPLAY_NAMES[item.status]}
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-blue-500">Suggested</Badge>
                                      )}
                                      {item.detourRatio && (
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round((item.detourRatio - 1) * 100)}% route deviation
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    onClick={async () => {
                                      try {
                                        // Call API to add venue to tour with the suggested status
                                        const response = await fetch(`/api/tour/tours/${tourId}/venues`, {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            tourId: Number(tourId),
                                            venueId: item.venue.id,
                                            status: item.status || 'suggested',
                                            date: item.suggestedDate,
                                            notes: `Added from tour optimization suggestions. Route deviation: ${item.detourRatio ? Math.round((item.detourRatio - 1) * 100) + '%' : 'unknown'}`
                                          }),
                                        });
                                        
                                        if (!response.ok) {
                                          throw new Error('Failed to add venue to tour');
                                        }
                                        
                                        toast({
                                          title: "Success",
                                          description: `Added ${item.venue.name} to your tour with ${item.status || 'suggested'} status.`,
                                        });
                                        
                                        // Close dialog and refresh data
                                        refetch();
                                      } catch (error) {
                                        console.error('Error adding venue to tour:', error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to add venue to tour.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={optimizeMutation.isPending}
                                  >
                                    {optimizeMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                        Processing...
                                      </>
                                    ) : (
                                      'Add to Tour'
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">
                        No venue suggestions available for this tour
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-muted/30">
            <Button 
              variant="outline" 
              size="sm"
              className="mr-2"
              onClick={() => setShowOptimizationResults(false)}
            >
              Hide Optimization Results
            </Button>
            <Button
              variant="default" 
              size="sm"
              onClick={handleOptimize}
              disabled={optimizeMutation.isPending}
            >
              {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Re-optimize Tour
            </Button>
          </CardFooter>
        </Card>
      )}
      
      <Tabs defaultValue="venues">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="venues">
            <MapPin className="mr-2 h-4 w-4" />
            Venues
          </TabsTrigger>
          <TabsTrigger value="route">
            <Map className="mr-2 h-4 w-4" />
            Route Map
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="venues" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Tour Venues</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      Add Venue
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle>Add Venue to Tour</DialogTitle>
                      <DialogDescription>
                        Select a venue and configure its position in the tour.
                      </DialogDescription>
                    </DialogHeader>
                    <TourVenueForm 
                      tourId={Number(tourId)} 
                      onSuccess={() => {
                        refetch();
                      }} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Manage venues included in this tour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tour.venues && tour.venues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Travel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tour.venues
                      .sort((a, b) => (a.tourVenue.sequence || 999) - (b.tourVenue.sequence || 999))
                      .map(venueData => (
                        <TableRow key={venueData.tourVenue.id}>
                          <TableCell>
                            {venueData.tourVenue.sequence !== null 
                              ? venueData.tourVenue.sequence
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {venueData.venue?.name || 'Unknown Venue'}
                          </TableCell>
                          <TableCell>
                            {venueData.tourVenue.date 
                              ? formatDate(venueData.tourVenue.date)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {venueData.venue ? (
                              <>
                                {venueData.venue.city}
                                {venueData.venue.region ? `, ${venueData.venue.region}` : ''}
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <VenueStatusBadge status={venueData.tourVenue.status || 'pending'} />
                          </TableCell>
                          <TableCell>
                            {venueData.tourVenue.travelDistanceFromPrevious ? (
                              <span className="text-sm">
                                {Math.round(venueData.tourVenue.travelDistanceFromPrevious)} km
                                {venueData.tourVenue.travelTimeFromPrevious && (
                                  <span className="text-muted-foreground ml-2">
                                    (~{Math.round(venueData.tourVenue.travelTimeFromPrevious / 60)} hrs)
                                  </span>
                                )}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <PenLine className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Venue Details</DialogTitle>
                                  <DialogDescription>
                                    Update status, date, and other details for this venue.
                                  </DialogDescription>
                                </DialogHeader>
                                <UpdateVenueForm 
                                  tourId={Number(tourId)} 
                                  venueData={venueData} 
                                  onSuccess={() => refetch()} 
                                />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No venues added to this tour yet</div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Add Your First Venue</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                      <DialogHeader>
                        <DialogTitle>Add Venue to Tour</DialogTitle>
                        <DialogDescription>
                          Select a venue and configure its position in the tour.
                        </DialogDescription>
                      </DialogHeader>
                      <TourVenueForm 
                        tourId={Number(tourId)} 
                        onSuccess={() => {
                          refetch();
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="route" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tour Route Map</CardTitle>
              <CardDescription>
                Visualize your tour route and venue locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapEvents.length > 0 ? (
                <div className="bg-muted rounded-md h-[400px] overflow-hidden">
                  <VenueMap 
                    events={mapEvents}
                    height={400}
                    showLegend={true}
                    showRoute={true}
                  />
                </div>
              ) : (
                <div className="bg-muted h-[400px] rounded-md flex justify-center items-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">
                      No map data available.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try optimizing the tour to see venue locations on a map.
                    </p>
                    {!hasEnoughVenuesWithDates ? (
                      <p className="text-sm text-amber-500 mt-2">
                        You need at least 2 venues with dates to optimize.
                      </p>
                    ) : (
                      <Button 
                        className="mt-4"
                        onClick={handleOptimize}
                        disabled={optimizeMutation.isPending}
                      >
                        {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Truck className="mr-2 h-4 w-4" />
                        Optimize Tour Route
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tour Statistics</CardTitle>
              <CardDescription>
                Key metrics and optimization data for your tour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Distance</h3>
                  <p className="font-medium text-xl">
                    {tour.estimatedTravelDistance ? (
                      `${Math.round(tour.estimatedTravelDistance)} km`
                    ) : (
                      'Not calculated'
                    )}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2 text-muted-foreground">Total Travel Time</h3>
                  <p className="font-medium text-xl">
                    {tour.estimatedTravelTime ? (
                      `${Math.round(tour.estimatedTravelTime / 60)} hours`
                    ) : (
                      'Not calculated'
                    )}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2 text-muted-foreground">Optimization Score</h3>
                  <p className="font-medium text-xl">
                    {tour.optimizationScore ? (
                      `${tour.optimizationScore.toFixed(2)} / 100`
                    ) : (
                      'Not optimized'
                    )}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2 text-muted-foreground">Booking Rate</h3>
                  <p className="font-medium text-xl">
                    {tour.venues && tour.venues.length > 0 ? (
                      `${Math.round((tour.venues.filter(v => v.tourVenue.status === 'confirmed').length / tour.venues.length) * 100)}%`
                    ) : (
                      '0%'
                    )}
                  </p>
                </div>
              </div>
              
              {!hasEnoughVenuesWithDates && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md mt-6">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



function getTourStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'planning':
      return 'outline';
    case 'booked':
      return 'secondary';
    case 'in-progress':
      return 'default';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}