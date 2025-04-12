import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { TourOverviewTab } from './tabs/tour-overview-tab';
import { RoutePlanningTab } from './tabs/route-planning-tab';
import { OptimizationTab } from './tabs/optimization-tab';
import { VenuesTab } from './tabs/venues-tab';

interface TourDetailTabsProps {
  tourId: number;
  venues: any[];
  tourData: any;
  originalSequenceVenues: any[];
  optimizedSequenceVenues: any[];
  selectedVenue: any;
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
  selectedVenue,
  showAllVenues,
  setShowAllVenues,
  onVenueClick,
  onApplyOptimization,
  refetch
}: TourDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError(null);
  };
  
  // Handle venue status update
  const handleVenueStatusUpdate = async () => {
    setIsLoading(true);
    try {
      await refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to update venues');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh Data'
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="route">Route Planning</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <TourOverviewTab 
            tourData={tourData} 
            venues={venues} 
          />
        </TabsContent>
        
        <TabsContent value="route" className="mt-6">
          <RoutePlanningTab 
            tourId={tourId}
            tourData={tourData}
            venues={venues}
            originalSequenceVenues={originalSequenceVenues}
            optimizedSequenceVenues={optimizedSequenceVenues}
            showAllVenues={showAllVenues}
            setShowAllVenues={setShowAllVenues}
            onVenueClick={onVenueClick}
            onApplyOptimization={onApplyOptimization}
            refetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="optimization" className="mt-6">
          <OptimizationTab 
            tourId={tourId}
            venues={venues}
            tourData={tourData}
            onApplyOptimization={onApplyOptimization}
            refetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="venues" className="mt-6">
          <VenuesTab 
            venues={venues} 
            tourId={tourId}
            onStatusUpdate={handleVenueStatusUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}