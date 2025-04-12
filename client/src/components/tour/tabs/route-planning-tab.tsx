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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, EyeOff, List, Map, MapPin, RotateCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
  onVenueClick
}: RoutePlanningTabProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'map'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  const hasOptimizedSequence = optimizedSequenceVenues.length > 0;
  
  // Filter venues based on search query
  const filteredVenues = venues.filter(venue => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      venue.name.toLowerCase().includes(query) ||
      venue.city.toLowerCase().includes(query) ||
      (venue.region && venue.region.toLowerCase().includes(query))
    );
  });

  // Toggle between showing all venues or only confirmed ones
  const handleToggleAllVenues = () => {
    setShowAllVenues(!showAllVenues);
  };

  // Function to render the timeline view
  const renderTimelineView = () => {
    const displayVenues = hasOptimizedSequence ? optimizedSequenceVenues : originalSequenceVenues;
    const filteredDisplayVenues = displayVenues.filter(venue => {
      // When not showing all venues, only show confirmed ones
      if (!showAllVenues && venue.status !== 'confirmed') return false;
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          venue.name.toLowerCase().includes(query) ||
          venue.city.toLowerCase().includes(query) ||
          (venue.region && venue.region.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
    
    return (
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[23px] top-8 bottom-4 w-0.5 bg-border"></div>
        
        {/* Venues with timeline */}
        <div className="space-y-6 relative">
          {filteredDisplayVenues.length > 0 ? (
            filteredDisplayVenues.map((venue, index) => (
              <div 
                key={venue.id} 
                className="flex items-start gap-4 relative"
                onClick={() => onVenueClick(venue)}
              >
                {/* Timeline marker */}
                <div className={`
                  w-[12px] h-[12px] rounded-full mt-1.5 z-10
                  ${venue.status === 'confirmed' ? 'bg-green-500' : ''}
                  ${venue.status === 'potential' ? 'bg-blue-500' : ''}
                  ${venue.status === 'hold' ? 'bg-amber-500' : ''}
                  ${venue.status === 'cancelled' ? 'bg-red-500' : ''}
                  ${!venue.status ? 'bg-muted-foreground' : ''}
                `}></div>
                
                {/* Venue card */}
                <div className="flex-1">
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-medium">{venue.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {venue.city}{venue.region ? `, ${venue.region}` : ''}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {venue.date && (
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                              {formatDate(venue.date)}
                            </div>
                          )}
                          
                          <Badge className={`
                            ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                            ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                            ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}
                            ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                            ${!venue.status ? 'bg-muted text-muted-foreground' : ''}
                          `}>
                            {venue.status || 'unscheduled'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No venues match your search' : 'No venues to display'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to render the list view
  const renderListView = () => {
    const displayVenues = hasOptimizedSequence ? optimizedSequenceVenues : originalSequenceVenues;
    const filteredDisplayVenues = displayVenues.filter(venue => {
      if (!showAllVenues && venue.status !== 'confirmed') return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          venue.name.toLowerCase().includes(query) ||
          venue.city.toLowerCase().includes(query) ||
          (venue.region && venue.region.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
    
    return (
      <div className="space-y-2">
        {filteredDisplayVenues.length > 0 ? (
          filteredDisplayVenues.map((venue, index) => (
            <div 
              key={venue.id}
              onClick={() => onVenueClick(venue)}
              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="bg-primary/10 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium">{venue.name}</div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {venue.city}{venue.region ? `, ${venue.region}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {venue.date && (
                  <div className="hidden md:flex items-center text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {formatDate(venue.date)}
                  </div>
                )}
                
                <Badge className={`
                  ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                  ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                  ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}
                  ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                  ${!venue.status ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {venue.status || 'unscheduled'}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No venues match your search' : 'No venues to display'}
          </div>
        )}
      </div>
    );
  };

  // Function to render the map view (placeholder)
  const renderMapView = () => {
    return (
      <div className="relative min-h-[400px] bg-muted rounded-lg flex items-center justify-center">
        {isLoadingMap ? (
          <div className="text-center">
            <RotateCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        ) : (
          <div className="text-center p-4">
            <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">Map View</h3>
            <p className="text-sm max-w-md text-muted-foreground">
              Map view will display your tour venues on an interactive map.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Route Planning</CardTitle>
              <CardDescription>
                Plan and visualize your tour route
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAllVenues}
              >
                {showAllVenues ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Unconfirmed
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4 mr-2" />
                    Show All Venues
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-auto sm:flex-1">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search venues..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Tabs 
                value={viewMode} 
                onValueChange={(value) => setViewMode(value as any)}
                className="sm:w-auto"
              >
                <TabsList>
                  <TabsTrigger value="timeline">
                    <Clock className="h-4 w-4 mr-2" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4 mr-2" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <Separator />
            
            <div>
              {viewMode === 'timeline' && renderTimelineView()}
              {viewMode === 'list' && renderListView()}
              {viewMode === 'map' && renderMapView()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}