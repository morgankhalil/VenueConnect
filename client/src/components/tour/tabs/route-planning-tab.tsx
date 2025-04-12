import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Calendar,
  Route,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MoveUp,
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';

import { SimplifiedRouteMap } from '../simplified-route-map';
import { useUnifiedOptimizer } from '@/hooks/use-unified-optimizer';
import { useToast } from '@/hooks/use-toast';
import { TourOptimizationPanel } from '../tour-optimization-panel';

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
  const [showOptimizedRoute, setShowOptimizedRoute] = useState(false);
  const { toast } = useToast();
  
  const {
    optimizeTour,
    applyOptimization,
    isOptimizing,
    isApplying,
  } = useUnifiedOptimizer();

  // If optimized sequence is available, enable the optimized route view toggle
  useEffect(() => {
    if (optimizedSequenceVenues.length > 0) {
      setShowOptimizedRoute(true);
    }
  }, [optimizedSequenceVenues.length]);

  // Check if we have enough venue data to optimize
  const venuesWithCoordinates = venues.filter(v => v.venue?.latitude && v.venue?.longitude);
  const hasEnoughVenues = venuesWithCoordinates.length >= 3;
  const hasOptimizedData = optimizedSequenceVenues.length > 0;
  
  // Calculate improvements
  const calculateImprovement = (original: number, optimized: number): number => {
    if (!original || !optimized || original === 0) return 0;
    return Math.round(((original - optimized) / original) * 100);
  };
  
  // Distance/time improvements
  const originalDistance = tourData?.totalDistance || 0;
  const optimizedDistance = tourData?.optimizedTotalDistance || 0;
  const distanceImprovement = calculateImprovement(originalDistance, optimizedDistance);
  
  const originalTime = tourData?.totalTravelTime || 0;
  const optimizedTime = tourData?.optimizedTotalTravelTime || 0;
  const timeImprovement = calculateImprovement(originalTime, optimizedTime);

  // Handler functions
  const handleOptimize = async () => {
    try {
      await optimizeTour(tourId);
      refetch();
      toast({
        title: "Route optimized",
        description: "Your tour route has been optimized. Review the changes before applying.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Optimization failed",
        description: "Could not optimize your tour route. Please try again.",
      });
    }
  };

  const handleApplyOptimization = async () => {
    try {
      await applyOptimization(tourId);
      onApplyOptimization();
      refetch();
      toast({
        title: "Optimization applied",
        description: "Your optimized route has been applied to the tour.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not apply optimization",
        description: "Failed to apply the optimization. Please try again.",
      });
    }
  };

  // Timeline display component
  const TimelineView = ({ sequence }: { sequence: any[] }) => {
    return (
      <div>
        {sequence.length > 0 ? (
          <div className="relative overflow-visible mt-6">
            {/* Horizontal line */}
            <div className="absolute left-0 right-0 top-9 h-0.5 bg-muted z-0"></div>
            
            {/* Venues with connections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
              {sequence.map((venue, index) => (
                <div key={venue.id} className="relative">
                  {/* Date pill at top */}
                  <div className="text-sm font-medium text-center mb-2 text-muted-foreground">
                    {venue.tourVenue?.date ? formatDate(venue.tourVenue.date) : 'Date TBD'}
                  </div>
                  
                  {/* Timeline node */}
                  <div className="flex justify-center mb-2">
                    <div 
                      className={`h-5 w-5 rounded-full z-10 border-2 border-background ${
                        venue.tourVenue?.status === 'confirmed' ? 'bg-green-500' : 
                        venue.tourVenue?.status === 'hold' ? 'bg-amber-500' : 
                        venue.tourVenue?.status === 'potential' ? 'bg-blue-500' : 'bg-muted'
                      }`}
                    ></div>
                  </div>
                  
                  {/* Venue card */}
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => onVenueClick(venue)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-base truncate">{venue.venue?.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{venue.venue?.city}{venue.venue?.region ? `, ${venue.venue.region}` : ''}</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {renderStatusBadge(venue.tourVenue?.status)}
                        </div>
                      </div>
                      
                      {index < sequence.length - 1 && (
                        <div className="mt-3 pt-3 border-t text-xs flex flex-wrap items-center gap-2 text-muted-foreground">
                          {sequence[index + 1].tourVenue?.date && venue.tourVenue?.date && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{Math.ceil((new Date(sequence[index + 1].tourVenue.date).getTime() - new Date(venue.tourVenue.date).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                            </div>
                          )}
                          
                          {venue.venue?.longitude && venue.venue?.latitude && sequence[index + 1].venue?.longitude && sequence[index + 1].venue?.latitude && (
                            <div className="flex items-center">
                              <Route className="h-3 w-3 mr-1" />
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
                  
                  {/* Connecting line to next venue (if not last) */}
                  {index < sequence.length - 1 && (
                    <div className="hidden md:block absolute top-[38px] right-0 w-full h-0.5 bg-muted z-0" style={{ width: 'calc(50% + 20px)', left: '50%' }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    );
  };

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
            <Clock className="h-3.5 w-3.5 mr-1" />
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
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Route Planning</h2>
          <p className="text-muted-foreground">Optimize your tour route to minimize travel time and costs</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="show-all-venues"
            checked={showAllVenues}
            onCheckedChange={setShowAllVenues}
          />
          <label htmlFor="show-all-venues" className="text-sm font-medium cursor-pointer">
            Show all venues
          </label>
          
          {hasOptimizedData && (
            <div className="flex items-center gap-2 ml-4">
              <Switch
                id="show-optimized-toggle"
                checked={showOptimizedRoute}
                onCheckedChange={setShowOptimizedRoute}
              />
              <Label htmlFor="show-optimized-toggle" className="text-sm font-medium">
                {showOptimizedRoute ? 'Optimized' : 'Original'}
              </Label>
            </div>
          )}
        </div>
      </div>
      
      {/* Map */}
      <div className="h-[450px] mb-5 border rounded-md overflow-hidden">
        <SimplifiedRouteMap 
          originalVenues={originalSequenceVenues}
          optimizedVenues={optimizedSequenceVenues}
          onVenueClick={onVenueClick}
          showOptimized={showOptimizedRoute}
          onShowOptimizedChange={setShowOptimizedRoute}
        />
      </div>
      
      {/* Comparison + Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        {/* Left: Original Route */}
        <div className="bg-muted/30 rounded-md p-4 border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium">Original Route</h3>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
              Current
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Distance: {formatDistance(originalDistance)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Travel time: {formatTravelTime(originalTime)}</span>
            </div>
          </div>
        </div>
        
        {/* Center: Optimized Route */}
        <div className={`rounded-md p-4 border ${hasOptimizedData ? "bg-gradient-to-br from-purple-500/5 to-purple-500/10" : "bg-muted/30"}`}>
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-medium">Optimized Route</h3>
            {hasOptimizedData && (
              <Badge className="bg-green-500/20 text-green-600 border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Better
              </Badge>
            )}
          </div>
          
          {hasOptimizedData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Distance: {formatDistance(optimizedDistance)}</span>
                </div>
                {distanceImprovement > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-0">
                    -{distanceImprovement}%
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Travel time: {formatTravelTime(optimizedTime)}</span>
                </div>
                {timeImprovement > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-0">
                    -{timeImprovement}%
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              Optimize to see potential improvements
            </div>
          )}
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center justify-center xl:justify-start">
          {!hasEnoughVenues ? (
            <Alert variant="destructive" className="py-2 px-3 w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-medium">Not enough venues</AlertTitle>
              <AlertDescription className="text-xs">
                Add at least 3 venues with coordinates to optimize
              </AlertDescription>
            </Alert>
          ) : hasOptimizedData ? (
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="secondary"
                onClick={handleOptimize}
                disabled={isOptimizing || !hasEnoughVenues}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Re-Optimize Route
                  </>
                )}
              </Button>
              <Button
                onClick={handleApplyOptimization}
                disabled={isApplying || !hasOptimizedData}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <MoveUp className="h-4 w-4 mr-1" />
                    Apply Optimization
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !hasEnoughVenues}
              className="w-full py-6"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Optimizing Route...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Optimize Route
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Advanced Optimization Panel */}
      {hasEnoughVenues && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Advanced Optimization Options</h3>
          <TourOptimizationPanel 
            tourId={tourId} 
            onApplyChanges={() => {
              refetch();
              toast({
                title: "Optimization applied",
                description: "Tour has been optimized with advanced settings",
              });
            }} 
          />
        </div>
      )}
      
      {/* Timeline section */}
      <div className="mb-2 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            {showOptimizedRoute && optimizedSequenceVenues.length > 0 
              ? 'Optimized Timeline' 
              : 'Current Timeline'}
          </h3>
          
          {hasOptimizedData && (
            <div className="flex gap-2">
              {!showOptimizedRoute && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => setShowOptimizedRoute(true)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Optimized
                </Button>
              )}
              
              {showOptimizedRoute && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowOptimizedRoute(false)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Original
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="border rounded-md p-6">
          <TimelineView 
            sequence={
              showOptimizedRoute && optimizedSequenceVenues.length > 0
                ? (showAllVenues ? optimizedSequenceVenues : optimizedSequenceVenues.filter(v => v.tourVenue?.status !== 'cancelled'))
                : (showAllVenues ? venues : venues.filter(v => v.tourVenue?.status !== 'cancelled'))
            } 
          />
        </div>
      </div>
    </div>
  );
}

// Icon components
const Clock = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
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
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const Car = ({ className }: { className?: string }) => (
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
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.6-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"></path>
    <circle cx="7" cy="17" r="2"></circle>
    <path d="M9 17h6"></path>
    <circle cx="17" cy="17" r="2"></circle>
  </svg>
);

const XCircle = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="10"></circle>
    <path d="m15 9-6 6"></path>
    <path d="m9 9 6 6"></path>
  </svg>
);