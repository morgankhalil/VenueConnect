import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MapEvent } from "@/types";

interface TourTimelineProps {
  events: MapEvent[];
  onSelectEvent?: (event: MapEvent) => void;
}

// Simple distance calculation 
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

export function TourTimeline({ events, onSelectEvent }: TourTimelineProps) {
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tour Routing Timeline</h3>
        
        <div className="space-y-2">
          {sortedEvents.map((event, idx, allEvents) => {
            const nextEvent = idx < allEvents.length - 1 ? allEvents[idx + 1] : null;
            const hasNextEvent = nextEvent !== null;
            
            return (
              <div key={`${event.venue}-${event.date}`} className="relative">
                {/* Event card */}
                <div 
                  className={`p-3 rounded-lg border ${
                    event.isCurrentVenue ? 'bg-amber-50 border-amber-200' : 
                    event.isRoutingOpportunity ? 'bg-blue-50 border-blue-200' : 
                    'bg-green-50 border-green-200'
                  } cursor-pointer transition-all hover:shadow-md`}
                  onClick={() => onSelectEvent && onSelectEvent(event)}
                >
                  <div className="grid grid-cols-[auto_1fr] gap-3">
                    {/* Date indicator */}
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border">
                        <span className="text-sm font-medium">
                          {new Date(event.date).toLocaleDateString(undefined, { 
                            month: 'short',
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Event info */}
                    <div>
                      <div className="font-medium text-base">{event.artist}</div>
                      <div className="text-sm text-gray-700">{event.venue}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {event.isCurrentVenue ? 'Your Venue' : 
                         event.isRoutingOpportunity ? 'Routing Opportunity' : 
                         'Confirmed Show'}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <span>📍 {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Distance to next venue */}
                {hasNextEvent && (
                  <div className="ml-6 pl-6 border-l border-gray-200 py-2">
                    <div className="text-xs text-gray-500">
                      <span className="text-primary-500 font-medium">
                        {Math.round(calculateDistance(
                          event.latitude,
                          event.longitude,
                          nextEvent.latitude,
                          nextEvent.longitude
                        ))} km
                      </span> to next venue 
                      <span className="ml-1 text-gray-400">
                        · {Math.ceil(calculateDistance(
                            event.latitude,
                            event.longitude,
                            nextEvent.latitude,
                            nextEvent.longitude
                          ) / 80)} hrs drive
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No tour events found.</p>
              <p className="text-sm mt-1">Add events to see routing opportunities.</p>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm pt-4 border-t">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1"></span>
            <span className="text-gray-600">Confirmed Show</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full inline-block mr-1"></span>
            <span className="text-gray-600">Your Venue</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-primary-500 rounded-full inline-block mr-1"></span>
            <span className="text-gray-600">Routing Opportunity</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}