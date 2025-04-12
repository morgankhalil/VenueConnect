import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Calendar, List, MapPin, Route, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoutePlanningTabProps {
  venues: any[];
  tourId: number;
  onVenueClick: (venue: any) => void;
}

export function RoutePlanningTab({ venues, tourId, onVenueClick }: RoutePlanningTabProps) {
  const [selectedViewMode, setSelectedViewMode] = useState<'route' | 'list' | 'calendar'>('route');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Route Planning</h2>
          <p className="text-muted-foreground">View and plan your tour route</p>
        </div>
        
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Button 
                variant={selectedViewMode === 'route' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedViewMode('route')}
                className="mr-2"
              >
                <Route className="h-4 w-4 mr-1" />
                Route View
              </Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button 
                variant={selectedViewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedViewMode('list')}
                className="mr-2"
              >
                <List className="h-4 w-4 mr-1" />
                List View
              </Button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button 
                variant={selectedViewMode === 'calendar' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedViewMode('calendar')}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Calendar View
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <Separator />

      {selectedViewMode === 'route' && (
        <TourRouteView venues={venues} onVenueClick={onVenueClick} />
      )}
      
      {selectedViewMode === 'list' && (
        <TourListView venues={venues} onVenueClick={onVenueClick} />
      )}
      
      {selectedViewMode === 'calendar' && (
        <TourCalendarView venues={venues} onVenueClick={onVenueClick} />
      )}
    </div>
  );
}

interface TourRouteViewProps {
  venues: any[];
  onVenueClick: (venue: any) => void;
}

function TourRouteView({ venues, onVenueClick }: TourRouteViewProps) {
  return (
    <div className="space-y-4">
      {/* This is a placeholder for the map component */}
      <div className="bg-primary/5 border rounded-lg aspect-video flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-10 w-10 text-primary/40 mx-auto mb-2" />
          <p className="text-muted-foreground">Interactive map will be displayed here</p>
          <p className="text-xs text-muted-foreground">Showing {venues.length} venues</p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tour Timeline</CardTitle>
          <CardDescription>View your tour sequence and timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {venues.map((venue, index) => (
                <div 
                  key={venue.id}
                  className="flex items-start space-x-3 cursor-pointer hover:bg-primary/5 p-2 rounded-md transition-colors"
                  onClick={() => onVenueClick(venue)}
                >
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    {index < venues.length - 1 && (
                      <div className="w-0.5 h-12 bg-primary/30 my-1"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{venue.name}</h4>
                      <Badge variant={
                        venue.status === 'confirmed' ? 'default' :
                        venue.status === 'potential' ? 'secondary' :
                        venue.status === 'hold' ? 'outline' :
                        'outline'
                      }>
                        {venue.status || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>
                        {venue.city}{venue.region ? `, ${venue.region}` : ''}
                      </span>
                    </div>
                    
                    {venue.performanceDate && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(venue.performanceDate)}</span>
                      </div>
                    )}
                    
                    {index > 0 && venues[index-1] && venues[index-1].latitude && venues[index-1].longitude && venue.latitude && venue.longitude && (
                      <div className="flex items-center text-xs text-muted-foreground mt-2 border-t pt-2">
                        <Route className="h-3 w-3 mr-1" />
                        <span>{formatDistance(calculateDistance(
                          venues[index-1].latitude, 
                          venues[index-1].longitude, 
                          venue.latitude, 
                          venue.longitude
                        ))} from previous venue</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface TourListViewProps {
  venues: any[];
  onVenueClick: (venue: any) => void;
}

function TourListView({ venues, onVenueClick }: TourListViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tour Venues List</CardTitle>
        <CardDescription>All venues in your tour</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {venues.map((venue) => (
              <div 
                key={venue.id}
                className="flex justify-between items-start border-b pb-4 cursor-pointer hover:bg-primary/5 p-2 rounded-md transition-colors"
                onClick={() => onVenueClick(venue)}
              >
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium">{venue.name}</h3>
                    <Badge variant={
                      venue.status === 'confirmed' ? 'default' :
                      venue.status === 'potential' ? 'secondary' :
                      venue.status === 'hold' ? 'outline' :
                      'outline'
                    } className="ml-2">
                      {venue.status || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>
                      {venue.city}{venue.region ? `, ${venue.region}` : ''}
                    </span>
                  </div>
                  
                  {venue.performanceDate && (
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(venue.performanceDate)}</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-sm">
                    <span className="font-medium">Capacity:</span> {venue.capacity || 'Unknown'}
                  </div>
                  {venue.venueType && (
                    <div className="text-sm text-muted-foreground">
                      {venue.venueType}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TourCalendarViewProps {
  venues: any[];
  onVenueClick: (venue: any) => void;
}

function TourCalendarView({ venues, onVenueClick }: TourCalendarViewProps) {
  // Group venues by month
  const venuesByMonth: Record<string, any[]> = {};
  
  venues.forEach(venue => {
    if (!venue.performanceDate) return;
    
    const date = new Date(venue.performanceDate);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!venuesByMonth[monthKey]) {
      venuesByMonth[monthKey] = {
        name: monthName,
        venues: []
      };
    }
    
    venuesByMonth[monthKey].venues.push(venue);
  });
  
  return (
    <div className="space-y-6">
      {Object.keys(venuesByMonth).length > 0 ? (
        Object.keys(venuesByMonth).sort().map(monthKey => (
          <Card key={monthKey}>
            <CardHeader>
              <CardTitle>{venuesByMonth[monthKey].name}</CardTitle>
              <CardDescription>{venuesByMonth[monthKey].venues.length} venues scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {venuesByMonth[monthKey].venues
                  .sort((a: any, b: any) => new Date(a.performanceDate).getTime() - new Date(b.performanceDate).getTime())
                  .map((venue: any) => (
                    <div 
                      key={venue.id}
                      className="flex justify-between items-start pb-4 cursor-pointer hover:bg-primary/5 p-2 rounded-md transition-colors"
                      onClick={() => onVenueClick(venue)}
                    >
                      <div className="flex">
                        <div className="w-12 h-12 bg-primary/10 rounded-md flex flex-col items-center justify-center mr-4">
                          <span className="text-lg font-bold">{new Date(venue.performanceDate).getDate()}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(venue.performanceDate).toLocaleString('default', { weekday: 'short' })}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-medium">{venue.name}</h3>
                            <Badge variant={
                              venue.status === 'confirmed' ? 'default' :
                              venue.status === 'potential' ? 'secondary' :
                              venue.status === 'hold' ? 'outline' :
                              'outline'
                            } className="ml-2">
                              {venue.status || 'Unknown'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>
                              {venue.city}{venue.region ? `, ${venue.region}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="font-medium">Time:</span> {venue.performanceTime || 'TBD'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Capacity:</span> {venue.capacity || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No Performance Dates</h3>
          <p className="text-muted-foreground">
            None of your venues have performance dates scheduled.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate distance between coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}