import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Download, Map as MapIcon } from 'lucide-react';
import { VenueMap } from '@/components/maps/venue-map';
import { TourTimeline } from '@/components/tour/tour-timeline';
import { formatDistance, formatTravelTime } from '@/lib/utils';

interface RoutePlanningTabProps {
  tour: any;
  venues: any[];
  mapEvents: any[];
  onVenueClick: (venue: any) => void;
}

export function RoutePlanningTab({ tour, venues, mapEvents, onVenueClick }: RoutePlanningTabProps) {
  return (
    <div className="space-y-6">
      {/* Map Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center">
              <MapIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              Tour Route Map
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              View your tour route with {venues.length} venues
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Toggle View
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full">
            <VenueMap
              venues={venues}
              events={mapEvents}
              onMarkerClick={onVenueClick}
              showRoute={true}
              fullWidth={true}
              fullHeight={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tour Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TourTimeline 
            venues={venues} 
            onVenueClick={onVenueClick}
            maxVisible={10}
          />
        </CardContent>
      </Card>

      {/* Route Details */}
      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Distance</h4>
              <p className="text-2xl font-bold">{formatDistance(tour.estimatedTravelDistance || 0)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Travel Time</h4>
              <p className="text-2xl font-bold">{formatTravelTime(tour.estimatedTravelTime || 0)}</p>
            </div>
          </div>
          
          {tour.notes && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Route Overview</h4>
              <p className="text-sm text-muted-foreground">
                {tour.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}