import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapEvent } from '@/types';
import { MapPin, CalendarDays, ArrowDown, LocateFixed } from 'lucide-react';
import { getStatusInfo } from '@/lib/tour-status';
import { calculateDistanceBetweenCoords, formatDistance, formatTravelTime } from '@/lib/utils';

interface TourTimelineProps {
  venues: MapEvent[];
}

export function TourTimeline({ venues }: TourTimelineProps) {
  // Sort venues by sequence
  const sortedVenues = [...venues].sort((a, b) => {
    // If both have sequence, sort by sequence
    if (a.sequence !== undefined && b.sequence !== undefined) {
      return a.sequence - b.sequence;
    }
    // Otherwise, if both have dates, sort by date
    else if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return 0;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="mr-2 h-5 w-5" />
          Tour Schedule Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute top-0 bottom-0 left-[20px] w-[2px] bg-primary/30 z-0"></div>

          {/* Timeline items */}
          <div className="space-y-5 mb-5">
            {(sortedVenues || []).map((venue, index) => {
              // Calculate distance from previous venue if any
              let distanceFromPrevious = 0;
              let travelTimeMinutes = 0;

              if (index > 0) {
                const prevVenue = sortedVenues[index - 1];
                distanceFromPrevious = calculateDistanceBetweenCoords(
                  prevVenue.latitude, prevVenue.longitude,
                  venue.latitude, venue.longitude
                );

                // Estimate travel time (rough calculation)
                travelTimeMinutes = Math.round(distanceFromPrevious / 80 * 60); // Assuming 80 km/h avg speed
              }

              // Format date if available
              const formattedDate = venue.date 
                ? new Date(venue.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Date not set';

              // Get status info  
              const statusInfo = getStatusInfo(venue.status || 'confirmed');

              return (
                <div className="relative pl-10" key={venue.id}>
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-[10px] transform -translate-x-1/2 rounded-full z-10 flex items-center justify-center"
                    style={{
                      top: '10px',
                      width: '22px',
                      height: '22px',
                      backgroundColor: statusInfo.color,
                      color: 'white',
                      border: '3px solid white',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Timeline content box */}
                  <div className="bg-card border rounded-md p-3">
                    {/* Travel info from previous venue */}
                    {index > 0 && distanceFromPrevious > 0 && (
                      <div className="absolute -top-4 left-10 flex items-center bg-muted px-2 py-0.5 rounded-full text-xs shadow-sm">
                        <LocateFixed className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>{formatDistance(distanceFromPrevious)}</span>
                        <span className="mx-1 text-muted-foreground">•</span>
                        <span>{formatTravelTime(travelTimeMinutes)}</span>
                      </div>
                    )}

                    {/* Venue header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-base">{venue.venue}</h4>
                        <div className="flex items-center text-muted-foreground text-sm mt-0.5">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{venue.city || 'Unknown location'}</span>

                          {venue.date && (
                            <>
                              <span className="mx-1">•</span>
                              <span title={formattedDate}>{formattedDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge style={{
                        backgroundColor: `${statusInfo.color}20`,
                        color: statusInfo.color
                      }}>
                        {statusInfo.displayName}
                      </Badge>
                    </div>

                    {/* Notes here if needed */}
                    {venue.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {venue.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}