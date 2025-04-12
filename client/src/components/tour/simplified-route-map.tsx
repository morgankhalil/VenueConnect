import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { formatDistance } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface SimplifiedRouteMapProps {
  originalVenues: any[];
  optimizedVenues?: any[];
  onVenueClick?: (venue: any) => void;
}

export function SimplifiedRouteMap({
  originalVenues = [],
  optimizedVenues = [],
  onVenueClick
}: SimplifiedRouteMapProps) {
  const [showOptimized, setShowOptimized] = useState(true);
  
  // Filter out venues without coordinates
  const originalVenuesWithCoords = originalVenues.filter(venue => 
    venue.venue?.latitude && venue.venue?.longitude
  );
  
  const optimizedVenuesWithCoords = optimizedVenues.filter(venue => 
    venue.venue?.latitude && venue.venue?.longitude
  );
  
  // Automatically update map bounds
  const MapBoundsUpdater = () => {
    const map = useMap();
    
    useEffect(() => {
      // Create combined collection of all venues to calculate bounds
      const allVenues = [...originalVenuesWithCoords];
      
      if (showOptimized && optimizedVenuesWithCoords.length > 0) {
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
    }, [originalVenuesWithCoords, optimizedVenuesWithCoords, showOptimized]);
    
    return null;
  };
  
  // Create route points
  const originalRoutePoints = originalVenuesWithCoords.map(venue => [
    venue.venue.latitude, 
    venue.venue.longitude
  ]);
  
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
  
  // Distance calculation (Haversine formula)
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
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };
  
  // Calculate improvement percentage
  const originalDistance = calculateTotalDistance(originalVenuesWithCoords);
  const optimizedDistance = calculateTotalDistance(optimizedVenuesWithCoords);
  const distanceImprovement = (() => {
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
      <Card>
        <CardContent className="pt-6">
          <div className="border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
            <div className="text-center">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground font-medium">No venues with coordinates found</p>
              <p className="text-xs text-muted-foreground mt-1">Add venue locations to see the route map</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="pt-6">
        {/* Route metrics and controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                <span className="text-sm">Original: {formatDistance(originalDistance)}</span>
              </div>
              
              {optimizedVenuesWithCoords.length > 0 && showOptimized && (
                <>
                  <div className="text-gray-400 mx-1">→</div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
                    <span className="text-sm">Optimized: {formatDistance(optimizedDistance)}</span>
                  </div>
                  
                  {distanceImprovement > 0 && (
                    <Badge className="bg-green-100 hover:bg-green-100 text-green-700 ml-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {distanceImprovement}% Better
                    </Badge>
                  )}
                </>
              )}
            </div>
            
            {optimizedVenuesWithCoords.length > 0 && !showOptimized && (
              <div className="text-sm text-muted-foreground italic">
                Toggle the switch to see the optimized route
              </div>
            )}
          </div>
          
          {optimizedVenuesWithCoords.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-optimized"
                checked={showOptimized}
                onCheckedChange={setShowOptimized}
              />
              <Label htmlFor="show-optimized" className="text-sm font-medium cursor-pointer">
                Show optimized route
              </Label>
            </div>
          )}
        </div>
        
        {/* Map */}
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
                  weight: (showOptimized && optimizedVenuesWithCoords.length > 0) ? 3 : 4,
                  opacity: 0.8,
                  dashArray: (showOptimized && optimizedVenuesWithCoords.length > 0) ? '5, 5' : undefined
                }} 
              />
            )}
            
            {/* Optimized route path */}
            {showOptimized && optimizedRoutePoints.length > 1 && (
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
            
            {/* Optimized venue markers */}
            {showOptimized && optimizedVenuesWithCoords.map((venue, index) => (
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
      </CardContent>
    </Card>
  );
}