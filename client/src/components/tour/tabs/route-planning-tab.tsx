import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Map,
  MapPin,
  Calendar,
  List,
  LayoutGrid,
  Route,
  AlertTriangle,
  ArrowRight,
  InfoIcon,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';

interface RoutePlanningTabProps {
  venues: any[];
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  showAllVenues: boolean;
  setShowAllVenues: React.Dispatch<React.SetStateAction<boolean>>;
  onVenueClick: (venue: any) => void;
}

export function RoutePlanningTab({
  venues,
  originalSequenceVenues,
  optimizedSequenceVenues,
  showAllVenues,
  setShowAllVenues,
  onVenueClick,
}: RoutePlanningTabProps) {
  // Combined view of map and timeline

  // Get the confirmed and potential venues
  const confirmedVenues = venues?.filter(v => v.tourVenue?.status === 'confirmed') || [];
  const potentialVenues = venues?.filter(v => v.tourVenue?.status === 'potential' || v.tourVenue?.status === 'hold') || [];
  
  // Render status badge
  const renderStatusBadge = (status: string | undefined) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Confirmed
          </Badge>
        );
      case 'hold':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
            <Clock4 className="h-3.5 w-3.5 mr-1" />
            Hold
          </Badge>
        );
      case 'potential':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Potential
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Timeline display component
  const TimelineView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div className="space-y-4">
        {sequence.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-muted">
            {sequence.map((venue, index) => (
              <div key={venue.id} className="mb-8 relative">
                {/* Timeline marker */}
                <div className={`absolute -left-[19px] p-1.5 rounded-full ${venue.tourVenue?.status === 'confirmed' ? 'bg-green-500' : venue.tourVenue?.status === 'hold' ? 'bg-amber-500' : venue.tourVenue?.status === 'potential' ? 'bg-blue-500' : 'bg-muted'}`}></div>
                
                {/* Date indicator */}
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {venue.tourVenue?.date ? formatDate(venue.tourVenue.date) : 'Date TBD'}
                </div>
                
                {/* Venue card */}
                <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => onVenueClick(venue)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-base">{venue.venue?.name}</h3>
                        <p className="text-sm text-muted-foreground">{venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}</p>
                      </div>
                      <div>
                        {renderStatusBadge(venue.tourVenue?.status)}
                      </div>
                    </div>
                    
                    {index < sequence.length - 1 && sequence[index + 1].tourVenue?.date && venue.tourVenue?.date && (
                      <div className="mt-3 pt-3 border-t text-sm flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{Math.ceil((new Date(sequence[index + 1].tourVenue.date).getTime() - new Date(venue.tourVenue.date).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                        </div>
                        
                        {venue.venue?.longitude && venue.venue?.latitude && sequence[index + 1].venue?.longitude && sequence[index + 1].venue?.latitude && (
                          <div className="flex items-center">
                            <Route className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDistance(calculateDistance(
                              venue.venue.latitude, 
                              venue.venue.longitude, 
                              sequence[index + 1].venue.latitude, 
                              sequence[index + 1].venue.longitude
                            ))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    );
  };
  
  // List display component
  const ListView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div className="space-y-4">
        {sequence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sequence.map((venue, index) => (
              <Card key={venue.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => onVenueClick(venue)}>
                <CardHeader className="py-3 px-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium flex items-center">
                      <span className="bg-muted w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs">{index + 1}</span>
                      {venue.venue?.name}
                    </div>
                    {renderStatusBadge(venue.tourVenue?.status)}
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{venue.tourVenue?.date ? formatDate(venue.tourVenue.date) : 'Date TBD'}</span>
                    </div>
                    
                    {index < sequence.length - 1 && venue.venue?.longitude && venue.venue?.latitude && sequence[index + 1].venue?.longitude && sequence[index + 1].venue?.latitude && (
                      <div className="flex items-center col-span-2 mt-1 pt-1 border-t">
                        <ArrowRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistance(calculateDistance(
                            venue.venue.latitude, 
                            venue.venue.longitude, 
                            sequence[index + 1].venue.latitude, 
                            sequence[index + 1].venue.longitude
                          ))} to next venue
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    );
  };
  
  // Map view component (placeholder for actual map implementation)
  const MapView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Interactive map would display here</p>
            <p className="text-xs text-muted-foreground mt-1">Showing {sequence.length} venues</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {sequence.map((venue, index) => (
            <Button 
              key={venue.id} 
              variant="outline" 
              className="justify-start" 
              onClick={() => onVenueClick(venue)}
            >
              <span className="bg-muted w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs font-normal">{index + 1}</span>
              <span className="truncate">{venue.venue?.name}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Simple distance calculation function
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };
  
  return (
    <div className="space-y-6">
      {/* Route Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Route Planning</CardTitle>
              <CardDescription>
                Plan and visualize your tour route
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Total Venues</h3>
                <p className="text-muted-foreground text-sm">{venues?.length || 0} venues ({venues?.filter(v => v.tourVenue?.status === 'confirmed')?.length || 0} confirmed)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Route className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Route Coverage</h3>
                <p className="text-muted-foreground text-sm">
                  {venues?.filter(v => v.venue?.longitude && v.venue?.latitude)?.length || 0} venues with coordinates
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-all-venues"
                  checked={showAllVenues}
                  onCheckedChange={setShowAllVenues}
                />
                <label htmlFor="show-all-venues" className="text-sm cursor-pointer">
                  Show all venues (including cancelled)
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      

      
      {/* Comparison Tab */}
      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Route</TabsTrigger>
          <TabsTrigger value="optimized">Optimized Route</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="mt-6">
          {venues && venues.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Map on the left/top */}
              <div className="lg:col-span-8 border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Interactive map would display here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing {(showAllVenues ? venues : venues.filter(v => v.tourVenue?.status !== 'cancelled')).length} venues
                  </p>
                </div>
              </div>
              
              {/* Timeline on the right/bottom */}
              <div className="lg:col-span-4 overflow-auto max-h-[600px]">
                <h3 className="text-sm font-medium mb-3">Tour Timeline</h3>
                <TimelineView sequence={showAllVenues ? venues : venues.filter(v => v.tourVenue?.status !== 'cancelled')} />
              </div>
            </div>
          ) : (
            <Alert variant="default" className="bg-muted/50">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>No ordered venues</AlertTitle>
              <AlertDescription>
                There are no ordered venues in the current route.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="optimized" className="mt-6">
          {optimizedSequenceVenues?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Map on the left/top */}
              <div className="lg:col-span-8 border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Interactive map would display here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing {(showAllVenues ? optimizedSequenceVenues : optimizedSequenceVenues.filter(v => v.tourVenue?.status !== 'cancelled')).length} venues
                  </p>
                </div>
              </div>
              
              {/* Timeline on the right/bottom */}
              <div className="lg:col-span-4 overflow-auto max-h-[600px]">
                <h3 className="text-sm font-medium mb-3">Optimized Timeline</h3>
                <TimelineView sequence={showAllVenues ? optimizedSequenceVenues : optimizedSequenceVenues.filter(v => v.tourVenue?.status !== 'cancelled')} />
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No optimized route</AlertTitle>
              <AlertDescription>
                The tour hasn't been optimized yet. Go to the Optimization tab to optimize your tour route.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}