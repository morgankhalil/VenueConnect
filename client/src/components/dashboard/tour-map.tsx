import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  defaultMapCenter, 
  defaultMapZoom, 
  calculateCenter, 
  calculateZoom, 
  venueMarkerColors, 
  routeLineStyle,
  mapboxToken
} from "@/lib/mapUtils";
import { MapEvent } from "@/types";
import { Plus, Minus } from "lucide-react";

// Type declaration for mapboxgl
declare global {
  interface Window {
    mapboxgl: any;
  }
}

type MapboxMap = {
  remove: () => void;
  on: (event: string, handler: () => void) => void;
  getLayer: (id: string) => any;
  removeLayer: (id: string) => void;
  getSource: (id: string) => any;
  removeSource: (id: string) => void;
  addSource: (id: string, config: any) => void;
  addLayer: (layer: any) => void;
  flyTo: (options: any) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

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
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenFetched, setTokenFetched] = useState(false);

  useEffect(() => {
    // Load MapBox script dynamically
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js';
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Fetch token from API
    let isMounted = true;
    let localMapboxToken = "";
    
    // Helper function to initialize map once token is available
    const initializeMap = () => {
      if (!mapContainerRef.current || map || !isMounted) return;
      
      // Initialize MapBox
      // @ts-ignore - mapboxgl will be available after script load
      window.mapboxgl.accessToken = localMapboxToken;
      
      try {
        // @ts-ignore - mapboxgl will be available after script load
        const mapInstance = new window.mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/light-v10',
          center: defaultMapCenter,
          zoom: defaultMapZoom
        });

        mapInstance.on('load', () => {
          if (isMounted) {
            setMapLoaded(true);
          }
        });

        if (isMounted) {
          setMap(mapInstance);
          setTokenFetched(true);
          setTokenLoading(false);
        }
      } catch (err) {
        console.error("Error initializing map:", err);
        setTokenLoading(false);
      }
    };
    
    // Wait for both script to load and token to be fetched
    const fetchToken = async () => {
      try {
        console.log("Fetching Mapbox token...");
        const response = await fetch('/api/mapbox-token');
        const data = await response.json();
        console.log("Token response:", data);
        
        if (isMounted) {
          localMapboxToken = data.token || "";
          
          if (localMapboxToken) {
            console.log("Token received, length:", localMapboxToken.length);
            // Wait for a short time to ensure script has time to load
            setTimeout(() => {
              if (window.mapboxgl) {
                console.log("mapboxgl is available, initializing map...");
                initializeMap();
              } else {
                console.log("mapboxgl is not available yet, waiting for script load...");
                // Set a listener for when mapboxgl becomes available
                const checkMapboxInterval = setInterval(() => {
                  if (window.mapboxgl) {
                    console.log("mapboxgl became available, initializing map...");
                    clearInterval(checkMapboxInterval);
                    initializeMap();
                  }
                }, 100);
                
                // Clear interval after 10 seconds to prevent infinite checking
                setTimeout(() => clearInterval(checkMapboxInterval), 10000);
              }
            }, 500);
          } else {
            console.log("Empty token received");
            setTokenLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
        setTokenLoading(false);
      }
    };
    
    fetchToken();
    
    script.onload = () => {
      if (localMapboxToken) {
        initializeMap();
      }
    };

    return () => {
      isMounted = false;
      if (map) {
        map.remove();
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link);
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
        // @ts-ignore - mapboxgl will be available
        const popup = new window.mapboxgl.Popup({ offset: 25 }).setHTML(`
          <strong>${artist}</strong><br/>
          ${venue}<br/>
          ${new Date(date).toLocaleDateString()}
        `);
        
        // Add marker to map
        // @ts-ignore - mapboxgl will be available
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
        // @ts-ignore - source type is valid
        map.getSource('route').setData({
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
            'line-dasharray': [5, 5]
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
          {tokenLoading || !tokenFetched ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-gray-500 mb-2">Waiting for Mapbox token...</p>
              <p className="text-sm text-gray-400">The map will display routing opportunities between venues once configured.</p>
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
