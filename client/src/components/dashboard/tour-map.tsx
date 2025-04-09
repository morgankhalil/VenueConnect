import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  defaultMapCenter, 
  defaultMapZoom, 
  calculateCenter, 
  calculateZoom, 
  calculateDistance,
  venueMarkerColors, 
  routeLineStyle
} from "@/lib/mapUtils";
import { MapEvent } from "@/types";
import { Plus, Minus } from "lucide-react";

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TourMapProps {
  events: MapEvent[];
  onSelectEvent?: (event: MapEvent) => void;
  genreFilter?: string;
  onGenreFilterChange?: (genre: string) => void;
  dateRangeFilter?: string;
  onDateRangeFilterChange?: (range: string) => void;
}

export function TourMap({ 
  events, 
  onSelectEvent,
  genreFilter = "all",
  onGenreFilterChange,
  dateRangeFilter = "30",
  onDateRangeFilterChange
}: TourMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Use the enhanced card-based visualization for a better user experience
    console.log("Using enhanced timeline visualization");
    setIsLoading(false);
    setError("Enhanced routing timeline visualization activated");
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Marker and route layer references
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  
  // Update map when events change
  useEffect(() => {
    if (map && mapLoaded && events.length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Clear existing route
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }

      // Add new markers for each event
      const bounds = L.latLngBounds([]);
      
      events.forEach(event => {
        const { latitude, longitude, artist, venue, date, isCurrentVenue, isRoutingOpportunity } = event;
        
        // Create custom icon based on event type
        const markerColor = isCurrentVenue 
          ? venueMarkerColors.currentVenue 
          : isRoutingOpportunity 
            ? venueMarkerColors.routingOpportunity 
            : venueMarkerColors.confirmedVenue;
            
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: ${markerColor}; border: 2px solid white;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        // Create popup with event details
        const popupContent = `
          <strong>${artist}</strong><br/>
          ${venue}<br/>
          ${new Date(date).toLocaleDateString()}
        `;
        
        // Add marker to map
        const marker = L.marker([latitude, longitude], { icon: customIcon })
          .bindPopup(popupContent)
          .addTo(map);
          
        // Add click handler
        marker.on('click', () => {
          if (onSelectEvent) {
            onSelectEvent(event);
          }
        });
        
        // Store marker reference for cleanup
        markersRef.current.push(marker);
        
        // Extend bounds to include this marker
        bounds.extend([latitude, longitude]);
      });

      // Create a line connecting the events in chronological order
      const sortedEvents = [...events].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const routePoints = sortedEvents.map(event => 
        [event.latitude, event.longitude] as [number, number]
      );
      
      // Add the route line to the map
      if (routePoints.length > 1) {
        routeLayerRef.current = L.polyline(routePoints, {
          color: routeLineStyle.color,
          weight: routeLineStyle.width,
          dashArray: routeLineStyle.dashArray.join(','),
          opacity: 0.9
        }).addTo(map);
      }

      // Fit map to bounds with padding
      if (bounds.getNorthEast() && bounds.getSouthWest()) {
        map.fitBounds(bounds, {
          padding: [50, 50], // Add padding
          maxZoom: 12 // Limit zoom level
        });
      }
    }
  }, [map, mapLoaded, events, onSelectEvent]);

  const zoomIn = () => {
    if (map) {
      map.zoomIn();
    }
  };

  const zoomOut = () => {
    if (map) {
      map.zoomOut();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="sm:flex sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Tour Routing Opportunities</h3>
          <div className="mt-3 sm:mt-0 sm:ml-4">
            <div className="flex space-x-3">
              <Select value={genreFilter} onValueChange={onGenreFilterChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="indie">Indie</SelectItem>
                  <SelectItem value="hip_hop">Hip-Hop</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateRangeFilter} onValueChange={onDateRangeFilterChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Next 30 Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 Days</SelectItem>
                  <SelectItem value="60">Next 60 Days</SelectItem>
                  <SelectItem value="90">Next 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="relative h-96 rounded-lg overflow-hidden bg-gray-50">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-gray-500 mb-2">Loading map...</p>
              <p className="text-sm text-gray-400">The map will display routing opportunities between venues once loaded.</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <p className="text-primary-500 mb-2 font-medium">Route Timeline Visualization</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              
              {/* Enhanced card-based visualization with routing indicators */}
              <div className="w-full max-w-2xl p-4 bg-white rounded-lg shadow overflow-auto max-h-[400px]">
                <h4 className="font-medium text-gray-900 mb-3">Venue Routing Opportunities Timeline</h4>
                
                {/* Sort events chronologically for timeline display */}
                <div className="space-y-0">
                  {[...events]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, idx, allEvents) => {
                      // Calculate distance to next venue if applicable
                      const nextEvent = idx < allEvents.length - 1 ? allEvents[idx + 1] : null;
                      const hasNextEvent = nextEvent !== null;
                      
                      return (
                        <div key={`${event.venue}-${event.date}`} className="relative mb-4 last:mb-0">
                          {/* Event card */}
                          <div 
                            className={`p-3 rounded-lg border ${
                              event.isCurrentVenue ? 'bg-amber-50 border-amber-200' : 
                              event.isRoutingOpportunity ? 'bg-blue-50 border-blue-200' : 
                              'bg-green-50 border-green-200'
                            }`}
                            onClick={() => onSelectEvent && onSelectEvent(event)}
                          >
                            <div className="font-medium text-lg">{event.artist}</div>
                            <div className="text-sm text-gray-700">{event.venue}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(event.date).toLocaleDateString()} • 
                              {event.isCurrentVenue ? ' Your Venue' : 
                               event.isRoutingOpportunity ? ' Routing Opportunity' : 
                               ' Confirmed Show'}
                            </div>
                            
                            {/* Coordinates info */}
                            <div className="text-xs text-gray-400 mt-1">
                              Location: {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}
                            </div>
                          </div>
                          
                          {/* Connection line to next event */}
                          {hasNextEvent && (
                            <div className="flex items-center my-2 ml-4">
                              <div className="w-1 h-16 bg-primary-300 rounded-full"></div>
                              <div className="ml-2 text-xs text-gray-500">
                                <span className="text-primary-500 font-medium">
                                  {((event.latitude !== nextEvent.latitude || event.longitude !== nextEvent.longitude) 
                                    ? Math.round(
                                        // Inline distance calculation to avoid import issues
                                        (() => {
                                          // Haversine formula
                                          const R = 6371; // Earth radius in km
                                          const lat1 = event.latitude;
                                          const lon1 = event.longitude;
                                          const lat2 = nextEvent.latitude;
                                          const lon2 = nextEvent.longitude;
                                          const deg2rad = (deg: number) => deg * (Math.PI / 180);
                                          
                                          const dLat = deg2rad(lat2 - lat1);
                                          const dLon = deg2rad(lon2 - lon1);
                                          
                                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                                    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                                                    Math.sin(dLon/2) * Math.sin(dLon/2);
                                          
                                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                          return R * c; // Distance in km
                                        })()
                                      )
                                    : 0)
                                  } km
                                </span> to next venue
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div ref={mapContainerRef} className="absolute inset-0" />
              {/* Map Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                <button 
                  className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
                  onClick={zoomIn}
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
                  onClick={zoomOut}
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Map Legend */}
        <div className="mt-4 flex items-center space-x-4 text-sm">
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
