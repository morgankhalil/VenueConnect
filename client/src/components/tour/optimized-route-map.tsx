import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getTourRoutes } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Route, 
  MapPin,
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import { formatDistance } from '@/lib/utils';

// Import these for type checking, actual implementation will use mapboxgl globally
declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface OptimizedRouteMapProps {
  tourId: number;
  width?: string;
  height?: string;
  showRouteDetails?: boolean;
}

export function OptimizedRouteMap({ 
  tourId, 
  width = '100%', 
  height = '500px',
  showRouteDetails = true
}: OptimizedRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Fetch tour routes
  const { data: routes, isLoading, error } = useQuery({
    queryKey: ['/api/tour-optimization/tours', tourId, 'routes'],
    queryFn: () => getTourRoutes(tourId),
    enabled: Boolean(tourId)
  });

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    // Check if mapboxgl is available globally
    if (!window.mapboxgl) {
      console.error('Mapbox GL JS is not loaded');
      return;
    }
    
    // Initialize map
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-97.0, 38.0], // Center on US by default
      zoom: 3,
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN
    });
    
    // Add navigation controls
    map.current.addControl(new window.mapboxgl.NavigationControl());
    
    // Set up event listener for map load
    map.current.on('load', () => {
      setMapLoaded(true);
    });
    
    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  // Add route data to map when routes data and map are available
  useEffect(() => {
    if (!mapLoaded || !routes || !routes.length || !map.current) return;
    
    // Clear existing layers and sources
    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }
    
    // Format data for the map
    const coordinates: [number, number][] = [];
    const markers: any[] = [];
    const bounds = new window.mapboxgl.LngLatBounds();
    
    // Process route data to create a linestring
    routes.forEach(route => {
      if (route.startVenue && route.startVenue.latitude && route.startVenue.longitude) {
        const startCoord: [number, number] = [
          Number(route.startVenue.longitude), 
          Number(route.startVenue.latitude)
        ];
        coordinates.push(startCoord);
        bounds.extend(startCoord);
        
        // Add marker for start venue if not already added
        if (!markers.some(m => m.venueId === route.startVenue.id)) {
          const el = document.createElement('div');
          el.className = 'marker';
          el.style.backgroundColor = '#3b82f6';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          
          const marker = new window.mapboxgl.Marker(el)
            .setLngLat(startCoord)
            .setPopup(
              new window.mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h3>${route.startVenue.name}</h3><p>${route.startVenue.city}, ${route.startVenue.region || ''}</p>`)
            )
            .addTo(map.current);
          
          markers.push({ marker, venueId: route.startVenue.id });
        }
      }
      
      // Add end venue coordinate and marker for the last route
      if (route.endVenue && route.endVenue.latitude && route.endVenue.longitude) {
        const endCoord: [number, number] = [
          Number(route.endVenue.longitude), 
          Number(route.endVenue.latitude)
        ];
        
        // Only add the end coordinate if it's not already in the array
        if (!coordinates.some(c => c[0] === endCoord[0] && c[1] === endCoord[1])) {
          coordinates.push(endCoord);
          bounds.extend(endCoord);
        }
        
        // Add marker for end venue if not already added
        if (!markers.some(m => m.venueId === route.endVenue.id)) {
          const el = document.createElement('div');
          el.className = 'marker';
          el.style.backgroundColor = '#3b82f6';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          
          const marker = new window.mapboxgl.Marker(el)
            .setLngLat(endCoord)
            .setPopup(
              new window.mapboxgl.Popup({ offset: 25 })
                .setHTML(`<h3>${route.endVenue.name}</h3><p>${route.endVenue.city}, ${route.endVenue.region || ''}</p>`)
            )
            .addTo(map.current);
          
          markers.push({ marker, venueId: route.endVenue.id });
        }
      }
    });
    
    // Add the route to the map
    if (coordinates.length >= 2) {
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });
      
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
      
      // Fit the map to the route
      map.current.fitBounds(bounds, {
        padding: 50
      });
    }
  }, [routes, mapLoaded]);
  
  // Calculate route statistics
  const totalDistance = routes?.reduce((sum, route) => 
    sum + (route.distanceKm || 0), 0) || 0;
  
  const totalTime = routes?.reduce((sum, route) => 
    sum + (route.estimatedTravelTimeMinutes || 0), 0) || 0;
  
  // Format total time as hours and minutes
  const formattedTime = (() => {
    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;
    return `${hours}h ${minutes}m`;
  })();
  
  // Get average optimization score
  const avgScore = routes?.length 
    ? Math.round(routes.reduce((sum, route) => sum + (route.optimizationScore || 0), 0) / routes.length) 
    : 0;

  // Render loading state or error
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading route map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-destructive gap-2 mb-4">
            <AlertTriangle size={20} />
            <p className="font-medium">Failed to load route data</p>
          </div>
          <p className="text-muted-foreground text-sm">
            There was an error loading the optimized route. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!routes || routes.length < 2) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Route size={20} />
            <p className="font-medium">No route data available</p>
          </div>
          <p className="text-muted-foreground text-sm">
            This tour doesn't have any optimized routes yet. Optimize the tour to generate route data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapContainer} 
            style={{ width, height }}
            className="rounded-md overflow-hidden"
          />
        </CardContent>
      </Card>
      
      {showRouteDetails && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Route size={18} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Total Distance</p>
                </div>
                <p className="text-2xl font-bold mt-2">{formatDistance(totalDistance)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Travel Time</p>
                </div>
                <p className="text-2xl font-bold mt-2">{formattedTime}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Optimization Score</p>
                </div>
                <div className="flex items-center mt-2">
                  <p className="text-2xl font-bold">{avgScore}</p>
                  <Badge 
                    variant={avgScore > 80 ? "success" : avgScore > 60 ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {avgScore > 80 ? "Excellent" : avgScore > 60 ? "Good" : "Fair"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Route Details</h3>
              <div className="space-y-3">
                {routes.map((route, index) => (
                  <div key={route.id} className="flex items-start border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="bg-muted rounded-full p-2 mr-3">
                      <MapPin size={16} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{route.startVenue?.name}</p>
                          <p className="text-muted-foreground text-sm">{route.startVenue?.city}, {route.startVenue?.region}</p>
                        </div>
                        {route.distanceKm && (
                          <div className="text-right">
                            <p className="font-medium">{formatDistance(route.distanceKm)}</p>
                            <p className="text-muted-foreground text-sm">
                              {Math.floor(route.estimatedTravelTimeMinutes / 60)}h {route.estimatedTravelTimeMinutes % 60}m
                            </p>
                          </div>
                        )}
                      </div>
                      {index < routes.length - 1 && (
                        <div className="flex justify-center my-1">
                          <ArrowRightCircle size={16} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-start">
                  <div className="bg-muted rounded-full p-2 mr-3">
                    <MapPin size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{routes[routes.length - 1].endVenue?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {routes[routes.length - 1].endVenue?.city}, {routes[routes.length - 1].endVenue?.region}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}