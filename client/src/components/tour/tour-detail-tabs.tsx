import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HomeIcon, 
  MapIcon, 
  BuildingIcon, 
  SparklesIcon 
} from 'lucide-react';
import { TourOverviewTab } from './tabs/tour-overview-tab';
import { RoutePlanningTab } from './tabs/route-planning-tab';
import { OptimizationTab } from './tabs/optimization-tab';
import { VenuesTab } from './tabs/venues-tab';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TourDetailTabsProps {
  tourId: number;
}

export function TourDetailTabs({ tourId }: TourDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  
  const queryClient = useQueryClient();

  // Fetch tour details
  const { data: tour, isLoading: tourIsLoading } = useQuery({
    queryKey: ['/api/tours', tourId],
    enabled: !!tourId,
  });

  // Fetch tour venues
  const { data: venues = [], isLoading: venuesIsLoading } = useQuery({
    queryKey: ['/api/tours', tourId, 'venues'],
    enabled: !!tourId,
  });

  // Fetch optimized tour venues if available
  const { data: optimizedVenues = [], isLoading: optimizedVenuesIsLoading } = useQuery({
    queryKey: ['/api/tours', tourId, 'optimized-venues'],
    enabled: !!tourId && !!tour?.optimizationScore,
  });

  const filteredVenues = showAllVenues
    ? venues
    : venues.filter((venue: any) => venue.isTourVenue);

  const mapEvents = venues.map((venue: any) => ({
    id: venue.id,
    name: venue.name,
    longitude: venue.longitude,
    latitude: venue.latitude,
    status: venue.status,
    performanceDate: venue.performanceDate,
    venueName: venue.name,
    city: venue.city,
    region: venue.region,
  }));

  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue);
    if (activeTab !== 'venues') {
      setActiveTab('venues');
    }
  };

  const handleApplyOptimization = () => {
    // Refetch tour data after applying optimization
    queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
    queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId, 'venues'] });
  };

  // Calculate tour stats for overview tab
  const tourStats = {
    totalVenues: venues.length,
    confirmedVenues: venues.filter((v: any) => 
      v.status?.toLowerCase() === 'confirmed' || 
      v.status?.toLowerCase() === 'booked'
    ).length,
    potentialVenues: venues.filter((v: any) => 
      v.status?.toLowerCase() === 'potential' || 
      v.status?.toLowerCase() === 'hold'
    ).length,
    estimatedDistance: tour?.totalDistance || 0,
    estimatedTravelTime: tour?.travelTimeMinutes || 0,
    budget: tour?.budget || 0,
  };

  // Clear selected venue when changing tabs (except when going to venues tab)
  useEffect(() => {
    if (activeTab !== 'venues') {
      setSelectedVenue(null);
    }
  }, [activeTab]);

  if (tourIsLoading) {
    return <div className="flex items-center justify-center p-8">Loading tour details...</div>;
  }

  if (!tour) {
    return <div className="flex items-center justify-center p-8">Tour not found</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="overview" className="flex items-center">
          <HomeIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="route-planning" className="flex items-center">
          <MapIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Route Planning</span>
        </TabsTrigger>
        <TabsTrigger value="optimization" className="flex items-center">
          <SparklesIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Optimization</span>
        </TabsTrigger>
        <TabsTrigger value="venues" className="flex items-center">
          <BuildingIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Venues</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <TourOverviewTab 
          tour={tour} 
          stats={tourStats}
        />
      </TabsContent>

      <TabsContent value="route-planning" className="mt-0">
        <RoutePlanningTab 
          tour={tour} 
          venues={venues} 
          mapEvents={mapEvents}
          onVenueClick={handleVenueClick}
        />
      </TabsContent>

      <TabsContent value="optimization" className="mt-0">
        <OptimizationTab 
          tour={tour} 
          tourId={tourId}
          originalVenues={venues}
          optimizedVenues={optimizedVenues}
          onApplyChanges={handleApplyOptimization}
        />
      </TabsContent>

      <TabsContent value="venues" className="mt-0">
        <VenuesTab 
          tour={tour}
          venues={venues}
          filteredVenues={filteredVenues}
          showAllVenues={showAllVenues}
          setShowAllVenues={setShowAllVenues}
          selectedVenue={selectedVenue}
          onVenueClick={handleVenueClick}
          tourId={tourId}
          refetch={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId] });
            queryClient.invalidateQueries({ queryKey: ['/api/tours', tourId, 'venues'] });
          }}
        />
      </TabsContent>
    </Tabs>
  );
}