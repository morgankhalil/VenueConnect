import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapEvent } from "@/types";
import { Plus, Minus } from "lucide-react";

// Access the global mapboxgl that was loaded from the CDN
declare const mapboxgl: any;

interface TourMapProps {
  events: MapEvent[];
  onSelectEvent?: (event: MapEvent) => void;
  genreFilter?: string;
  onGenreFilterChange?: (genre: string) => void;
  dateRangeFilter?: string;
  onDateRangeFilterChange?: (range: string) => void;
}

// Distance calculation function
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
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    try {
      console.log("Tour map initialization starting");
      
      // Check if mapboxgl is available
      if (!mapboxgl) {
        throw new Error("Mapbox GL JS is not loaded");
      }
      
      // Set access token with actual token from environment
      mapboxgl.accessToken = "pk.eyJ1IjoibWlzc21hbmFnZW1lbnQiLCJhIjoiY205OTllOGFvMDhsaDJrcTliYjdha241dCJ9.In3R8-WuiwMYenu_SnZ4aA";
      
      // Create the map
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-96.0, 39.5], // US center [lng, lat]
        zoom: 3,
        attributionControl: true
      });
      
      // Add navigation controls but don't use the default ones
      // We'll add custom controls
      
      // Store map reference
      mapRef.current = map;
      
      // Wait for map to load
      map.on('load', () => {
        console.log("Map loaded successfully");
        setIsLoading(false);
        
        // Add markers if we already have events
        if (events.length > 0) {
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
      events.forEach(event => {
        const { latitude, longitude, artist, venue, isCurrentVenue, isRoutingOpportunity } = event;
        
        // Choose marker color based on venue type
        const markerColor = isCurrentVenue 
          ? '#F97316' // Orange for current venue
          : isRoutingOpportunity 
            ? '#3B82F6' // Blue for routing opportunity
            : '#22C55E'; // Green for confirmed show
        
        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = markerColor;
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 15 })
          .setHTML(`
            <div>
              <h3 style="font-weight:600;margin:0 0 5px;">${artist}</h3>
              <p style="margin:0;">${venue}</p>
              <p style="margin:5px 0 0;font-size:12px;color:#666;">
                ${new Date(event.date).toLocaleDateString()}
              </p>
            </div>
          `);
        
        // Create marker
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
        
        // Add click handler
        el.addEventListener('click', () => {
          if (onSelectEvent) {
            onSelectEvent(event);
          }
        });
        
        // Store marker for later removal
        markersRef.current.push(marker);
        
        // Extend bounds to include this marker
        bounds.extend([longitude, latitude]);
      });
      
      // Add route line if we have multiple events
      if (events.length > 1) {
        // Sort events by date
        const sortedEvents = [...events].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
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
            'line-color': '#3B82F6',
            'line-width': 4,
            'line-opacity': 0.9,
            'line-dasharray': [4, 8]
          }
        });
      }
      
      // Fit the map to the bounds
      if (events.length > 0) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 11
        });
      }
    } catch (err: any) {
      console.error("Error adding markers:", err);
    }
  };
  
  // Update markers when events change
  useEffect(() => {
    if (mapRef.current && !isLoading && events.length > 0) {
      console.log("Updating markers for", events.length, "events");
      addMarkersToMap();
    }
  }, [events, isLoading]);
  
  // Custom zoom controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };
  
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
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
                className="absolute inset-0"
              />
              
              {/* Custom map controls */}
              <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
                <button 
                  className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
                  onClick={handleZoomIn}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  className="bg-white rounded-full p-2 shadow hover:bg-gray-100"
                  onClick={handleZoomOut}
                  aria-label="Zoom out"
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
