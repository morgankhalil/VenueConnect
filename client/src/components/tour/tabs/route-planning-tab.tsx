import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Map as MapIcon,
  List,
  MapPin,
  ArrowRight,
  Clock,
  Building,
  Info,
  ChevronRight,
  ChevronDown,
  Filter,
  CalendarDays
} from 'lucide-react';
import { formatDate, formatDistance, formatCapacity } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface RoutePlanningTabProps {
  venues: any[];
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  showAllVenues: boolean;
  setShowAllVenues: React.Dispatch<React.SetStateAction<boolean>>;
  onVenueClick: (venue: any) => void;
}

export function RoutePlanningTab({
  venues,
  originalSequenceVenues,
  optimizedSequenceVenues,
  showAllVenues,
  setShowAllVenues,
  onVenueClick
}: RoutePlanningTabProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'map'>('timeline');
  const [routeType, setRouteType] = useState<'original' | 'optimized'>('original');
  
  // Use the appropriate venue sequence based on the selected route type
  const displayVenues = routeType === 'original' ? originalSequenceVenues : optimizedSequenceVenues;
  
  // Determine if there's optimized data available
  const hasOptimizedData = optimizedSequenceVenues && optimizedSequenceVenues.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Route Planning Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Route Planning</CardTitle>
              <CardDescription>
                Plan and visualize your tour route
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={showAllVenues ? "" : "border-primary"}
                onClick={() => setShowAllVenues(false)}
              >
                Show Route Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={showAllVenues ? "border-primary" : ""}
                onClick={() => setShowAllVenues(true)}
              >
                Show All Venues
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            {/* View Mode Selection */}
            <Tabs defaultValue="timeline" value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
              <TabsList>
                <TabsTrigger value="timeline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="map">
                  <MapIcon className="h-4 w-4 mr-2" />
                  Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Route Type Selection (if optimized data available) */}
            {hasOptimizedData && (
              <div className="flex items-center gap-2">
                <Button
                  variant={routeType === 'original' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRouteType('original')}
                >
                  Original Route
                </Button>
                <Button
                  variant={routeType === 'optimized' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRouteType('optimized')}
                >
                  Optimized Route
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* View Content */}
      <div>
        {viewMode === 'timeline' && (
          <TimelineView venues={displayVenues} onVenueClick={onVenueClick} />
        )}
        
        {viewMode === 'list' && (
          <ListView venues={displayVenues} onVenueClick={onVenueClick} />
        )}
        
        {viewMode === 'map' && (
          <MapView venues={displayVenues} onVenueClick={onVenueClick} />
        )}
      </div>
    </div>
  );
}

// Timeline view component
function TimelineView({ venues, onVenueClick }: { venues: any[], onVenueClick: (venue: any) => void }) {
  if (!venues || venues.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md">
        <p className="text-muted-foreground">No venues to display</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Tour Timeline</h3>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Confirmed
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700">
            Hold
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Potential
          </Badge>
        </div>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-1 bottom-8 w-0.5 bg-gray-200 z-0" />
        
        <div className="space-y-8">
          {venues.map((venue, index) => (
            <div 
              key={venue.id} 
              className="relative flex gap-4 hover:bg-accent/20 p-2 rounded-md transition-colors cursor-pointer"
              onClick={() => onVenueClick(venue)}
            >
              {/* Timeline dot */}
              <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center
                ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700' : ''}
                ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700' : ''}
                ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
              `}>
                <div className={`w-3 h-3 rounded-full
                  ${venue.status === 'confirmed' ? 'bg-green-600' : ''}
                  ${venue.status === 'potential' ? 'bg-blue-600' : ''}
                  ${venue.status === 'hold' ? 'bg-amber-600' : ''}
                  ${venue.status === 'cancelled' ? 'bg-red-600' : ''}
                `} />
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-lg">{venue.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {venue.city}{venue.region ? `, ${venue.region}` : ''}
                    </p>
                  </div>
                  
                  {venue.date && (
                    <div className="py-1 px-2 rounded-md bg-primary/5 text-sm">
                      <CalendarDays className="inline-block h-3.5 w-3.5 mr-1" />
                      {formatDate(venue.date)}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                  {venue.capacity && (
                    <div className="flex items-center text-muted-foreground">
                      <Building className="h-3.5 w-3.5 mr-1" />
                      {formatCapacity(venue.capacity)} capacity
                    </div>
                  )}
                  
                  {index < venues.length - 1 && venues[index + 1]?.latitude && venue.latitude && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {formatDistance(calculateDistance(venue, venues[index + 1]))} to next venue
                    </div>
                  )}
                </div>
                
                {index < venues.length - 1 && (
                  <div className="ml-1 mt-2">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// List view component
function ListView({ venues, onVenueClick }: { venues: any[], onVenueClick: (venue: any) => void }) {
  if (!venues || venues.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md">
        <p className="text-muted-foreground">No venues to display</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Venue List</h3>
      
      <div className="space-y-4">
        {venues.map((venue, index) => (
          <Card 
            key={venue.id} 
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => onVenueClick(venue)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                    ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700' : ''}
                    ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700' : ''}
                    ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{venue.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {venue.city}{venue.region ? `, ${venue.region}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  {venue.date && (
                    <div className="text-sm">
                      <Calendar className="inline-block h-3.5 w-3.5 mr-1" />
                      {formatDate(venue.date)}
                    </div>
                  )}
                  
                  {index < venues.length - 1 && venues[index + 1]?.latitude && venue.latitude && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <ArrowRight className="inline-block h-3.5 w-3.5 mr-1" />
                      {formatDistance(calculateDistance(venue, venues[index + 1]))} to next
                    </div>
                  )}
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                {venue.capacity && (
                  <div className="flex items-center">
                    <Building className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {formatCapacity(venue.capacity)} capacity
                  </div>
                )}
                
                {venue.status && (
                  <div className="flex items-center">
                    <Info className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {venue.status.charAt(0).toUpperCase() + venue.status.slice(1)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Map view component
function MapView({ venues, onVenueClick }: { venues: any[], onVenueClick: (venue: any) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  
  // Initialize map
  useEffect(() => {
    if (!venues || venues.length === 0 || !mapRef.current) return;
    
    // If map is already initialized, clean it up
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }
    
    // Filter venues with valid coordinates
    const validVenues = venues.filter(venue => venue.latitude && venue.longitude);
    if (validVenues.length === 0) return;
    
    // Initialize map
    const map = L.map(mapRef.current, {
      center: [validVenues[0].latitude, validVenues[0].longitude],
      zoom: 5,
    });
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Add markers for each venue
    const markers: L.Marker[] = [];
    validVenues.forEach((venue, index) => {
      const marker = L.marker([venue.latitude, venue.longitude])
        .addTo(map)
        .bindPopup(`
          <div>
            <strong>${venue.name}</strong><br>
            ${venue.city}${venue.region ? `, ${venue.region}` : ''}<br>
            ${venue.date ? formatDate(venue.date) : 'No date set'}
          </div>
        `);
        
      marker.on('click', () => {
        onVenueClick(venue);
      });
      
      markers.push(marker);
    });
    
    // Draw route line between venues
    if (validVenues.length > 1) {
      const routePoints = validVenues.map(venue => [venue.latitude, venue.longitude]);
      L.polyline(routePoints as L.LatLngExpression[], { color: '#3b82f6', weight: 3 }).addTo(map);
    }
    
    // Fit bounds to all markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
    leafletMap.current = map;
    
    // Cleanup function
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [venues, onVenueClick]);
  
  if (!venues || venues.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md">
        <p className="text-muted-foreground">No venues with coordinates to display</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Tour Map</h3>
      
      <div className="rounded-lg overflow-hidden border" style={{ height: '500px' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Route Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total venues:</span>
                <span>{venues.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total distance:</span>
                <span>{calculateTotalDistance(venues)} km</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start:</span>
                <span>{venues[0]?.city || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End:</span>
                <span>{venues[venues.length - 1]?.city || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Route Line</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-black border border-gray-400" />
                <span>Venue Marker</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-xs">
                  1
                </div>
                <span>Venue Sequence</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for timeline arrows
function ArrowDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  );
}

// Helper function to calculate distance between two venues
function calculateDistance(venue1: any, venue2: any): number {
  if (!venue1?.latitude || !venue1?.longitude || !venue2?.latitude || !venue2?.longitude) {
    return 0;
  }
  
  // Haversine formula
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  
  const lat1 = toRad(venue1.latitude);
  const lon1 = toRad(venue1.longitude);
  const lat2 = toRad(venue2.latitude);
  const lon2 = toRad(venue2.longitude);
  
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Earth's radius in kilometers
  const radius = 6371;
  return radius * c;
}

// Calculate total distance of route
function calculateTotalDistance(venues: any[]): string {
  if (!venues || venues.length <= 1) return "0";
  
  let totalDistance = 0;
  
  for (let i = 0; i < venues.length - 1; i++) {
    totalDistance += calculateDistance(venues[i], venues[i + 1]);
  }
  
  return totalDistance.toFixed(1);
}