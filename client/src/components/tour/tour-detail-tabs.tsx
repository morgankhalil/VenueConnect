import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart2, Route, Settings, Warehouse } from 'lucide-react';
import { TourOverviewTab } from '@/components/tour/tabs/tour-overview-tab';
import { RoutePlanningTab } from '@/components/tour/tabs/route-planning-tab';
import { OptimizationTab } from '@/components/tour/tabs/optimization-tab';
import { VenuesTab } from '@/components/tour/tabs/venues-tab';

interface TourDetailTabsProps {
  tourId: number;
  venues: any[];
  tourData: any;
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  showAllVenues: boolean;
  setShowAllVenues: React.Dispatch<React.SetStateAction<boolean>>;
  onVenueClick: (venue: any) => void;
  onApplyOptimization: () => void;
  refetch: () => void;
}

export function TourDetailTabs({
  tourId,
  venues,
  tourData,
  originalSequenceVenues,
  optimizedSequenceVenues,
  showAllVenues,
  setShowAllVenues,
  onVenueClick,
  onApplyOptimization,
  refetch
}: TourDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!tourData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading tour data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        
        <TabsTrigger value="route" className="flex items-center gap-2">
          <Route className="h-4 w-4" />
          <span className="hidden sm:inline">Route Planning</span>
        </TabsTrigger>
        
        <TabsTrigger value="optimization" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Optimization</span>
        </TabsTrigger>
        
        <TabsTrigger value="venues" className="flex items-center gap-2">
          <Warehouse className="h-4 w-4" />
          <span className="hidden sm:inline">Venues</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <TourOverviewTab 
          tourData={tourData} 
          venues={venues} 
        />
      </TabsContent>
      
      <TabsContent value="route" className="space-y-4">
        <RoutePlanningTab 
          venues={venues}
          originalSequenceVenues={originalSequenceVenues}
          optimizedSequenceVenues={optimizedSequenceVenues}
          showAllVenues={showAllVenues}
          setShowAllVenues={setShowAllVenues}
          onVenueClick={onVenueClick}
        />
      </TabsContent>
      
      <TabsContent value="optimization" className="space-y-4">
        <OptimizationTab 
          tourId={tourId}
          venues={venues}
          tourData={tourData}
          onApplyOptimization={onApplyOptimization}
          refetch={refetch}
        />
      </TabsContent>
      
      <TabsContent value="venues" className="space-y-4">
        <VenuesTab 
          venues={venues}
          tourId={tourId}
          onVenueClick={onVenueClick}
          refetch={refetch}
        />
      </TabsContent>
    </Tabs>
  );
}