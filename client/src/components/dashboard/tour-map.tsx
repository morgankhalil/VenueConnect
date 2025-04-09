import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapEvent } from "@/types";
import { Plus, Minus } from "lucide-react";

// DO NOT import Leaflet here - it's already loaded in index.html
// Just declare the L variable to make TypeScript happy
declare const L: any;

interface TourMapProps {
  events: MapEvent[];
  onSelectEvent?: (event: MapEvent) => void;
  genreFilter?: string;
  onGenreFilterChange?: (genre: string) => void;
  dateRangeFilter?: string;
  onDateRangeFilterChange?: (range: string) => void;
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

export function TourMap({ 
  events, 
  onSelectEvent,
  genreFilter = "all",
  onGenreFilterChange,
  dateRangeFilter = "30",
  onDateRangeFilterChange
}: TourMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map once
  useEffect(() => {
    // Only run this once
    if (mapRef.current) return;
    
    try {
      console.log("Starting map initialization");
      
      if (!mapContainerRef.current) {
        throw new Error("Map container not found");
      }
      
      // US center as default
      const center = [39.5, -96.0]; // [lat, lng]
      const zoom = 3.5;
      
      // Initialize map with center and zoom
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false // We'll add custom zoom controls
      });
      
      // Add base tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Store map reference
      mapRef.current = map;
      setIsLoading(false);
      console.log("Map initialized successfully");
      
      // Add event markers
      if (events.length > 0) {
        addMarkersToMap(map, events);
      }
      
      return () => {
        if (mapRef.current) {
          console.log("Removing map");
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err: any) {
      console.error("Map initialization error:", err);
      setError(`Map failed to load: ${err.message || "Unknown error"}`);
      setIsLoading(false);
    }
  }, []);
  
  // Add markers function
  const addMarkersToMap = (map: any, mapEvents: MapEvent[]) => {
    if (!map) return;
    
    try {
      console.log("Adding markers to map", mapEvents.length);
      
      // Clear existing markers if any
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });
      
      // Create markers and get bounds
      const bounds = L.latLngBounds([]);
      
      mapEvents.forEach(event => {
        const { latitude, longitude, artist, venue, isCurrentVenue, isRoutingOpportunity } = event;
        
        // Choose marker color
        const markerColor = isCurrentVenue 
          ? '#F97316' // orange for current venue 
          : isRoutingOpportunity 
            ? '#3B82F6' // blue for routing opportunity
            : '#22C55E'; // green for confirmed
        
        // Create marker with custom icon
        const icon = L.divIcon({
          className: 'custom-venue-marker',
          html: `<div style="width: 16px; height: 16px; background-color: ${markerColor}; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        const marker = L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup(`<b>${artist}</b><br>${venue}`);
        
        // Add click handler
        marker.on('click', () => {
          if (onSelectEvent) {
            onSelectEvent(event);
          }
        });
        
        // Extend bounds
        bounds.extend([latitude, longitude]);
      });
      
      // Add route line
      if (mapEvents.length > 1) {
        // Sort events by date
        const sortedEvents = [...mapEvents].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Create route line
        const routePoints = sortedEvents.map(e => [e.latitude, e.longitude]);
        L.polyline(routePoints, {
          color: '#3B82F6',
          weight: 4,
          dashArray: '4,8',
          opacity: 0.9
        }).addTo(map);
      }
      
      // Fit map to markers if we have any
      if (bounds.isValid?.() || (bounds.getNorthEast && bounds.getSouthWest())) {
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 11
        });
      }
    } catch (err: any) {
      console.error("Error adding markers:", err);
    }
  };
  
  // Update markers when events change
  useEffect(() => {
    if (mapRef.current && events.length > 0) {
      console.log("Events changed, updating markers");
      addMarkersToMap(mapRef.current, events);
    }
  }, [events]);
  
  // Handle zoom controls
  const zoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };
  
  const zoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
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
              {/* Map container */}
              <div 
                ref={mapContainerRef} 
                id="tourMap"
                style={{ width: '100%', height: '100%', position: 'absolute', left: 0, top: 0 }}
              />
              
              {/* Map Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
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
