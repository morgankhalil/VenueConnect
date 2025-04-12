import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  Info, 
  Map, 
  Sparkles, 
  Building, 
  CalendarDays,
  BarChart3,
  Route
} from 'lucide-react';

// Importing tab content components
import { TourOverviewTab } from './tabs/tour-overview-tab';
import { RoutePlanningTab } from './tabs/route-planning-tab';
import { OptimizationTab } from './tabs/optimization-tab';
import { VenuesTab } from './tabs/venues-tab';

interface TourDetailTabsProps {
  tour: any;
  venues: any[];
  filteredVenues: any[];
  mapEvents: any[];
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  selectedVenue: any;
  showAllVenues: boolean;
  setShowAllVenues: (show: boolean) => void;
  onVenueClick: (venue: any) => void;
  onApplyOptimization: () => void;
  tourId: number;
  refetch: () => void;
}

export function TourDetailTabs({
  tour,
  venues,
  filteredVenues,
  mapEvents,
  originalSequenceVenues,
  optimizedSequenceVenues,
  selectedVenue,
  showAllVenues,
  setShowAllVenues,
  onVenueClick,
  onApplyOptimization,
  tourId,
  refetch
}: TourDetailTabsProps) {
  const hasEnoughVenuesForOptimization = filteredVenues.length >= 2;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full border-b mb-6 bg-transparent justify-start">
        <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
          <Info className="w-4 h-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="route" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
          <Route className="w-4 h-4 mr-2" />
          Route Planning
        </TabsTrigger>
        <TabsTrigger 
          value="optimization" 
          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          disabled={!hasEnoughVenuesForOptimization}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Optimization
        </TabsTrigger>
        <TabsTrigger value="venues" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
          <Building className="w-4 h-4 mr-2" />
          Venues
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab Content */}
      <TabsContent value="overview" className="m-0">
        <TourOverviewTab 
          tour={tour}
          stats={{
            totalVenues: tour.venues?.length || 0,
            confirmedVenues: tour.confirmedVenues || 0,
            potentialVenues: tour.potentialVenues || 0,
            estimatedDistance: tour.estimatedTravelDistance || 0,
            estimatedTravelTime: tour.estimatedTravelTime || 0,
            budget: tour.budget || 0
          }}
        />
      </TabsContent>

      {/* Route Planning Tab Content */}
      <TabsContent value="route" className="m-0">
        <RoutePlanningTab 
          tour={tour}
          venues={filteredVenues}
          mapEvents={mapEvents}
          onVenueClick={onVenueClick}
        />
      </TabsContent>

      {/* Optimization Tab Content */}
      <TabsContent value="optimization" className="m-0">
        <OptimizationTab 
          tour={tour}
          tourId={tourId}
          originalVenues={originalSequenceVenues}
          optimizedVenues={optimizedSequenceVenues}
          onApplyChanges={() => {
            onApplyOptimization();
            refetch();
          }}
        />
      </TabsContent>

      {/* Venues Tab Content */}
      <TabsContent value="venues" className="m-0">
        <VenuesTab 
          tour={tour}
          venues={venues}
          filteredVenues={filteredVenues}
          showAllVenues={showAllVenues}
          setShowAllVenues={setShowAllVenues}
          selectedVenue={selectedVenue}
          onVenueClick={onVenueClick}
          tourId={tourId}
          refetch={refetch}
        />
      </TabsContent>
    </Tabs>
  );
}

export default TourDetailTabs;