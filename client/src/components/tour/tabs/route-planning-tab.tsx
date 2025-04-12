import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  MapPin,
  Calendar,
  Route,
  AlertTriangle,
  InfoIcon,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
  BarChart,
  Sparkles,
  CalendarClock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

import { SimplifiedRouteMap } from '../simplified-route-map';
import { useOptimizeTour } from '@/hooks/use-optimize-tour';
import { useToast } from '@/hooks/use-toast';

interface RoutePlanningTabProps {
  tourId: number;
  tourData: any;
  venues: any[];
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  showAllVenues: boolean;
  setShowAllVenues: React.Dispatch<React.SetStateAction<boolean>>;
  onVenueClick: (venue: any) => void;
  onApplyOptimization: () => void;
  refetch: () => void;
}

export function RoutePlanningTab({
  tourId,
  tourData,
  venues,
  originalSequenceVenues,
  optimizedSequenceVenues,
  showAllVenues,
  setShowAllVenues,
  onVenueClick,
  onApplyOptimization,
  refetch,
}: RoutePlanningTabProps) {
  const [isOptimizationOpen, setIsOptimizationOpen] = useState(false);
  const [showOptimizedRoute, setShowOptimizedRoute] = useState(false);
  
  // If optimized sequence is available, enable the optimized route view toggle
  useEffect(() => {
    if (optimizedSequenceVenues.length > 0) {
      setShowOptimizedRoute(true);
    }
  }, [optimizedSequenceVenues]);
  // Combined view of map and timeline

  // Get the confirmed and potential venues
  const confirmedVenues = venues?.filter(v => v.tourVenue?.status === 'confirmed') || [];
  const potentialVenues = venues?.filter(v => v.tourVenue?.status === 'potential' || v.tourVenue?.status === 'hold') || [];
  
  // Render status badge
  const renderStatusBadge = (status: string | undefined) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Confirmed
          </Badge>
        );
      case 'hold':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
            <Clock4 className="h-3.5 w-3.5 mr-1" />
            Hold
          </Badge>
        );
      case 'potential':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Potential
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Timeline display component
  const TimelineView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div className="space-y-4">
        {sequence.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-muted">
            {sequence.map((venue, index) => (
              <div key={venue.id} className="mb-8 relative">
                {/* Timeline marker */}
                <div className={`absolute -left-[19px] p-1.5 rounded-full ${venue.tourVenue?.status === 'confirmed' ? 'bg-green-500' : venue.tourVenue?.status === 'hold' ? 'bg-amber-500' : venue.tourVenue?.status === 'potential' ? 'bg-blue-500' : 'bg-muted'}`}></div>
                
                {/* Date indicator */}
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {venue.tourVenue?.date ? formatDate(venue.tourVenue.date) : 'Date TBD'}
                </div>
                
                {/* Venue card */}
                <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => onVenueClick(venue)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-base">{venue.venue?.name}</h3>
                        <p className="text-sm text-muted-foreground">{venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}</p>
                      </div>
                      <div>
                        {renderStatusBadge(venue.tourVenue?.status)}
                      </div>
                    </div>
                    
                    {index < sequence.length - 1 && sequence[index + 1].tourVenue?.date && venue.tourVenue?.date && (
                      <div className="mt-3 pt-3 border-t text-sm flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{Math.ceil((new Date(sequence[index + 1].tourVenue.date).getTime() - new Date(venue.tourVenue.date).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                        </div>
                        
                        {venue.venue?.longitude && venue.venue?.latitude && sequence[index + 1].venue?.longitude && sequence[index + 1].venue?.latitude && (
                          <div className="flex items-center">
                            <Route className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDistance(calculateDistance(
                              venue.venue.latitude, 
                              venue.venue.longitude, 
                              sequence[index + 1].venue.latitude, 
                              sequence[index + 1].venue.longitude
                            ))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    );
  };
  
  // List display component
  const ListView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div className="space-y-4">
        {sequence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sequence.map((venue, index) => (
              <Card key={venue.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => onVenueClick(venue)}>
                <CardHeader className="py-3 px-4">
                  <div className="flex justify-between items-center">
                    <div className="font-medium flex items-center">
                      <span className="bg-muted w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs">{index + 1}</span>
                      {venue.venue?.name}
                    </div>
                    {renderStatusBadge(venue.tourVenue?.status)}
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{venue.tourVenue?.date ? formatDate(venue.tourVenue.date) : 'Date TBD'}</span>
                    </div>
                    
                    {index < sequence.length - 1 && venue.venue?.longitude && venue.venue?.latitude && sequence[index + 1].venue?.longitude && sequence[index + 1].venue?.latitude && (
                      <div className="flex items-center col-span-2 mt-1 pt-1 border-t">
                        <ArrowRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistance(calculateDistance(
                            venue.venue.latitude, 
                            venue.venue.longitude, 
                            sequence[index + 1].venue.latitude, 
                            sequence[index + 1].venue.longitude
                          ))} to next venue
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    );
  };
  
  // Map view component using Leaflet
  const MapView = ({ sequence }: { sequence: any[] }) => {
    // Filter out venues without coordinates
    const venuesWithCoords = sequence.filter(venue => 
      venue.venue?.latitude && venue.venue?.longitude
    );
    
    // If no venues have coordinates, show a placeholder
    if (venuesWithCoords.length === 0) {
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
    const markers = venuesWithCoords.map((venue, index) => {
      // Define custom marker icon based on venue status
      const getMarkerColor = (status: string | undefined) => {
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
            background-color: ${getMarkerColor(venue.tourVenue?.status)};
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
          key={venue.id} 
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
                  : 'Date TBD'} · Stop #{index + 1}
              </div>
              <div className="mt-2">
                {renderStatusBadge(venue.tourVenue?.status)}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
    
    // Create polyline for route
    const routePoints = venuesWithCoords.map(venue => [
      venue.venue.latitude, 
      venue.venue.longitude
    ]);
    
    // Calculate bounds for auto-fitting map
    const MapBoundsUpdater = () => {
      const map = useMap();
      
      React.useEffect(() => {
        if (venuesWithCoords.length === 0) return;
        
        const bounds = new L.LatLngBounds([]);
        venuesWithCoords.forEach(venue => {
          bounds.extend(new L.LatLng(venue.venue.latitude, venue.venue.longitude));
        });
        
        map.fitBounds(bounds, { padding: [50, 50] });
      }, []);
      
      return null;
    };
    
    return (
      <div className="space-y-4">
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
            
            {/* Venue markers */}
            {markers}
            
            {/* Route path */}
            {venuesWithCoords.length > 1 && (
              <Polyline 
                positions={routePoints as any} 
                pathOptions={{ 
                  color: '#3B82F6', 
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '5, 10'
                }} 
              />
            )}
          </MapContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {sequence.map((venue, index) => (
            <Button 
              key={venue.id} 
              variant="outline" 
              className="justify-start" 
              onClick={() => onVenueClick(venue)}
            >
              <span className="bg-muted w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs font-normal">{index + 1}</span>
              <span className="truncate">{venue.venue?.name}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Simple distance calculation function
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
  
  // Set up our optimization hook
  const { 
    optimize, 
    applyOptimization, 
    isOptimizing, 
    error: optimizationError, 
    optimizationResult, 
    resetOptimization 
  } = useOptimizeTour(tourId);
  
  // Optimization options
  const [optimizationOptions, setOptimizationOptions] = useState({
    // Unified options - no distinction between standard/AI for user
    prioritizeDistance: true,
    distanceWeight: 0.7,
    optimizeForCapacity: true,
    respectGenre: true,
    includeMarketConsiderations: true,
    preserveConfirmedDates: true,
  });
  
  // Unified optimization function
  const handleOptimizeTour = async () => {
    // Get the optimization mode based on if advanced factors are selected
    const useAdvancedFactors = 
      optimizationOptions.optimizeForCapacity || 
      optimizationOptions.respectGenre || 
      optimizationOptions.includeMarketConsiderations;
    
    let result;
    
    if (useAdvancedFactors) {
      // Use AI optimization if any advanced factors are selected
      result = await optimize({
        type: 'ai',
        options: {
          optimizeForCapacity: optimizationOptions.optimizeForCapacity,
          respectGenre: optimizationOptions.respectGenre,
          includeMarketConsiderations: optimizationOptions.includeMarketConsiderations,
          preserveConfirmedDates: optimizationOptions.preserveConfirmedDates
        }
      });
    } else {
      // Use standard optimization for distance-only optimization
      result = await optimize({
        type: 'standard',
        options: {
          prioritizeDistance: optimizationOptions.prioritizeDistance,
          distanceWeight: optimizationOptions.distanceWeight,
          preserveConfirmedDates: optimizationOptions.preserveConfirmedDates,
          optimizeFor: 'balanced'
        }
      });
    }
    
    if (result) {
      // Auto-show optimized route when result is received
      setShowOptimizedRoute(true);
    }
  };
  
  // Handle applying optimization
  const handleApplyOptimization = async () => {
    if (!optimizationResult?.optimizedSequence) return;
    
    const suggestedDates = optimizationResult.suggestedDates || {};
    await applyOptimization(optimizationResult.optimizedSequence, suggestedDates);
    onApplyOptimization();
    resetOptimization();
  };
  
  // Toast for notifications
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Main Map View - New single map design */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Route Planning</CardTitle>
              <CardDescription>
                Plan and optimize your tour route
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              {optimizedSequenceVenues.length > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-optimized"
                    checked={showOptimizedRoute}
                    onCheckedChange={(checked) => {
                      setShowOptimizedRoute(checked);
                    }}
                  />
                  <Label htmlFor="show-optimized" className="text-sm font-medium">
                    Show optimized route
                  </Label>
                </div>
              )}
              
              <Button 
                variant={isOptimizationOpen ? "secondary" : "default"}
                onClick={() => setIsOptimizationOpen(!isOptimizationOpen)}
                className="flex items-center gap-1"
              >
                {isOptimizationOpen ? (
                  <>Hide optimization</>
                ) : (
                  <>
                    {tourData?.optimizationScore > 70 ? (
                      <><CheckCircle2 className="h-4 w-4 mr-1" /> Optimize</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1" /> Optimize Route</>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Route Map - The main visualization */}
          <div className="h-[400px] relative">
            <SimplifiedRouteMap 
              originalVenues={originalSequenceVenues}
              optimizedVenues={optimizedSequenceVenues}
              onVenueClick={onVenueClick}
              showOptimized={showOptimizedRoute}
            />
          </div>
          
          {/* Optimization Controls - Only shown when open */}
          <Collapsible
            open={isOptimizationOpen}
            onOpenChange={setIsOptimizationOpen}
            className="mb-6"
          >
            <CollapsibleContent className="space-y-4">
              <OptimizationPanel 
                tourId={tourId}
                venues={venues}
                tourData={tourData}
                onApplyOptimization={onApplyOptimization}
                refetch={refetch}
              />
            </CollapsibleContent>
          </Collapsible>
          
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Map + Stats */}
            <div className="lg:col-span-8 space-y-4">
              {/* Route map showing both original and optimized routes */}
              <SimplifiedRouteMap
                originalVenues={originalSequenceVenues}
                optimizedVenues={showOptimizedRoute ? optimizedSequenceVenues : []}
                onVenueClick={onVenueClick}
              />
              
              {/* Stats section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Total Venues</h3>
                    <p className="text-muted-foreground text-sm">{venues?.length || 0} venues ({venues?.filter(v => v.tourVenue?.status === 'confirmed')?.length || 0} confirmed)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Route className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Route Coverage</h3>
                    <p className="text-muted-foreground text-sm">
                      {venues?.filter(v => v.venue?.longitude && v.venue?.latitude)?.length || 0} venues with coordinates
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-all-venues"
                      checked={showAllVenues}
                      onCheckedChange={setShowAllVenues}
                    />
                    <label htmlFor="show-all-venues" className="text-sm cursor-pointer">
                      Show all venues
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column: Route Timeline + Optimization Controls */}
            <div className="lg:col-span-4">
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                </TabsList>
                
                <TabsContent value="timeline" className="mt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center justify-between">
                    <span>
                      {showOptimizedRoute && optimizedSequenceVenues.length > 0 
                        ? 'Optimized Timeline' 
                        : 'Current Timeline'}
                    </span>
                    
                    {optimizedSequenceVenues.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="show-optimized"
                          checked={showOptimizedRoute}
                          onCheckedChange={setShowOptimizedRoute}
                        />
                        <Label htmlFor="show-optimized" className="text-xs font-medium">
                          Show optimized 
                        </Label>
                      </div>
                    )}
                  </h3>
                  
                  <div className="overflow-auto max-h-[550px]">
                    <TimelineView 
                      sequence={
                        showOptimizedRoute && optimizedSequenceVenues.length > 0
                          ? (showAllVenues ? optimizedSequenceVenues : optimizedSequenceVenues.filter(v => v.tourVenue?.status !== 'cancelled'))
                          : (showAllVenues ? venues : venues.filter(v => v.tourVenue?.status !== 'cancelled'))
                      } 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="optimize" className="mt-4">
                  <OptimizationPanel 
                    tourId={tourId}
                    venues={venues}
                    tourData={tourData}
                    refetch={refetch}
                    onApplyOptimization={onApplyOptimization}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}