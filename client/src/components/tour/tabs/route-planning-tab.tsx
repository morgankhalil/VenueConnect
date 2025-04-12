import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, ArrowLeftRight, Download } from 'lucide-react';
import { VenueMap } from '@/components/maps/venue-map';
import { TourTimeline } from '../tour-timeline';

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
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Map className="mr-2 h-5 w-5" />
                Tour Route Map
              </CardTitle>
              <CardDescription>
                {`View your tour route with ${venues.length || 0} venues`}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                title="View map in full detail"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Toggle View
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Export route data"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mapEvents.length > 0 ? (
            <div className="relative">
              <div className="h-[500px] overflow-hidden rounded-md">
                <VenueMap 
                  events={venues}
                  height={500}
                  showLegend={true}
                  showRoute={true}
                  onMarkerClick={onVenueClick}
                />
              </div>
            </div>
          ) : (
            <div className="p-32 text-center bg-muted">
              <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-muted-foreground mb-3">
                No venue locations available to display
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Timeline */}
      {mapEvents.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tour Timeline</CardTitle>
            <CardDescription>
              View your tour schedule in chronological order
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <TourTimeline venues={venues} />
          </CardContent>
        </Card>
      )}

      {/* Route Details (optional section) */}
      {mapEvents.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Route Details</CardTitle>
            <CardDescription>
              Detailed information about your tour route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Total Distance</h4>
                  <p className="text-2xl font-bold">
                    {tour.estimatedTravelDistance 
                      ? `${Math.round(tour.estimatedTravelDistance).toLocaleString()} km` 
                      : 'Not calculated'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Estimated Travel Time</h4>
                  <p className="text-2xl font-bold">
                    {tour.estimatedTravelTime 
                      ? `${Math.round(tour.estimatedTravelTime / 60)} hours` 
                      : 'Not calculated'}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Route Overview</h4>
                <div className="text-sm text-muted-foreground">
                  {venues.length > 0 ? (
                    <p>
                      This tour starts in <span className="font-medium">{venues[0]?.venue?.city || 'Unknown'}</span> and 
                      ends in <span className="font-medium">{venues[venues.length - 1]?.venue?.city || 'Unknown'}</span>, 
                      spanning across {Array.from(new Set(venues.map(v => v.venue?.region))).length} regions.
                    </p>
                  ) : (
                    <p>Add venues to see route overview</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RoutePlanningTab;