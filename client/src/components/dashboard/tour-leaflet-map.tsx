import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon, DivIcon, LatLngBounds, LatLng } from 'leaflet';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Zap, X, Info } from "lucide-react";
import { TourGroup, MapEvent } from "@/types";
import 'leaflet/dist/leaflet.css';

// Calculate time between stops (assuming average driving speed of 80 km/h)
function calculateTravelTime(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  // Average speed in km/h
  const avgSpeed = 80;
  
  // Time in hours
  return distance / avgSpeed;
}

// Custom Component to control map bounds
// This ensures the map fits all markers automatically
function MapBoundsUpdater({ events }: { events: MapEvent[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (events.length === 0) return;
    
    const bounds = new LatLngBounds([]);
    events.forEach(event => {
      bounds.extend(new LatLng(event.latitude, event.longitude));
    });
    
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [events, map]);
  
  return null;
}

interface TourDetailMapProps {
  tour: TourGroup;
  userVenueId?: number;
  onClose: () => void;
}

export function TourLeafletMap({ tour, userVenueId, onClose }: TourDetailMapProps) {
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  
  // Sort events by date
  const sortedEvents = [...tour.events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate tour stats
  const confirmedShows = sortedEvents.filter(e => !e.isCurrentVenue && !e.isRoutingOpportunity).length;
  const pendingShows = sortedEvents.filter(e => e.isRoutingOpportunity).length;
  const potentialShows = sortedEvents.filter(e => e.isCurrentVenue).length;
  
  // Get travel stats
  let totalTravelTime = 0;
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = sortedEvents[i];
    const next = sortedEvents[i + 1];
    
    const travelHours = calculateTravelTime(
      current.latitude, current.longitude,
      next.latitude, next.longitude
    );
    
    totalTravelTime += travelHours;
  }
  
  // Create custom marker icons for each marker type
  const createMarkerIcon = (status: 'confirmed' | 'hold' | 'potential', index: number) => {
    const backgroundColor = 
      status === 'confirmed' ? '#10B981' : // Green for confirmed
      status === 'hold' ? '#F59E0B' : // Amber for holds
      '#9CA3AF'; // Gray for potential venue
      
    // Create a custom HTML element for the marker
    return new DivIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${backgroundColor};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          ${index + 1}
        </div>
      `
    });
  };
  
  // Create polyline for tour route
  const pathOptions = { 
    color: '#3B82F6', 
    weight: 3,
    opacity: 0.8,
    dashArray: '5, 10'
  };
  
  // Map points for the polyline route
  const routePoints = sortedEvents.map(event => [event.latitude, event.longitude]);
  
  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{tour.name}</h3>
            <p className="text-sm text-gray-500">{tour.artistName} · {tour.region}</p>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-4 divide-x border-b bg-muted/20">
          <div className="p-3 text-center">
            <div className="text-sm font-medium">{sortedEvents.length}</div>
            <div className="text-xs text-gray-500">Total Stops</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-sm font-medium">{confirmedShows}</div>
            <div className="text-xs text-gray-500">Confirmed</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-sm font-medium">{pendingShows}</div>
            <div className="text-xs text-gray-500">On Hold</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-sm font-medium">{Math.round(totalTravelTime)} hrs</div>
            <div className="text-xs text-gray-500">Travel Time</div>
          </div>
        </div>
        
        <div className="flex flex-col">
          {/* Leaflet Map - Full width at top */}
          <div className="h-[400px] w-full mb-4">
            <MapContainer 
              center={[39.5, -98.0]} // Default center (US)
              zoom={4} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Automatically fit bounds to include all markers */}
              <MapBoundsUpdater events={sortedEvents} />
              
              {/* Add markers for each tour stop */}
              {sortedEvents.map((event, idx) => {
                const markerStatus = 
                  event.isCurrentVenue ? 'potential' : 
                  event.isRoutingOpportunity ? 'hold' : 
                  'confirmed';
                  
                const icon = createMarkerIcon(markerStatus, idx);
                
                return (
                  <Marker 
                    key={event.id}
                    position={[event.latitude, event.longitude]} 
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedEvent(event)
                    }}
                  >
                    <Popup>
                      <div className="font-sans">
                        <div className="font-semibold text-base mb-1">{event.artist}</div>
                        <div className="text-sm mb-1">{event.venue}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(event.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })} · Stop #{idx + 1}
                        </div>
                        
                        <div className="mt-2">
                          <span className={`
                            inline-block px-2 py-0.5 rounded-full text-xs font-medium
                            ${markerStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 
                              markerStatus === 'hold' ? 'bg-amber-100 text-amber-800' : 
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {markerStatus === 'confirmed' ? 'Confirmed' : 
                             markerStatus === 'hold' ? 'On Hold' : 
                             'Potential'}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Add route polyline */}
              {sortedEvents.length > 1 && (
                <Polyline positions={routePoints as any} pathOptions={pathOptions} />
              )}
            </MapContainer>
            
            {/* Map legend */}
            <div className="absolute bottom-36 left-3 bg-white/90 p-2 rounded-md shadow-sm border text-xs z-[1000]">
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1"></span>
                <span className="text-gray-700">Confirmed</span>
              </div>
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 bg-amber-500 rounded-full inline-block mr-1"></span>
                <span className="text-gray-700">On Hold</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-gray-400 rounded-full inline-block mr-1"></span>
                <span className="text-gray-700">Potential</span>
              </div>
            </div>
          </div>
          
          {/* Tour stops list - Now below map */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm text-gray-700">Tour Stops</h4>
            </div>
            <div className="divide-y max-h-[250px] overflow-auto">
              {sortedEvents.map((event, idx) => {
                const isLast = idx === sortedEvents.length - 1;
                const nextEvent = !isLast ? sortedEvents[idx + 1] : null;
                
                // Status badge color
                let statusColor = 'secondary';
                let statusText = 'Unknown';
                
                if (event.isCurrentVenue) {
                  statusColor = 'secondary';
                  statusText = 'Potential';
                } else if (event.isRoutingOpportunity) {
                  statusColor = 'outline';
                  statusText = 'On Hold';
                } else {
                  statusColor = 'default';
                  statusText = 'Confirmed';
                }
                
                return (
                  <div key={event.id} className="relative">
                    <div 
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${
                        selectedEvent?.id === event.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <div className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                            ${event.isCurrentVenue ? 'bg-gray-100 text-gray-700' :
                              event.isRoutingOpportunity ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'}
                          `}>
                            {idx + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div className="font-medium text-sm">{event.venue}</div>
                            <Badge variant={statusColor as any}>{statusText}</Badge>
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Connection to next stop */}
                    {!isLast && nextEvent && (
                      <div className="px-3 py-2 bg-gray-50 border-b text-xs">
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.round(
                            calculateTravelTime(
                              event.latitude, event.longitude,
                              nextEvent.latitude, nextEvent.longitude
                            )
                          )} hrs to next stop
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {sortedEvents.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No tour stops found
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tour Stop Details</DialogTitle>
              <DialogDescription>
                Information about this tour stop
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">{selectedEvent.venue}</h3>
                <p className="text-gray-500">{selectedEvent.artist}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant={
                  selectedEvent.isCurrentVenue ? 'secondary' :
                  selectedEvent.isRoutingOpportunity ? 'outline' : 'default'
                }>
                  {selectedEvent.isCurrentVenue ? 'Potential' : 
                   selectedEvent.isRoutingOpportunity ? 'On Hold' : 'Confirmed'}
                </Badge>
                
                <div className="text-sm text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(selectedEvent.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              
              <div className="text-sm text-gray-500 flex items-start gap-1">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>
                  Location: {selectedEvent.latitude.toFixed(5)}, {selectedEvent.longitude.toFixed(5)}
                </span>
              </div>
              
              {selectedEvent.isCurrentVenue && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-medium">Routing Opportunity</p>
                    <p className="text-blue-700 mt-1">
                      This is your venue. You can submit a booking inquiry to add this stop to the tour.
                    </p>
                    
                    <Button className="mt-3" size="sm">
                      <Zap className="h-4 w-4 mr-1" />
                      Contact Manager
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}