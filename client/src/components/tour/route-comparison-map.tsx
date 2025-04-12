import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Route, 
  ArrowRightLeft,
  Layers
} from 'lucide-react';
import { formatDate, formatDistance } from '@/lib/utils';

interface RouteComparisonMapProps {
  originalVenues: any[];
  optimizedVenues?: any[];
  showComparison?: boolean;
  onVenueClick?: (venue: any) => void;
}

export function RouteComparisonMap({
  originalVenues,
  optimizedVenues = [],
  showComparison = false,
  onVenueClick = () => {}
}: RouteComparisonMapProps) {
  const [viewMode, setViewMode] = useState<'original' | 'optimized' | 'comparison'>(
    optimizedVenues.length > 0 ? 'comparison' : 'original'
  );
  
  // Filter out venues without coordinates
  const originalWithCoords = originalVenues.filter(
    venue => venue.venue?.latitude && venue.venue?.longitude
  );
  
  const optimizedWithCoords = optimizedVenues.filter(
    venue => venue.venue?.latitude && venue.venue?.longitude
  );
  
  // If no venues have coordinates, show a placeholder
  if (originalWithCoords.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg h-[400px] bg-muted/30 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No venues with coordinates found</p>
            <p className="text-xs text-muted-foreground mt-1">Add venue locations to see the map</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Create markers for each venue
  const createMarkers = (venues: any[], isOptimized = false) => {
    return venues.map((venue, index) => {
      // Define custom marker icon based on venue status and whether it's optimized
      const getMarkerColor = (status: string | undefined, isOptimized: boolean) => {
        if (isOptimized) {
          return '#8B5CF6'; // Purple for optimized route
        }
        
        switch (status) {
          case 'confirmed': return '#10B981'; // Green
          case 'hold': return '#F59E0B'; // Amber
          case 'potential': return '#3B82F6'; // Blue
          case 'cancelled': return '#EF4444'; // Red
          default: return '#6B7280'; // Gray
        }
      };
      
      // Create custom icon
      const customIcon = L.divIcon({
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: ${getMarkerColor(venue.tourVenue?.status, isOptimized)};
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
      
      return (
        <Marker 
          key={`${venue.id}-${isOptimized ? 'opt' : 'orig'}`}
          position={[venue.venue.latitude, venue.venue.longitude]}
          icon={customIcon}
          eventHandlers={{
            click: () => onVenueClick(venue)
          }}
        >
          <Popup>
            <div className="font-sans">
              <div className="font-semibold text-base mb-1">{venue.venue?.name}</div>
              <div className="text-sm mb-1">
                {venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {venue.tourVenue?.date 
                  ? new Date(venue.tourVenue?.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    }) 
                  : 'Date TBD'} · {isOptimized ? 'Optimized ' : ''}Stop #{index + 1}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  };
  
  // Create polylines for routes
  const createPolyline = (venues: any[], isOptimized = false) => {
    if (venues.length < 2) return null;
    
    const routePoints = venues.map(venue => [
      venue.venue.latitude, 
      venue.venue.longitude
    ]);
    
    return (
      <Polyline 
        positions={routePoints as any} 
        pathOptions={{ 
          color: isOptimized ? '#8B5CF6' : '#3B82F6', // Purple for optimized, blue for original
          weight: 3,
          opacity: 0.8,
          dashArray: isOptimized ? undefined : '5, 10'
        }} 
      />
    );
  };
  
  // Calculate bounds for auto-fitting map
  const MapBoundsUpdater = () => {
    const map = useMap();
    
    React.useEffect(() => {
      const bounds = new L.LatLngBounds([]);
      
      // Add original venues to bounds
      if ((viewMode === 'original' || viewMode === 'comparison') && originalWithCoords.length > 0) {
        originalWithCoords.forEach(venue => {
          bounds.extend(new L.LatLng(venue.venue.latitude, venue.venue.longitude));
        });
      }
      
      // Add optimized venues to bounds if available
      if ((viewMode === 'optimized' || viewMode === 'comparison') && optimizedWithCoords.length > 0) {
        optimizedWithCoords.forEach(venue => {
          bounds.extend(new L.LatLng(venue.venue.latitude, venue.venue.longitude));
        });
      }
      
      // If bounds are valid, fit map to them
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [viewMode]);
    
    return null;
  };
  
  // Determine which markers and routes to display
  const renderMarkers = () => {
    switch (viewMode) {
      case 'original':
        return createMarkers(originalWithCoords, false);
      case 'optimized':
        return optimizedWithCoords.length > 0 
          ? createMarkers(optimizedWithCoords, true)
          : createMarkers(originalWithCoords, false);
      case 'comparison':
        return [
          ...createMarkers(originalWithCoords, false),
          ...(optimizedWithCoords.length > 0 ? createMarkers(optimizedWithCoords, true) : [])
        ];
    }
  };
  
  const renderRoutes = () => {
    switch (viewMode) {
      case 'original':
        return createPolyline(originalWithCoords, false);
      case 'optimized':
        return optimizedWithCoords.length > 0 
          ? createPolyline(optimizedWithCoords, true)
          : createPolyline(originalWithCoords, false);
      case 'comparison':
        return [
          createPolyline(originalWithCoords, false),
          optimizedWithCoords.length > 0 ? createPolyline(optimizedWithCoords, true) : null
        ];
    }
  };
  
  // Change view controls only if optimized route is available
  const renderViewControls = () => {
    if (optimizedWithCoords.length === 0) return null;
    
    return (
      <div className="absolute top-3 right-3 z-[1000] bg-white p-2 rounded-md shadow-md">
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant={viewMode === 'original' ? 'default' : 'outline'}
            onClick={() => setViewMode('original')}
          >
            Original
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'optimized' ? 'default' : 'outline'}
            onClick={() => setViewMode('optimized')}
          >
            Optimized
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'comparison' ? 'default' : 'outline'}
            onClick={() => setViewMode('comparison')}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Compare
          </Button>
        </div>
      </div>
    );
  };
  
  // Render legend if comparison view is active
  const renderLegend = () => {
    if (viewMode !== 'comparison' || optimizedWithCoords.length === 0) return null;
    
    return (
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 p-2 rounded-md shadow-md">
        <div className="text-xs font-medium mb-1">Route Legend</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
            <span className="text-xs">Original Route</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
            <span className="text-xs">Optimized Route</span>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="border rounded-lg h-[400px] overflow-hidden relative">
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
          
          {/* Route paths */}
          {renderRoutes()}
          
          {/* Venue markers */}
          {renderMarkers()}
        </MapContainer>
        
        {/* View controls */}
        {renderViewControls()}
        
        {/* Legend */}
        {renderLegend()}
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        {viewMode === 'original' || viewMode === 'comparison' ? (
          <div className="text-xs flex items-center px-2 py-1 bg-[#3B82F6]/10 rounded text-[#3B82F6] border border-[#3B82F6]/20">
            <Route className="h-3 w-3 mr-1" />
            Original: {formatDistance(calculateTotalDistance(originalWithCoords))}
          </div>
        ) : null}
        
        {(viewMode === 'optimized' || viewMode === 'comparison') && optimizedWithCoords.length > 0 ? (
          <div className="text-xs flex items-center px-2 py-1 bg-[#8B5CF6]/10 rounded text-[#8B5CF6] border border-[#8B5CF6]/20">
            <Route className="h-3 w-3 mr-1" />
            Optimized: {formatDistance(calculateTotalDistance(optimizedWithCoords))}
          </div>
        ) : null}
        
        {viewMode === 'comparison' && optimizedWithCoords.length > 0 ? (
          <div className="text-xs flex items-center px-2 py-1 bg-green-100 rounded text-green-700 border border-green-200">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Savings: {formatDistance(calculateTotalDistance(originalWithCoords) - calculateTotalDistance(optimizedWithCoords))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Helper function to calculate total distance of a route
function calculateTotalDistance(venues: any[]): number {
  if (venues.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < venues.length - 1; i++) {
    const venue1 = venues[i];
    const venue2 = venues[i + 1];
    
    totalDistance += calculateDistance(
      venue1.venue.latitude,
      venue1.venue.longitude,
      venue2.venue.latitude,
      venue2.venue.longitude
    );
  }
  
  return totalDistance;
}

// Simple distance calculation function (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}