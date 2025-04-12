import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { formatDistance, formatTravelTime } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, BarChart } from 'lucide-react';

interface RouteComparisonMapProps {
  originalVenues: any[];
  optimizedVenues?: any[];
  showComparison?: boolean;
  comparisonMode?: 'split' | 'overlay' | 'sideBySide';
  onVenueClick?: (venue: any) => void;
}

export function RouteComparisonMap({
  originalVenues = [],
  optimizedVenues = [],
  showComparison = true,
  comparisonMode = 'overlay',
  onVenueClick
}: RouteComparisonMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  // Initialize from localStorage or from props
  const [viewMode, setViewMode] = useState<'overlay' | 'sideBySide' | 'split'>(() => {
    // If comparisonMode is provided, use it
    if (comparisonMode !== 'overlay') {
      return comparisonMode;
    }
    // Otherwise try to load from localStorage
    const savedMode = localStorage.getItem('routeComparisonMode');
    return (savedMode as 'overlay' | 'sideBySide' | 'split') || 'overlay';
  });
  
  // Update viewMode when comparisonMode prop changes
  useEffect(() => {
    if (comparisonMode !== 'overlay') {
      setViewMode(comparisonMode);
    }
  }, [comparisonMode]);
  
  // Save to localStorage when changed (only if not controlled by parent)
  useEffect(() => {
    if (!comparisonMode || comparisonMode === 'overlay') {
      localStorage.setItem('routeComparisonMode', viewMode);
    }
  }, [viewMode, comparisonMode]);
  
  // Filter out venues without coordinates
  const originalVenuesWithCoords = originalVenues.filter(venue => 
    venue.venue?.latitude && venue.venue?.longitude
  );
  
  const optimizedVenuesWithCoords = optimizedVenues.filter(venue => 
    venue.venue?.latitude && venue.venue?.longitude
  );
  
  // Automatically update map bounds when venues change
  const MapBoundsUpdater = () => {
    const map = useMap();
    mapRef.current = map;
    
    useEffect(() => {
      // Create combined collection of all venues to calculate bounds
      const allVenues = [...originalVenuesWithCoords];
      
      if (showComparison && optimizedVenuesWithCoords.length > 0) {
        allVenues.push(...optimizedVenuesWithCoords);
      }
      
      if (allVenues.length === 0) return;
      
      const bounds = new L.LatLngBounds([]);
      allVenues.forEach(venue => {
        if (venue.venue?.latitude && venue.venue?.longitude) {
          bounds.extend(new L.LatLng(venue.venue.latitude, venue.venue.longitude));
        }
      });
      
      map.fitBounds(bounds, { padding: [40, 40] });
    }, [originalVenuesWithCoords, optimizedVenuesWithCoords, showComparison]);
    
    return null;
  };
  
  // Create original route line points
  const originalRoutePoints = originalVenuesWithCoords.map(venue => [
    venue.venue.latitude, 
    venue.venue.longitude
  ]);
  
  // Create optimized route line points
  const optimizedRoutePoints = optimizedVenuesWithCoords.map(venue => [
    venue.venue.latitude, 
    venue.venue.longitude
  ]);
  
  // Calculate total distance for a route
  const calculateTotalDistance = (venues: any[]): number => {
    let totalDistance = 0;
    
    for (let i = 0; i < venues.length - 1; i++) {
      const current = venues[i];
      const next = venues[i + 1];
      
      if (current.venue?.latitude && current.venue?.longitude && 
          next.venue?.latitude && next.venue?.longitude) {
        totalDistance += calculateDistance(
          current.venue.latitude,
          current.venue.longitude,
          next.venue.latitude,
          next.venue.longitude
        );
      }
    }
    
    return totalDistance;
  };
  
  // Simple distance calculation function using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };
  
  // Helper for distance calculation
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };
  
  // Calculate improvement percentage
  const distanceImprovement = (() => {
    const originalDistance = calculateTotalDistance(originalVenuesWithCoords);
    const optimizedDistance = calculateTotalDistance(optimizedVenuesWithCoords);
    
    if (originalDistance === 0 || optimizedDistance === 0) return 0;
    
    return Math.round(((originalDistance - optimizedDistance) / originalDistance) * 100);
  })();
  
  // Create custom marker icons
  const createMarkerIcon = (index: number, isOptimized: boolean) => {
    return L.divIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${isOptimized ? '#8b5cf6' : '#3b82f6'};
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
  
  if (originalVenuesWithCoords.length === 0) {
    return (
      <div className="border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No venues with coordinates found</p>
          <p className="text-xs text-muted-foreground mt-1">Add venue locations to see the route comparison</p>
        </div>
      </div>
    );
  }
  
  // Create a single map view with overlay or just the original route
  const renderOverlayMap = () => {
    return (
      <div className="border rounded-lg h-[400px] overflow-hidden">
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
          
          {/* Auto-fit bounds */}
          <MapBoundsUpdater />
          
          {/* Original route path */}
          {originalRoutePoints.length > 1 && (
            <Polyline 
              positions={originalRoutePoints as any} 
              pathOptions={{ 
                color: '#3b82f6', 
                weight: 3,
                opacity: 0.8,
                dashArray: showComparison ? '5, 5' : undefined
              }} 
            />
          )}
          
          {/* Optimized route path */}
          {showComparison && optimizedRoutePoints.length > 1 && (
            <Polyline 
              positions={optimizedRoutePoints as any} 
              pathOptions={{ 
                color: '#8b5cf6', 
                weight: 4,
                opacity: 0.8
              }} 
            />
          )}
          
          {/* Original venue markers */}
          {originalVenuesWithCoords.map((venue, index) => (
            <Marker 
              key={`original-${venue.id}`}
              position={[venue.venue.latitude, venue.venue.longitude]}
              icon={createMarkerIcon(index, false)}
              eventHandlers={{
                click: () => onVenueClick && onVenueClick(venue)
              }}
            >
              <Popup>
                <div className="font-sans">
                  <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                  <div className="text-sm mb-1">
                    {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {venue.tourVenue?.date 
                      ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        }) 
                      : 'Date TBD'} · Stop #{index + 1}
                  </div>
                  <div className="mt-1 text-xs font-medium text-blue-600">
                    Original Route
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Optimized venue markers - only show if comparison is enabled */}
          {showComparison && optimizedVenuesWithCoords.map((venue, index) => (
            <Marker 
              key={`optimized-${venue.id}`}
              position={[venue.venue.latitude, venue.venue.longitude]}
              icon={createMarkerIcon(index, true)}
              eventHandlers={{
                click: () => onVenueClick && onVenueClick(venue)
              }}
              opacity={0.9}
            >
              <Popup>
                <div className="font-sans">
                  <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                  <div className="text-sm mb-1">
                    {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {venue.tourVenue?.date 
                      ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        }) 
                      : 'Date TBD'} · Stop #{index + 1}
                  </div>
                  <div className="mt-1 text-xs font-medium text-purple-600">
                    Optimized Route
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  };

  // Create side-by-side maps for original and optimized routes
  const renderSideBySideMaps = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Route Map */}
        <div className="border rounded-lg h-[400px] overflow-hidden">
          <div className="bg-blue-50 py-1 px-2 text-xs font-medium text-blue-700 flex items-center justify-center">
            Original Route: {formatDistance(calculateTotalDistance(originalVenuesWithCoords))}
          </div>
          <div className="h-[372px]">
            <MapContainer
              center={[39.5, -98.0]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBoundsUpdater />
              
              {originalRoutePoints.length > 1 && (
                <Polyline 
                  positions={originalRoutePoints as any} 
                  pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.8 }} 
                />
              )}
              
              {originalVenuesWithCoords.map((venue, index) => (
                <Marker 
                  key={`original-${venue.id}`}
                  position={[venue.venue.latitude, venue.venue.longitude]}
                  icon={createMarkerIcon(index, false)}
                  eventHandlers={{
                    click: () => onVenueClick && onVenueClick(venue)
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                      <div className="text-sm mb-1">
                        {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {venue.tourVenue?.date 
                          ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            }) 
                          : 'Date TBD'} · Stop #{index + 1}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
        
        {/* Optimized Route Map */}
        <div className="border rounded-lg h-[400px] overflow-hidden">
          <div className="bg-purple-50 py-1 px-2 text-xs font-medium text-purple-700 flex items-center justify-between">
            <span>Optimized Route: {formatDistance(calculateTotalDistance(optimizedVenuesWithCoords))}</span>
            {distanceImprovement > 0 && (
              <Badge className="bg-green-100 hover:bg-green-100 text-green-700 ml-1">
                <Sparkles className="h-3 w-3 mr-1" />
                {distanceImprovement}% Improvement
              </Badge>
            )}
          </div>
          <div className="h-[372px]">
            <MapContainer
              center={[39.5, -98.0]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBoundsUpdater />
              
              {optimizedRoutePoints.length > 1 && (
                <Polyline 
                  positions={optimizedRoutePoints as any} 
                  pathOptions={{ color: '#8b5cf6', weight: 4, opacity: 0.8 }} 
                />
              )}
              
              {optimizedVenuesWithCoords.map((venue, index) => (
                <Marker 
                  key={`optimized-${venue.id}`}
                  position={[venue.venue.latitude, venue.venue.longitude]}
                  icon={createMarkerIcon(index, true)}
                  eventHandlers={{
                    click: () => onVenueClick && onVenueClick(venue)
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                      <div className="text-sm mb-1">
                        {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {venue.tourVenue?.date 
                          ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            }) 
                          : 'Date TBD'} · Stop #{index + 1}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    );
  };
  
  // Create a tabbed view to switch between original and optimized
  const renderSplitView = () => {
    return (
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="original">Original Route</TabsTrigger>
          <TabsTrigger value="optimized">Optimized Route</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="original" className="mt-2">
          <div className="border rounded-lg h-[400px] overflow-hidden">
            <MapContainer
              center={[39.5, -98.0]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBoundsUpdater />
              
              {originalRoutePoints.length > 1 && (
                <Polyline 
                  positions={originalRoutePoints as any} 
                  pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.8 }} 
                />
              )}
              
              {originalVenuesWithCoords.map((venue, index) => (
                <Marker 
                  key={`original-${venue.id}`}
                  position={[venue.venue.latitude, venue.venue.longitude]}
                  icon={createMarkerIcon(index, false)}
                  eventHandlers={{
                    click: () => onVenueClick && onVenueClick(venue)
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                      <div className="text-sm mb-1">
                        {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {venue.tourVenue?.date 
                          ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            }) 
                          : 'Date TBD'} · Stop #{index + 1}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="mt-2 flex justify-center items-center">
            <span className="text-sm text-muted-foreground">
              Total Distance: {formatDistance(calculateTotalDistance(originalVenuesWithCoords))}
            </span>
          </div>
        </TabsContent>
        
        <TabsContent value="optimized" className="mt-2">
          <div className="border rounded-lg h-[400px] overflow-hidden">
            <MapContainer
              center={[39.5, -98.0]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBoundsUpdater />
              
              {optimizedRoutePoints.length > 1 && (
                <Polyline 
                  positions={optimizedRoutePoints as any} 
                  pathOptions={{ color: '#8b5cf6', weight: 4, opacity: 0.8 }} 
                />
              )}
              
              {optimizedVenuesWithCoords.map((venue, index) => (
                <Marker 
                  key={`optimized-${venue.id}`}
                  position={[venue.venue.latitude, venue.venue.longitude]}
                  icon={createMarkerIcon(index, true)}
                  eventHandlers={{
                    click: () => onVenueClick && onVenueClick(venue)
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
                      <div className="text-sm mb-1">
                        {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {venue.tourVenue?.date 
                          ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            }) 
                          : 'Date TBD'} · Stop #{index + 1}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="mt-2 flex justify-center items-center">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">
                Total Distance: {formatDistance(calculateTotalDistance(optimizedVenuesWithCoords))}
              </span>
              {distanceImprovement > 0 && (
                <Badge className="bg-green-100 hover:bg-green-100 text-green-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {distanceImprovement}% Improvement
                </Badge>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="comparison" className="mt-2">
          {renderOverlayMap()}
          <div className="mt-2 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                <span className="text-sm">Original: {formatDistance(calculateTotalDistance(originalVenuesWithCoords))}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
                <span className="text-sm">Optimized: {formatDistance(calculateTotalDistance(optimizedVenuesWithCoords))}</span>
              </div>
            </div>
            {distanceImprovement > 0 && (
              <Badge className="bg-green-100 hover:bg-green-100 text-green-700">
                <Sparkles className="h-3 w-3 mr-1" />
                {distanceImprovement}% Improvement
              </Badge>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="space-y-4">
      {/* Comparison stats */}
      {showComparison && optimizedVenuesWithCoords.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="font-medium">Original Route:</span>
              </div>
              <span>{formatDistance(calculateTotalDistance(originalVenuesWithCoords))}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                <span className="font-medium">Optimized Route:</span>
              </div>
              <div className="flex items-center">
                <span>{formatDistance(calculateTotalDistance(optimizedVenuesWithCoords))}</span>
                {distanceImprovement > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    -{distanceImprovement}%
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* View mode controls - show only in component, hide when parent is controlling */}
          {!comparisonMode && (
            <div className="flex justify-end space-x-2">
              <TabsList className="h-8">
                <TabsTrigger 
                  value="overlay" 
                  className={`h-8 px-3 data-[state=active]:bg-muted ${viewMode === 'overlay' ? 'data-[state=active]:text-foreground' : ''}`}
                  onClick={() => setViewMode('overlay')}
                  data-state={viewMode === 'overlay' ? 'active' : 'inactive'}
                >
                  Overlay
                </TabsTrigger>
                <TabsTrigger 
                  value="sideBySide" 
                  className={`h-8 px-3 data-[state=active]:bg-muted ${viewMode === 'sideBySide' ? 'data-[state=active]:text-foreground' : ''}`}
                  onClick={() => setViewMode('sideBySide')}
                  data-state={viewMode === 'sideBySide' ? 'active' : 'inactive'}
                >
                  Side by Side
                </TabsTrigger>
                <TabsTrigger 
                  value="split" 
                  className={`h-8 px-3 data-[state=active]:bg-muted ${viewMode === 'split' ? 'data-[state=active]:text-foreground' : ''}`}
                  onClick={() => setViewMode('split')}
                  data-state={viewMode === 'split' ? 'active' : 'inactive'}
                >
                  Split View
                </TabsTrigger>
              </TabsList>
            </div>
          )}
        </div>
      )}
      
      {/* Map container based on view mode */}
      {!showComparison || optimizedVenuesWithCoords.length === 0 ? (
        renderOverlayMap()
      ) : viewMode === 'overlay' ? (
        renderOverlayMap()
      ) : viewMode === 'sideBySide' ? (
        renderSideBySideMaps()
      ) : (
        renderSplitView()
      )}
    </div>
  );
}