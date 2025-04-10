import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTour, optimizeTourRoute, updateTour } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  ArrowRight, Check, Ban, Clock 
} from 'lucide-react';

type TourDetailProps = {
  tourId: number | string;
};

export function TourDetail({ tourId }: TourDetailProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
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
  
  // Tour optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(Number(tourId)),
    onSuccess: (data) => {
      toast({
        title: 'Tour Optimized',
        description: `Tour route optimized with score: ${data.optimizationScore.toFixed(2)}`,
      });
      refetch();
      setShowOptimizeDialog(false);
    },
    onError: () => {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route. Please ensure you have at least 2 confirmed venues with dates.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setOptimizing(false);
    },
  });
  
  const handleOptimize = () => {
    setOptimizing(true);
    optimizeMutation.mutate();
  };
  
  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate(status);
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
                onClick={() => setShowOptimizeDialog(true)}
              >
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
              <div className="bg-muted h-[400px] rounded-md flex justify-center items-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    Tour route map will be displayed here.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Map view is coming in the next update.
                  </p>
                </div>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Optimize Tour Dialog */}
      <Dialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimize Tour Route</DialogTitle>
            <DialogDescription>
              Optimize the tour route based on venue locations and your preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">
              The optimization will:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-2 text-green-500 shrink-0" />
                <span>Calculate the most efficient route between confirmed venues</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-2 text-green-500 shrink-0" />
                <span>Suggest potential venues to fill gaps in the tour</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 mr-2 text-green-500 shrink-0" />
                <span>Estimate travel times and distances</span>
              </li>
              <li className="flex items-start">
                <Clock className="h-5 w-5 mr-2 text-amber-500 shrink-0" />
                <span>You need at least 2 confirmed venues with dates</span>
              </li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOptimizeDialog(false)}
              disabled={optimizing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Optimize Tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Venue form is referenced but will be created separately

function VenueStatusBadge({ status }: { status: string }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  
  switch (status) {
    case 'confirmed':
      variant = 'default';
      break;
    case 'tentative':
      variant = 'secondary';
      break;
    case 'cancelled':
      variant = 'destructive';
      break;
    default:
      variant = 'outline';
  }
  
  return <Badge variant={variant}>{status}</Badge>;
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