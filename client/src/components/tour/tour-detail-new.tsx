import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTour, optimizeTourRoute, updateTour, applyTourOptimization } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { VenueStatusBadge } from './venue-status-badge';
import { StatCard } from './stat-card';
import { VenueList } from './venue-list';
import { UnifiedTourOptimizer } from './unified-tour-optimizer';
import { 
  getStatusInfo, 
  getStatusBadgeVariant,
} from '@/lib/tour-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TourVenueForm } from './tour-venue-form';
import { formatDate, formatCurrency, formatDistance, formatTravelTime, calculateImprovement } from '@/lib/utils';
import { 
  CalendarDays, Info, Map, MapPin, Loader2, PenLine,
  ArrowRight, Calendar, Building, Sparkles
} from 'lucide-react';
import { MapEvent } from '@/types';
import { VenueMap } from '@/components/maps/venue-map';
import { TourComparisonView } from './tour-comparison-view';
import { TourTimeline } from './tour-timeline';

type TourDetailProps = {
  tourId: number | string;
};

export function TourDetailNew({ tourId }: TourDetailProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [mapEvents, setMapEvents] = useState<MapEvent[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<MapEvent | null>(null);
  const [showAllVenues, setShowAllVenues] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Fetch tour details
  const { 
    data: tour, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/tours', tourId],
    queryFn: () => getTour(typeof tourId === 'string' ? parseInt(tourId) : tourId),
  });

  // Create map events from tour venues (even without optimization)
  useEffect(() => {
    if (tour?.venues) {
      console.log("Tour venues data:", tour.venues);
      
      const venues = tour.venues
        .filter(v => {
          // Log any venues without coordinates for debugging
          if (!v.venue || v.venue.latitude === null || v.venue.longitude === null) {
            console.warn("Venue without coordinates:", v);
            return false;
          }
          return true;
        })
        .map((v, index) => ({
          id: v.tourVenue.id, // Use tourVenue id for uniqueness
          venue: v.venue.name || `Venue ${v.venue.id}`,
          latitude: v.venue.latitude,
          longitude: v.venue.longitude,
          date: v.tourVenue.date || undefined,
          isCurrentVenue: false,
          isRoutingOpportunity: false,
          status: v.tourVenue.status || 'confirmed',
          venue_id: v.venue.id,
          sequence: v.tourVenue.sequence !== null ? v.tourVenue.sequence : index
        }));

      console.log("Mapped venues for map:", venues);
      
      if (venues.length > 0) {
        console.log(`Setting ${venues.length} venues to map`);
        setMapEvents(venues);
      } else {
        console.warn("No venues with valid coordinates found");
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
                status: item.status || 'potential',
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
        description: 'Failed to optimize tour route. Please ensure you have at least 2 venues with dates.',
        variant: 'destructive',
      });
    },
  });

  //Mutation to apply the optimized tour
  const applyMutation = useMutation({
    mutationFn: () => applyTourOptimization(Number(tourId), optimizationResult),
    onSuccess: () => {
      toast({
        title: 'Tour Updated',
        description: 'Tour has been updated with optimized route.',
      });
      refetch();
    },
    onError: (err) => {
      console.error("Error applying optimized tour:", err);
      toast({
        title: 'Error Applying Changes',
        description: 'Failed to apply optimized tour. Please try again later.',
        variant: 'destructive',
      });
    }
  });

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  // Check if the tour has enough venues for optimization
  // For optimization, we can work with any venues regardless of dates or status
  const hasEnoughVenuesForOptimization = (tour?.venues?.length || 0) >= 2;

  // Create a version of venues with their original sequence from the database
  const originalSequenceVenues = useMemo(() => {
    // Make a deep copy to avoid modifying the original data
    return [...mapEvents].map(venue => ({...venue}))
      // Sort by the original sequence from database
      .sort((a, b) => {
        // If sequence is explicitly set, use it
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        // Otherwise fall back to sorting by date if available
        if (a.date && b.date) {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        return 0;
      });
  }, [mapEvents]);

  // Filtered venues based on toggle
  const filteredVenues = useMemo(() => {
    // Start with the original sequence venues
    const venues = [...originalSequenceVenues];
    
    if (!showAllVenues) {
      // Only show venues that aren't potential/suggestions
      return venues.filter(event => 
        event.status !== 'potential' && !event.isRoutingOpportunity
      );
    }
    return venues;
  }, [originalSequenceVenues, showAllVenues]);

  const handleVenueClick = (venue: MapEvent) => {
    setSelectedVenue(venue);

    // If you want to highlight the venue on the map, you could do that here
    // For now, just show a toast with the venue info
    toast({
      title: venue.venue,
      description: `Status: ${getStatusInfo(venue.status || 'confirmed').displayName}${venue.date ? ` • Date: ${formatDate(venue.date)}` : ''}`,
    });
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

  // Calculate improvements if optimization data is available
  const distanceImprovement = optimizationResult && tour.estimatedTravelDistance ? 
    calculateImprovement(tour.estimatedTravelDistance, optimizationResult.totalDistance) : 
    undefined;

  const timeImprovement = optimizationResult && tour.estimatedTravelTime ? 
    calculateImprovement(tour.estimatedTravelTime, optimizationResult.totalTravelTime) : 
    undefined;

  const scoreImprovement = optimizationResult && tour.optimizationScore ? 
    Math.round(optimizationResult.optimizationScore - tour.optimizationScore) : 
    undefined;

  return (
    <div className="space-y-6">
      {/* Tour Details Card */}
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
              {hasEnoughVenuesForOptimization ? (
                <UnifiedTourOptimizer 
                  tourId={typeof tourId === 'string' ? parseInt(tourId) : tourId} 
                  onApplyChanges={() => {
                    // Refresh the data after applying optimization
                    refetch();
                  }} 
                />
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80"
                  disabled={true}
                  title="Need at least 2 venues for optimization"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Optimize Tour
                </Button>
              )}

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
          {/* Artist, Venues, Budget info */}
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

          {/* Description */}
          <div className="space-y-2 mb-6">
            <h3 className="font-medium">Description</h3>
            <p className="text-muted-foreground">
              {tour.description || 'No description provided.'}
            </p>
          </div>

          {/* Tour Status */}
          <div className="space-y-2 mb-6">
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

          {/* Statistics Section */}
          <div className="mt-6">
            <h3 className="font-medium mb-3">Tour Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Optimization Score" 
                value={`${Math.round(tour.optimizationScore || 0)}/100`}
                improvement={scoreImprovement}
              />
              <StatCard 
                title="Travel Distance" 
                value={formatDistance(tour.estimatedTravelDistance)}
                improvement={distanceImprovement}
              />
              <StatCard 
                title="Travel Time" 
                value={formatTravelTime(tour.estimatedTravelTime)}
                improvement={timeImprovement}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tour Comparison View (before/after optimization) */}
      {tour.optimizationScore && tour.estimatedTravelDistance && (
        <TourComparisonView
          tourId={Number(tourId)}
          originalVenues={
            // Create a logical but less efficient route ordered simply by longitude
            // This represents a basic west-to-east routing without considering travel distance
            [...mapEvents]
              .map(v => ({...v})) // create deep copy
              .sort((a, b) => {
                // Respect confirmed venues (they must be in original order)
                if (a.status === 'confirmed' && b.status === 'confirmed') {
                  // If both have explicit sequence, use it
                  if (a.sequence !== undefined && b.sequence !== undefined) {
                    return a.sequence - b.sequence;
                  }
                  // Otherwise use longitude (west to east)
                  return (a.longitude || 0) - (b.longitude || 0);
                }
                
                // Other venues are ordered by longitude (west to east)
                return (a.longitude || 0) - (b.longitude || 0);
              })
              // Update sequences to reflect this new order
              .map((venue, index) => ({...venue, sequence: index}))
          }
          optimizedVenues={
            // For optimized venues, use the actual sequence from the database
            originalSequenceVenues
          }
          originalDistance={tour.initialTotalDistance || tour.estimatedTravelDistance * 1.25}
          optimizedDistance={tour.estimatedTravelDistance}
          originalTravelTime={tour.initialTravelTime || tour.estimatedTravelTime * 1.25}
          optimizedTravelTime={tour.estimatedTravelTime}
          optimizationScore={tour.optimizationScore}
        />
      )}

      {/* Map and Venue List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section: 2/3 width on large screens */}
        <div className="lg:col-span-2">
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
                  {hasEnoughVenuesForOptimization ? (
                    <UnifiedTourOptimizer 
                      tourId={typeof tourId === 'string' ? parseInt(tourId) : tourId} 
                      onApplyChanges={() => {
                        // Refresh the data after applying optimization
                        refetch();
                      }} 
                    />
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary/80"
                      disabled={true}
                      title="Need at least 2 venues for optimization"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize Tour
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mapEvents.length > 0 ? (
                <div className="relative">
                  <div className="h-[500px] overflow-hidden">
                    <VenueMap 
                      events={filteredVenues}
                      height={500}
                      showLegend={true}
                      showRoute={true}
                      onMarkerClick={handleVenueClick}
                    />
                  </div>
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

          {/* Tour Timeline */}
          {mapEvents.length > 1 && (
            <div className="mt-6">
              <TourTimeline venues={filteredVenues} />
            </div>
          )}
        </div>

        {/* Venue List Section: 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex justify-between items-center pb-2">
              <div>
                <CardTitle>Tour Venues</CardTitle>
                <CardDescription>
                  Manage venues included in this tour
                </CardDescription>
              </div>
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
            </CardHeader>
            <div className="px-4 py-2 border-b flex items-center">
              <Switch 
                id="show-all-venues" 
                checked={showAllVenues} 
                onCheckedChange={setShowAllVenues} 
              />
              <Label htmlFor="show-all-venues" className="ml-2">
                Show suggested venues
              </Label>
            </div>
            <CardContent className="p-0 flex-grow overflow-hidden">
              <VenueList 
                venues={filteredVenues} 
                onVenueClick={handleVenueClick}
                maxHeight={450}
                selectedVenueId={selectedVenue?.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={showOptimizer} onOpenChange={setShowOptimizer}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Tour Optimization</DialogTitle>
                  </DialogHeader>

                  {!optimizationResult ? (
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Optimize your tour route to minimize travel time and maximize efficiency
                      </p>
                      <Button 
                        onClick={() => {
                          setOptimizing(true);
                          optimizeMutation.mutate();
                        }}
                        disabled={optimizing}
                        className="w-full"
                      >
                        {optimizing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Optimizing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Start Optimization
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 py-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Score</h4>
                          <p className="text-2xl font-bold">{optimizationResult.optimizationScore}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Distance</h4>
                          <p className="text-2xl font-bold">{Math.round(optimizationResult.totalDistance)} km</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Time</h4>
                          <p className="text-2xl font-bold">{Math.round(optimizationResult.totalTravelTime / 60)} hrs</p>
                        </div>
                      </div>

                      {optimizationResult.potentialFillVenues?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Recommended Venues</h4>
                          <div className="space-y-2">
                            {optimizationResult.potentialFillVenues.map((venue: any) => (
                              <div key={venue.venue.id} className="flex justify-between items-center bg-muted p-2 rounded">
                                <span>{venue.venue.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(venue.suggestedDate).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {
                          setShowOptimizer(false);
                          setOptimizationResult(null);
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          applyMutation.mutate();
                          setShowOptimizer(false);
                        }}>
                          Apply Changes
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
    </div>
  );
}

// Helper function to determine tour status badge variant
function getTourStatusVariant(status?: string) {
  if (!status) return 'outline';

  switch (status.toLowerCase()) {
    case 'planning':
      return 'outline';
    case 'booked':
    case 'confirmed':
      return 'default';
    case 'in-progress':
      return 'secondary';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}