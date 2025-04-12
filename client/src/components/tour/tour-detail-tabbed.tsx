import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTour, optimizeTourRoute, updateTour, applyTourOptimization } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { VenueStatusBadge } from './venue-status-badge';
import { StatCard } from './stat-card';
import { TourDetailTabs } from './tour-detail-tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft
} from 'lucide-react';
import { MapEvent } from '@/types';

// This is the new tabbed interface version of tour-detail-new.tsx
export function TourDetailTabbed({ params }: { params: { tourId: string } }) {
  const { tourId } = params;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [showAllVenues, setShowAllVenues] = useState(false);
  
  // Fetch tour data
  const { 
    data: tour = {}, 
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/tours', tourId],
    enabled: !!tourId
  });
  
  // Handle venue click for selection
  const handleVenueClick = (venue: any) => {
    setSelectedVenue(selectedVenue?.id === venue.id ? null : venue);
  };
  
  // Filter venues based on user preference
  const filteredVenues = useMemo(() => {
    if (!tour.venues) return [];
    
    if (showAllVenues) {
      return tour.venues;
    } else {
      return tour.venues.filter((venue: any) => 
        venue.status === 'confirmed' || 
        venue.status === 'hold' || 
        venue.status === 'booked'
      );
    }
  }, [tour.venues, showAllVenues]);
  
  // Prepare venues for map display
  const mapEvents: MapEvent[] = useMemo(() => {
    if (!filteredVenues) return [];
    
    return filteredVenues.map((venue: any) => ({
      id: venue.id,
      venue: venue.venue,
      status: venue.status,
      position: [venue.venue?.latitude || 0, venue.venue?.longitude || 0],
      date: venue.date,
      title: venue.venue?.name || 'Unknown Venue',
      description: venue.venue?.city 
        ? `${venue.venue.city}, ${venue.venue.region || ''}`
        : 'No location information',
      sequence: venue.sequence
    }));
  }, [filteredVenues]);
  
  // Check if we have enough venues for optimization
  const hasEnoughVenuesForOptimization = filteredVenues.length >= 2;
  
  // Apply tour optimization mutation
  const applyMutation = useMutation({
    mutationFn: () => applyTourOptimization(Number(tourId)),
    onSuccess: () => {
      toast({
        title: "Route optimized",
        description: "The tour has been optimized successfully.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Optimization failed",
        description: "There was an error optimizing the tour.",
        variant: "destructive",
      });
    }
  });
  
  // Create venue sequences for before/after comparison
  const originalSequenceVenues = useMemo(() => {
    if (!filteredVenues || filteredVenues.length < 2) return [];
    
    // Create a copy and sort by original sequence
    return [...filteredVenues].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, [filteredVenues]);
  
  const optimizedSequenceVenues = useMemo(() => {
    if (!filteredVenues || filteredVenues.length < 2) return [];
    
    // For this example, we're simulating optimization by sorting venues geographically
    // (west to east) to create visually distinct routes for comparison
    return [...filteredVenues].sort((a, b) => {
      if (!a.venue?.longitude || !b.venue?.longitude) return 0;
      return a.venue.longitude - b.venue.longitude;
    });
  }, [filteredVenues]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back Button */}
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/tours')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tours
        </Button>
      </div>
      
      {/* Tabbed Interface */}
      <TourDetailTabs 
        tour={tour}
        venues={tour.venues || []}
        filteredVenues={filteredVenues}
        mapEvents={mapEvents}
        originalSequenceVenues={originalSequenceVenues}
        optimizedSequenceVenues={optimizedSequenceVenues}
        selectedVenue={selectedVenue}
        showAllVenues={showAllVenues}
        setShowAllVenues={setShowAllVenues}
        onVenueClick={handleVenueClick}
        onApplyOptimization={() => applyMutation.mutate()}
        tourId={Number(tourId)}
        refetch={refetch}
      />
    </div>
  );
}

export default TourDetailTabbed;