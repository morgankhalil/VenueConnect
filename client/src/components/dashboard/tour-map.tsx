import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  defaultMapCenter, 
  defaultMapZoom, 
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

// Haversine distance calculation function
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

export function TourMap({ 
  events, 
  onSelectEvent,
  genreFilter = "all",
  onGenreFilterChange,
  dateRangeFilter = "30",
  onDateRangeFilterChange
}: TourMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map once when component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    try {
      console.log("Initializing map");
      
      // Fix Leaflet icon path issues
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create map instance
      const leafletMap = L.map(mapContainerRef.current).setView(
        [defaultMapCenter[1], defaultMapCenter[0]], // Convert to [lat, lng]
        defaultMapZoom
      );
      
      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMap);
      
      setMap(leafletMap);
      setIsLoading(false);
      console.log("Map initialized successfully");
      
      return () => {
        if (leafletMap) {
          console.log("Cleaning up map");
          leafletMap.remove();
        }
      };
    } catch (err: any) {
      console.error("Map initialization error:", err.message);
      setError(`Map error: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Update markers and routes when events or map changes
  useEffect(() => {
    if (!map || !events.length) return;
    
    try {
      // Clear any existing layers
      map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          layer.remove();
        }
      });
      
      // Check if there's a base tile layer
      let hasBaseTileLayer = false;
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          hasBaseTileLayer = true;
        }
      });
      
      if (!hasBaseTileLayer) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
      }
      
      // Create bounds to fit all markers
      const bounds = L.latLngBounds([]);
      
      // Add markers for each event
      events.forEach(event => {
        const { latitude, longitude, artist, venue, date, isCurrentVenue, isRoutingOpportunity } = event;
        
        // Select marker color based on event type
        const markerColor = isCurrentVenue 
          ? venueMarkerColors.currentVenue 
          : isRoutingOpportunity 
            ? venueMarkerColors.routingOpportunity 
            : venueMarkerColors.confirmedVenue;
        
        // Create custom marker with color
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${markerColor}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        // Create popup content
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <strong style="font-size: 14px;">${artist}</strong><br/>
            <span style="font-size: 13px;">${venue}</span><br/>
            <span style="font-size: 12px; color: #666;">${new Date(date).toLocaleDateString()}</span>
          </div>
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
        
        // Extend bounds to include this marker
        bounds.extend([latitude, longitude]);
      });
      
      // Create route line connecting venues chronologically
      if (events.length > 1) {
        const sortedEvents = [...events].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        const routePoints = sortedEvents.map(event => 
          [event.latitude, event.longitude] as [number, number]
        );
        
        L.polyline(routePoints, {
          color: routeLineStyle.color,
          weight: routeLineStyle.width,
          dashArray: routeLineStyle.dashArray.join(','),
          opacity: 0.9
        }).addTo(map);
      }
      
      // Fit map to bounds if we have any markers
      if (bounds.getNorthEast() && bounds.getSouthWest()) {
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 11
        });
      }
    } catch (err: any) {
      console.error("Error updating map markers:", err);
    }
  }, [map, events, onSelectEvent]);

  // Zoom controls
  const zoomIn = () => map?.zoomIn();
  const zoomOut = () => map?.zoomOut();

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
              <p className="text-red-500 mb-2">Map Error</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              
              {/* Fallback visualization when map fails */}
              <div className="w-full max-w-2xl p-4 bg-white rounded-lg shadow overflow-auto max-h-[400px]">
                <h4 className="font-medium text-gray-900 mb-3">Venue Routing Opportunities Timeline</h4>
                
                <div className="space-y-0">
                  {[...events]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, idx, allEvents) => {
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
                            
                            <div className="text-xs text-gray-400 mt-1">
                              Location: {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}
                            </div>
                          </div>
                          
                          {/* Distance to next venue */}
                          {hasNextEvent && (
                            <div className="flex items-center my-2 ml-4">
                              <div className="w-1 h-16 bg-primary-300 rounded-full"></div>
                              <div className="ml-2 text-xs text-gray-500">
                                <span className="text-primary-500 font-medium">
                                  {Math.round(calculateDistance(
                                    event.latitude,
                                    event.longitude,
                                    nextEvent.latitude,
                                    nextEvent.longitude
                                  ))} km
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
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
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
