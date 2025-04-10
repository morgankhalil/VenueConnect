import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTour, optimizeTourRoute, updateTour } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { VenueStatusBadge } from './venue-status-badge';
import { StatCard } from './stat-card';
import { VenueList } from './venue-list';
import { 
  getStatusInfo, 
  getStatusBadgeVariant, 
  STATUS_DISPLAY_NAMES,
  isPriorityHold,
  TOUR_VENUE_STATUSES
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TourVenueForm } from './tour-venue-form';
import { formatDate, formatCurrency, formatDistance, formatTravelTime, calculateImprovement } from '@/lib/utils';
import { 
  CalendarDays, Info, Map, MapPin, Loader2, PenLine, Truck, BarChart3, 
  ArrowRight, Check, Ban, Clock, Route, Calendar, Building, ChevronRight,
  Wand2, Sparkles
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
        .map((v, index) => ({
          id: v.venue.id,
          venue: v.venue.name || `Venue ${v.venue.id}`,
          latitude: v.venue.latitude,
          longitude: v.venue.longitude,
          date: v.tourVenue.date || undefined,
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          status: v.tourVenue.status || 'confirmed',
          venue_id: v.venue.id,
          sequence: v.tourVenue.sequence || index
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
              const sequence = point.sequence !== undefined ? point.sequence : index;
              
              return {
                id: point.id,
                venue: matchingVenue?.name || `Venue ${point.id}`,
                latitude: point.latitude,
                longitude: point.longitude,
                date: point.date || undefined,
                isCurrentVenue: false,
                isRoutingOpportunity: false,
                status: point.status || 'confirmed',
                venue_id: point.id,
                sequence: sequence
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
            .map((item: any, index: number) => {
              // Calculate sequence based on suggestedSequence or fallback to after fixed venues
              const sequence = item.suggestedSequence !== undefined ? 
                item.suggestedSequence : 
                (fixedVenues.length + index);
                
              return {
                id: item.venue.id,
                venue: item.venue.name || `Venue ${item.venue.id}`,
                latitude: item.venue.latitude,
                longitude: item.venue.longitude,
                date: item.suggestedDate || undefined,
                isCurrentVenue: false,
                isRoutingOpportunity: true, // Mark suggested venues as routing opportunities for the map
                // Use the item's status if it exists, otherwise default to 'suggested'
                status: item.status || 'suggested',
                venue_id: item.venue.id,
                sequence: sequence
              };
            })
        : [];
      
      // Combine and set all map events
      const allEvents = [...fixedVenues, ...suggestedVenues];
      
      // Sort events by sequence to ensure markers are numbered correctly
      allEvents.sort((a, b) => {
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        return 0;
      });
      
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
  
  // Check if the tour has enough venues for optimization
  // For optimization, we can work with any venues regardless of dates or status
  const hasEnoughVenuesForOptimization = (tour?.venues?.length || 0) >= 2;
  
  // But we can still filter to see which ones have confirmed dates 
  // Using new simplified status system where only 'confirmed' is considered fixed
  const venuesWithDates = tour?.venues?.filter(v => 
    (v.tourVenue.status === 'confirmed') && 
    v.tourVenue.date
  ) || [];
  
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
              <Link href={`/tours/${tourId}/optimize`}>
                <Button 
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-primary to-primary/80"
                  disabled={!hasEnoughVenuesForOptimization}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Tour Optimizer
                </Button>
              </Link>
              
              <Link href={`/tours/${tourId}/edit`}>
                <Button size="sm" variant="outline">
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
      
      <Tabs defaultValue="map" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="map">
            <Map className="mr-2 h-4 w-4" />
            Interactive Map
          </TabsTrigger>
          <TabsTrigger value="venues">
            <MapPin className="mr-2 h-4 w-4" />
            Venue List
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Building className="mr-2 h-4 w-4" />
            Venue Suggestions
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>
        
        {/* Interactive Map Tab - The central view for all venue data */}
        <TabsContent value="map" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Map className="mr-2 h-5 w-5" />
                    Tour Route Map
                    {optimizationResult && (
                      <Badge variant="outline" className="ml-3 bg-primary/10">
                        Score: {optimizationResult.optimizationScore.toFixed(2)}/100
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {optimizationResult 
                      ? `Optimized route with ${optimizationResult.fixedPoints?.length || 0} confirmed and 
                         ${optimizationResult.potentialFillVenues?.filter((v: any) => !v.isFixed)?.length || 0} potential venues`
                      : `View your tour route with ${tour.venues?.length || 0} venues`}
                  </CardDescription>
                </div>
                
                <div className="flex space-x-2">
                  <Link href={`/tours/${tourId}/optimize`}>
                    <Button 
                      size="sm"
                      variant="default"
                      disabled={!hasEnoughVenuesForOptimization}
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Tour Optimizer
                    </Button>
                  </Link>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Building className="mr-2 h-4 w-4" />
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
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mapEvents.length > 0 ? (
                <div className="relative">
                  <div className="h-[500px] overflow-hidden">
                    <VenueMap 
                      events={mapEvents}
                      height={500}
                      showLegend={true}
                      showRoute={true}
                      onMarkerClick={(event) => {
                        // When a venue is clicked on the map, you could:
                        // 1. Highlight the venue in the list
                        // 2. Show a detail panel with venue info
                        // 3. Allow adding the venue if it's a suggestion
                        console.log('Clicked venue:', event);
                        
                        // For now, just show a toast with the venue info
                        toast({
                          title: event.venue,
                          description: `Status: ${getStatusInfo(event.status || 'confirmed').displayName}${event.date ? ` • Date: ${formatDate(event.date)}` : ''}`,
                        });
                      }}
                    />
                  </div>
                  
                  {/* Floating Stats Card */}
                  {optimizationResult && (
                    <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-md shadow-md border max-w-xs">
                      <h4 className="font-medium text-sm mb-2 flex items-center">
                        <Truck className="mr-2 h-4 w-4 text-primary" />
                        Route Optimization
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Distance</div>
                          <div className="font-medium">{Math.round(optimizationResult.totalDistance)} km</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Travel Time</div>
                          <div className="font-medium">{Math.round(optimizationResult.totalTravelTime / 60)} hours</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-32 text-center bg-muted">
                  <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                  <p className="text-muted-foreground mb-3">
                    No venue locations available to display
                  </p>
                  {!hasEnoughVenuesForOptimization ? (
                    <p className="text-sm text-amber-500 mb-4">
                      You need at least 2 venues to use the Tour Optimizer.
                    </p>
                  ) : null}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Building className="mr-2 h-4 w-4" />
                        Add Your First Venue
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Venue List Tab */}
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
                      <TableHead></TableHead>
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
        
        {/* Venue Suggestions Tab */}
        <TabsContent value="suggestions" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-5 w-5" />
                    Venue Suggestions
                  </CardTitle>
                  <CardDescription>
                    Potential venues that could fill gaps in your tour schedule
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/tours/${tourId}/optimize`}>
                    <Button 
                      size="sm"
                      variant="default"
                      disabled={!hasEnoughVenuesForOptimization}
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Tour Optimizer
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {optimizationResult && optimizationResult.potentialFillVenues ? (
                <div className="space-y-4">
                  {optimizationResult.potentialFillVenues
                    .filter((item: any) => 
                      item.venue && 
                      !optimizationResult.fixedPoints.some((p: any) => p.id === item.venue.id)
                    )
                    .length > 0 ? (
                    <div className="space-y-3">
                      {optimizationResult.potentialFillVenues
                        .filter((item: any) => 
                          item.venue && 
                          !optimizationResult.fixedPoints.some((p: any) => p.id === item.venue.id)
                        )
                        .map((item: any, index: number) => (
                          <div key={index} className="flex items-center p-4 bg-card border rounded-md hover:border-primary/50 transition-colors">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full mr-4"
                                style={{
                                  backgroundColor: item.detourRatio && item.detourRatio < 1.2 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : item.detourRatio && item.detourRatio < 1.5 
                                      ? 'rgba(245, 158, 11, 0.1)' 
                                      : 'rgba(239, 68, 68, 0.1)',
                                  color: item.detourRatio && item.detourRatio < 1.2 
                                    ? 'rgb(16, 185, 129)' 
                                    : item.detourRatio && item.detourRatio < 1.5 
                                      ? 'rgb(245, 158, 11)' 
                                      : 'rgb(239, 68, 68)'
                                }}>
                              <span className="font-medium">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-lg">{item.venue.name}</div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <div className="text-sm text-muted-foreground flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {item.venue.city || 'Location data unavailable'}
                                  {item.venue.region ? `, ${item.venue.region}` : ''}
                                </div>
                                {item.suggestedDate && (
                                  <Badge variant="outline" className="bg-background">
                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                    {formatDate(item.suggestedDate)}
                                  </Badge>
                                )}
                                {item.detourRatio && (
                                  <Badge variant="outline" 
                                    className="bg-background"
                                    style={{
                                      borderColor: item.detourRatio && item.detourRatio < 1.2 
                                        ? 'rgba(16, 185, 129, 0.5)' 
                                        : item.detourRatio && item.detourRatio < 1.5 
                                          ? 'rgba(245, 158, 11, 0.5)' 
                                          : 'rgba(239, 68, 68, 0.5)',
                                    }}
                                  >
                                    <Route className="h-3.5 w-3.5 mr-1" />
                                    {Math.round((item.detourRatio - 1) * 100)}% deviation
                                  </Badge>
                                )}
                                <Badge 
                                  style={{
                                    backgroundColor: item.status ? getStatusInfo(item.status).color : getStatusInfo('suggested').color,
                                    color: 'white'
                                  }}
                                >
                                  {item.status ? STATUS_DISPLAY_NAMES[item.status] : 'Suggested'}
                                </Badge>
                              </div>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  className="ml-2"
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
                                    <p className="text-sm font-medium">Route Fit Analysis</p>
                                    <div className="flex space-x-2">
                                      {item.detourRatio && (
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round((item.detourRatio - 1) * 100)}% route deviation
                                        </Badge>
                                      )}
                                      <Badge variant="outline" 
                                        className="text-xs"
                                        style={{
                                          backgroundColor: item.detourRatio && item.detourRatio < 1.2 
                                            ? 'rgba(16, 185, 129, 0.1)' 
                                            : item.detourRatio && item.detourRatio < 1.5 
                                              ? 'rgba(245, 158, 11, 0.1)' 
                                              : 'rgba(239, 68, 68, 0.1)',
                                          color: item.detourRatio && item.detourRatio < 1.2 
                                            ? 'rgb(16, 185, 129)' 
                                            : item.detourRatio && item.detourRatio < 1.5 
                                              ? 'rgb(245, 158, 11)' 
                                              : 'rgb(239, 68, 68)'
                                        }}
                                      >
                                        {item.detourRatio && item.detourRatio < 1.2 
                                          ? 'Excellent fit' 
                                          : item.detourRatio && item.detourRatio < 1.5 
                                            ? 'Good fit' 
                                            : 'Significant detour'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Choose Priority Status</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {/* First suggest appropriate priority based on detour ratio */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const statusField = document.getElementById(`status-${item.venue.id}`) as HTMLInputElement;
                                          if (statusField) {
                                            // Set suggested status based on detour ratio
                                            if (item.detourRatio && item.detourRatio < 1.1) {
                                              statusField.value = 'hold1'; // Excellent fit = highest priority
                                            } else if (item.detourRatio && item.detourRatio < 1.3) {
                                              statusField.value = 'hold2'; // Good fit = medium-high priority
                                            } else if (item.detourRatio && item.detourRatio < 1.5) {
                                              statusField.value = 'hold3'; // Moderate fit = medium priority
                                            } else {
                                              statusField.value = 'hold4'; // Poor fit = low priority
                                            }
                                          }
                                        }}
                                        style={{
                                          borderColor: item.detourRatio && item.detourRatio < 1.2 
                                            ? 'rgba(16, 185, 129, 0.3)' 
                                            : item.detourRatio && item.detourRatio < 1.5 
                                              ? 'rgba(245, 158, 11, 0.3)' 
                                              : 'rgba(239, 68, 68, 0.3)',
                                          color: item.detourRatio && item.detourRatio < 1.2 
                                            ? 'rgb(16, 185, 129)' 
                                            : item.detourRatio && item.detourRatio < 1.5 
                                              ? 'rgb(245, 158, 11)' 
                                              : 'rgb(239, 68, 68)'
                                        }}
                                      >
                                        Recommended Priority
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const statusField = document.getElementById(`status-${item.venue.id}`) as HTMLInputElement;
                                          if (statusField) {
                                            statusField.value = 'suggested';
                                          }
                                        }}
                                      >
                                        Just Suggest
                                      </Button>
                                    </div>
                                    <div className="pt-2">
                                      <Select
                                        defaultValue={item.status || 'suggested'}
                                        onValueChange={(value) => {
                                          const statusField = document.getElementById(`status-${item.venue.id}`) as HTMLInputElement;
                                          if (statusField) {
                                            statusField.value = value;
                                          }
                                        }}
                                      >
                                        <SelectTrigger id={`status-${item.venue.id}`}>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel>Venue Status</SelectLabel>
                                            {TOUR_VENUE_STATUSES.map(status => (
                                              <SelectItem key={status} value={status}>
                                                {STATUS_DISPLAY_NAMES[status]}
                                              </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
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
                                            // Get the current status from the select input
                                            status: (document.getElementById(`status-${item.venue.id}`) as HTMLInputElement)?.value || item.status || 'suggested',
                                            date: item.suggestedDate,
                                            notes: `Added from tour optimization suggestions. Route deviation: ${item.detourRatio ? Math.round((item.detourRatio - 1) * 100) + '%' : 'unknown'}`
                                          }),
                                        });
                                        
                                        if (!response.ok) {
                                          throw new Error('Failed to add venue to tour');
                                        }
                                        
                                        toast({
                                          title: "Success",
                                          description: `Added ${item.venue.name} to your tour.`,
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
                    <div className="p-8 text-center bg-muted rounded-md">
                      <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                      <p className="text-muted-foreground">
                        No venue suggestions available for this tour
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try optimizing the tour to see venue suggestions
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center bg-muted rounded-md">
                  <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                  <p className="text-muted-foreground mb-4">
                    Generate venue suggestions to find potential venues that fit your tour schedule
                  </p>
                  {!hasEnoughVenuesForOptimization ? (
                    <p className="text-sm text-amber-500 mb-4">
                      You need at least 2 venues with dates to generate suggestions.
                    </p>
                  ) : (
                    <Button 
                      onClick={handleOptimize}
                      disabled={optimizeMutation.isPending}
                    >
                      {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Building className="mr-2 h-4 w-4" />
                      Generate Venue Suggestions
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Statistics Tab */}
        <TabsContent value="stats" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Tour Analytics
              </CardTitle>
              <CardDescription>
                Key metrics and optimization insights for your tour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Tour Overview Stats */}
                <div>
                  <h3 className="font-medium text-sm mb-3 text-muted-foreground">Tour Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">Total Distance</h4>
                      <p className="font-medium text-xl">
                        {tour.estimatedTravelDistance ? (
                          `${Math.round(tour.estimatedTravelDistance)} km`
                        ) : 'Not calculated'}
                      </p>
                      {optimizationResult && optimizationResult.totalDistance && tour.estimatedTravelDistance && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {optimizationResult.totalDistance < tour.estimatedTravelDistance ? (
                            <span className="text-green-600 flex items-center">
                              <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                              {Math.round((1 - optimizationResult.totalDistance / tour.estimatedTravelDistance) * 100)}% reduction possible
                            </span>
                          ) : (
                            <span>Optimal route</span>
                          )}
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">Travel Time</h4>
                      <p className="font-medium text-xl">
                        {tour.estimatedTravelTime ? (
                          `${Math.round(tour.estimatedTravelTime / 60)} hours`
                        ) : 'Not calculated'}
                      </p>
                      {optimizationResult && optimizationResult.totalTravelTime && tour.estimatedTravelTime && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {optimizationResult.totalTravelTime < tour.estimatedTravelTime ? (
                            <span className="text-green-600 flex items-center">
                              <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                              {Math.round((1 - optimizationResult.totalTravelTime / tour.estimatedTravelTime) * 100)}% reduction possible
                            </span>
                          ) : (
                            <span>Optimal timing</span>
                          )}
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">Optimization Score</h4>
                      <p className="font-medium text-xl">
                        {tour.optimizationScore ? (
                          <span className="flex items-center">
                            {tour.optimizationScore}/100
                            <span 
                              className="ml-2 w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: tour.optimizationScore > 80 
                                  ? 'rgb(16, 185, 129)' 
                                  : tour.optimizationScore > 60 
                                    ? 'rgb(245, 158, 11)'
                                    : 'rgb(239, 68, 68)'
                              }}
                            />
                          </span>
                        ) : 'Not optimized'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tour.optimizationScore ? (
                          tour.optimizationScore > 80 
                            ? 'Excellent route efficiency' 
                            : tour.optimizationScore > 60 
                              ? 'Good route with minor gaps'
                              : 'Route has significant gaps'
                        ) : 'Run optimization to calculate score'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Status Breakdown */}
                {tour.venues && tour.venues.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-sm mb-3 text-muted-foreground">Status Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(
                        tour.venues.reduce((acc: {[key: string]: number}, venue) => {
                          const status = venue.tourVenue.status || 'unknown';
                          acc[status] = (acc[status] || 0) + 1;
                          return acc;
                        }, {})
                      ).sort((a, b) => {
                        // Explicitly type the entries as [string, number]
                        return (b[1] as number) - (a[1] as number);
                      })
                        .map(([status, count]) => (
                        <div key={status} className="bg-muted/30 p-3 rounded-md flex items-center">
                          <div 
                            className="w-10 h-10 rounded-full mr-3 flex items-center justify-center text-white"
                            style={{
                              backgroundColor: getStatusInfo(status).color
                            }}
                          >
                            <span className="font-bold">{count as React.ReactNode}</span>
                          </div>
                          <div>
                            <p className="font-medium">{STATUS_DISPLAY_NAMES[status] || status}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(((count as number) / tour.venues.length) * 100)}% of venues
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                {/* Action buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOptimize}
                    disabled={!hasEnoughVenuesForOptimization || optimizeMutation.isPending}
                  >
                    {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Truck className="mr-2 h-4 w-4" />
                    Run Optimization
                  </Button>
                </div>
              </div>
              
              {!hasEnoughVenuesForOptimization && (
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