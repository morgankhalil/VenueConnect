import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapEvent, TourGroup } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Zap, X, Info } from "lucide-react";
import { getStatusInfo, getStatusBadgeVariant } from "@/lib/tour-status";

declare const mapboxgl: any;

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

interface TourDetailMapProps {
  tour: TourGroup;
  userVenueId?: number;
  onClose: () => void;
}

export function TourDetailMap({ tour, userVenueId, onClose }: TourDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  
  // Sort events by date
  const sortedEvents = [...tour.events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    try {
      console.log("Tour detail map initialization starting");
      
      // Check if mapboxgl is available
      if (!mapboxgl) {
        throw new Error("Mapbox GL JS is not loaded");
      }
      
      // Set access token with actual token from environment
      mapboxgl.accessToken = "pk.eyJ1IjoibWlzc21hbmFnZW1lbnQiLCJhIjoiY205OTllOGFvMDhsaDJrcTliYjdha241dCJ9.In3R8-WuiwMYenu_SnZ4aA";
      
      // Create the map
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap Contributors'
            }
          },
          layers: [
            {
              id: 'osm-layer',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [-96.0, 39.5], // US center [lng, lat]
        zoom: 3
      });
      
      // Store map reference
      mapRef.current = map;
      
      // Wait for map to load
      map.on('load', () => {
        console.log("Map loaded successfully");
        setIsLoading(false);
        
        // Add markers 
        if (tour.events.length > 0) {
          addMarkersToMap();
        }
      });
      
      map.on('error', (e: any) => {
        console.error("Mapbox error:", e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });
      
      // Clean up when component unmounts
      return () => {
        // Remove all markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        // Remove map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err: any) {
      console.error("Map initialization error:", err);
      setError(`${err.message || "Failed to initialize map"}`);
      setIsLoading(false);
    }
  }, []);
  
  // Add markers and route lines
  const addMarkersToMap = () => {
    const map = mapRef.current;
    if (!map) return;
    
    try {
      // Remove any existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Remove existing route line if it exists
      if (map.getSource('route')) {
        map.removeLayer('route-line');
        map.removeSource('route');
      }
      
      // Bounds to fit map to all markers
      const bounds = new mapboxgl.LngLatBounds();
      
      // Add markers for each event
      sortedEvents.forEach(event => {
        const { id, latitude, longitude, artist, venue, isCurrentVenue, isRoutingOpportunity, date } = event;
        
        // Determine status based on venue type using our standardized status system
        let status = 'potential'; // Default to potential
        
        if (isCurrentVenue) {
          status = 'potential';
        } else if (isRoutingOpportunity) {
          status = 'hold';
        } else {
          status = 'confirmed';
        }
        
        // Get color from status utility
        const statusInfo = getStatusInfo(status);
        let markerColor = statusInfo.color;
        
        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = markerColor;
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        // Add number inside marker for stop sequence
        const stopNumber = sortedEvents.findIndex(e => e.id === id) + 1;
        el.innerHTML = `<span style="color: white; font-weight: bold; font-size: 12px;">${stopNumber}</span>`;
        
        // Date formatting
        const eventDate = new Date(date);
        const formattedDate = eventDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        
        // Create popup with more details
        const popup = new mapboxgl.Popup({ offset: 15, maxWidth: '300px' })
          .setHTML(`
            <div style="font-family: system-ui, sans-serif;">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${artist}</div>
              <div style="font-size: 14px; margin-bottom: 2px;">${venue}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                ${formattedDate} · Stop #${stopNumber}
              </div>
              
              <div style="margin-top: 6px;">
                <span style="
                  display: inline-block;
                  padding: 2px 8px;
                  border-radius: 9999px;
                  font-size: 11px;
                  font-weight: 500;
                  background-color: ${status === 'confirmed' ? '#DCFCE7' : 
                    status === 'hold' ? '#FEF3C7' : 
                    '#F3F4F6'
                  };
                  color: ${
                    status === 'confirmed' ? '#059669' : 
                    status === 'hold' ? '#D97706' : 
                    '#4B5563'
                  };"
                >
                  ${statusInfo.displayName}
                </span>
              </div>
            </div>
          `);
        
        // Create marker
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
        
        // Add click handler
        el.addEventListener('click', () => {
          setSelectedEvent(event);
        });
        
        // Store marker for later removal
        markersRef.current.push(marker);
        
        // Extend bounds to include this marker
        bounds.extend([longitude, latitude]);
      });
      
      // Add route line if we have multiple events
      if (sortedEvents.length > 1) {        
        // Create GeoJSON object for route
        const routeGeoJson = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: sortedEvents.map(event => [event.longitude, event.latitude])
          }
        };
        
        // Add the route as a source
        map.addSource('route', {
          type: 'geojson',
          data: routeGeoJson
        });
        
        // Add a layer for the route line
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3B82F6', // Blue route line
            'line-width': 3,
            'line-opacity': 0.8,
            'line-dasharray': [0.5, 1]
          }
        });
      }
      
      // Fit the map to the bounds
      if (sortedEvents.length > 0) {
        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 10
        });
      }
    } catch (err: any) {
      console.error("Error adding markers:", err);
    }
  };
  
  // Calculate tour stats
  const confirmedShows = sortedEvents.filter(e => !e.isCurrentVenue && !e.isRoutingOpportunity).length;
  const pendingShows = sortedEvents.filter(e => e.isRoutingOpportunity).length;
  const potentialShows = sortedEvents.filter(e => e.isCurrentVenue).length;
  
  // Get travel stats
  let totalDistance = 0;
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
          {/* Map area - Now full width */}
          <div className="relative h-[400px] w-full mb-4">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <p className="text-gray-500">Loading tour map...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                  <p className="text-red-500 font-medium mb-2">Map Error</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <p className="text-sm text-gray-500 mt-4">
                    You can still view the tour stops below.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Map container */}
                <div 
                  ref={mapContainerRef}
                  className="absolute inset-0"
                />
                
                {/* Map legend */}
                <div className="absolute bottom-3 left-3 bg-white/90 p-2 rounded-md shadow-sm border text-xs">
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
              </>
            )}
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
                
                // Determine status based on venue type
                let status = 'potential'; // Default to potential
                
                if (event.isCurrentVenue) {
                  status = 'potential';
                } else if (event.isRoutingOpportunity) {
                  status = 'hold';
                } else {
                  status = 'confirmed';
                }
                
                // Get status info from utility
                const statusInfo = getStatusInfo(status);
                const statusColor = getStatusBadgeVariant(status);
                const statusText = statusInfo.displayName;
                
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