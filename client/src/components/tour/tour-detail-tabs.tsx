import React, { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { VenuesTab } from '@/components/tour/tabs/venues-tab';
import { OptimizationTab } from '@/components/tour/tabs/optimization-tab';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TourDetailTabsProps {
  tourId: number;
  venues: any[];
  tourData: any;
  onVenueClick: (venue: any) => void;
  onApplyOptimization: () => void;
  refetch: () => void;
}

export function TourDetailTabs({
  tourId,
  venues,
  tourData,
  onVenueClick,
  onApplyOptimization,
  refetch
}: TourDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('optimization');
  
  const hasVenues = venues && venues.length > 0;
  const hasOptimizationScore = tourData && tourData.optimizationScore !== undefined;
  
  // Stats for the tour optimization
  const optimizationStats = {
    venueCount: venues?.length || 0,
    confirmedCount: venues?.filter(v => v.status === 'confirmed').length || 0,
    potentialCount: venues?.filter(v => v.status === 'potential').length || 0,
    totalDistance: tourData && tourData.totalDistance || 0,
    travelTimeMinutes: tourData && tourData.travelTimeMinutes || 0,
  };
  
  const showOptimizationAlert = venues?.length > 0 && venues?.filter(v => v.status === 'confirmed').length < 2;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="route">Route Planning</TabsTrigger>
        <TabsTrigger value="optimization">Optimization</TabsTrigger>
        <TabsTrigger value="venues" disabled={!hasVenues}>
          Venues
          {hasVenues && <span className="ml-1 text-xs">({venues.length})</span>}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="mt-4">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Tour Overview</h2>
          <p className="text-muted-foreground">
            The Tour Overview tab will provide a summarized view of your tour details, metrics, and schedule.
          </p>
        </div>
      </TabsContent>
      
      <TabsContent value="route" className="mt-4">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Route Planning</h2>
          <p className="text-muted-foreground">
            The Route Planning tab will provide interactive maps and timeline views for your tour route.
          </p>
        </div>
      </TabsContent>
      
      <TabsContent value="optimization" className="mt-4">
        {showOptimizationAlert && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not enough confirmed venues</AlertTitle>
            <AlertDescription>
              You need at least two confirmed venues to optimize your tour route effectively.
              Please add more venues or change the status of existing venues to 'confirmed'.
            </AlertDescription>
          </Alert>
        )}
        
        <OptimizationTab 
          tourId={tourId} 
          venues={venues} 
          tourData={tourData}
          onApplyOptimization={onApplyOptimization}
          refetch={refetch}
        />
      </TabsContent>
      
      <TabsContent value="venues" className="mt-4">
        {hasVenues ? (
          <VenuesTab 
            venues={venues} 
            tourId={tourId} 
            onVenueClick={onVenueClick}
            refetch={refetch}
          />
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">No Venues Added</h2>
            <p className="text-muted-foreground">
              You haven't added any venues to this tour yet. Start by adding venues to plan your tour.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}