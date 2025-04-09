import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  defaultMapCenter, 
  defaultMapZoom, 
  calculateCenter, 
  calculateZoom, 
  venueMarkerColors, 
  routeLineStyle
} from "@/lib/mapUtils";
import { MapEvent } from "@/types";
import { Plus, Minus } from "lucide-react";

// Using mapboxgl from CDN included in index.html
declare global {
  interface Window {
    mapboxgl: any;
  }
}

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
    
    const loadMapbox = async () => {
      try {
        // Check if Mapbox is available
        console.log("Checking if mapboxgl is available in window:", window.mapboxgl ? "Yes" : "No");
        if (!window.mapboxgl) {
          throw new Error("Mapbox GL JS is not available. Make sure the CDN script is loaded correctly.");
        }
        
        // Fetch token from API
        console.log("Fetching Mapbox token...");
        const response = await fetch('/api/mapbox-token');
        const data = await response.json();
        const token = data.token;
        
        console.log("Token received:", token ? "Valid token" : "No token");
        if (!token) {
          throw new Error("No Mapbox token received from API");
        }
        
        console.log("Token received, initializing map...");
        
        // Initialize map with token
        if (mapContainerRef.current && isMounted) {
          const mapInstance = new window.mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/light-v10',
            center: defaultMapCenter,
            zoom: defaultMapZoom,
            accessToken: token  // Pass token directly to the Map constructor
          });
          
          mapInstance.on('load', () => {
            if (isMounted) {
              console.log("Map loaded successfully");
              setMapLoaded(true);
              setIsLoading(false);
            }
          });
          
          mapInstance.on('error', (e: any) => {
            console.error("Mapbox error:", e);
            
            // Get a more detailed error message
            const errorMessage = e.error ? e.error.message : 
              (e.status ? `Error ${e.status}: ${e.statusText}` : 'Unknown error');
            
            // Log detailed error information
            console.error("Mapbox detailed error:", {
              error: e.error,
              status: e.status,
              statusText: e.statusText,
              source: e.sourceId || 'unknown'
            });
            
            if (isMounted) {
              setError(`Map error: ${errorMessage}. This might be due to an issue with the Mapbox token or network connectivity.`);
              setIsLoading(false);
            }
          });
          
          // Add success message on successful style load
          mapInstance.on('style.load', () => {
            console.log("Map style loaded successfully");
          });
          
          setMap(mapInstance);
        }
      } catch (err) {
        console.error("Error loading map:", err);
        if (isMounted) {
          setError(`Failed to load map: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      }
    };
    
    // Start loading
    loadMapbox();
    
    return () => {
      isMounted = false;
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update map when events change
  useEffect(() => {
    if (map && mapLoaded && events.length > 0) {
      // Clear existing markers and layers
      const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
      existingMarkers.forEach(marker => marker.remove());
      
      if (map.getLayer('route-line')) {
        map.removeLayer('route-line');
      }
      
      if (map.getSource('route')) {
        map.removeSource('route');
      }

      // Add new markers for each event
      const coordinates: [number, number][] = [];
      
      events.forEach(event => {
        const { latitude, longitude, artist, venue, date, isCurrentVenue, isRoutingOpportunity } = event;
        coordinates.push([longitude, latitude]);
        
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'marker';
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.boxShadow = '0 0 0 2px white';
        
        // Set color based on marker type
        if (isCurrentVenue) {
          markerEl.style.backgroundColor = venueMarkerColors.currentVenue;
        } else if (isRoutingOpportunity) {
          markerEl.style.backgroundColor = venueMarkerColors.routingOpportunity;
        } else {
          markerEl.style.backgroundColor = venueMarkerColors.confirmedVenue;
        }
        
        // Create popup with event details
        const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
          <strong>${artist}</strong><br/>
          ${venue}<br/>
          ${new Date(date).toLocaleDateString()}
        `);
        
        // Add marker to map
        const marker = new window.mapboxgl.Marker(markerEl)
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);
          
        // Add click handler
        markerEl.addEventListener('click', () => {
          if (onSelectEvent) {
            onSelectEvent(event);
          }
        });
      });

      // Create a line connecting the events in chronological order
      const sortedEvents = [...events].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const routeCoordinates = sortedEvents.map(event => 
        [event.longitude, event.latitude]
      );
      
      // Add the route line to the map
      if (map.getSource('route')) {
        (map.getSource('route') as any).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        });
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          }
        });
        
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': routeLineStyle.color,
            'line-width': routeLineStyle.width,
            'line-dasharray': routeLineStyle.dashArray,
            'line-opacity': 0.9
          }
        });
      }

      // Update map view to fit all markers
      if (coordinates.length > 0) {
        const center = calculateCenter(coordinates);
        const zoom = calculateZoom(coordinates);
        
        map.flyTo({
          center,
          zoom: Math.max(zoom - 0.5, 3), // Add some padding
          essential: true
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
              <p className="text-red-500 mb-2">Error loading map</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              
              {/* Fallback visualization when map is unavailable */}
              <div className="w-full max-w-2xl p-4 bg-white rounded-lg shadow overflow-auto max-h-60">
                <h4 className="font-medium text-gray-900 mb-2">Venue Routing Opportunities</h4>
                <div className="space-y-2">
                  {events.map(event => (
                    <div 
                      key={`${event.venue}-${event.date}`}
                      className={`p-3 rounded-lg border ${
                        event.isCurrentVenue ? 'bg-amber-50 border-amber-200' : 
                        event.isRoutingOpportunity ? 'bg-blue-50 border-blue-200' : 
                        'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="font-medium">{event.artist}</div>
                      <div className="text-sm text-gray-600">{event.venue}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(event.date).toLocaleDateString()} • 
                        {event.isCurrentVenue ? ' Your Venue' : 
                         event.isRoutingOpportunity ? ' Routing Opportunity' : 
                         ' Confirmed Show'}
                      </div>
                    </div>
                  ))}
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
