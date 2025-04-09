import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TourSelection } from "@/components/dashboard/tour-selection";
import { TourDetailMap } from "@/components/dashboard/tour-detail-map";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { VenueCard } from "@/components/venue-network/venue-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMockStatsData, getMockTourGroups, getMockPredictions } from "@/lib/api";
import { PredictionWithDetails, TourGroup } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Filter, ArrowUpRight, MapPin, BarChart3, List } from "lucide-react";

// Tour Routing Section Component
function TourRoutingSection() {
  const [selectedTour, setSelectedTour] = useState<TourGroup | null>(null);
  
  // Fetch tour groups
  const { data: tourGroups, isLoading } = useQuery({
    queryKey: ['/api/tours'],
    queryFn: getMockTourGroups
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
      <TourSelection 
        tours={tourGroups || []} 
        onSelectTour={(tour) => setSelectedTour(tour)}
        selectedTourId={selectedTour?.id || null}
      />
      
      {selectedTour ? (
        <TourDetailMap 
          tour={selectedTour} 
          onClose={() => setSelectedTour(null)}
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[400px]">
            <MapPin className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Select a Tour</h3>
            <p className="text-gray-500 mt-2 max-w-md">
              Select a tour from the list to view its routing map and identify opportunities for your venue.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  // Fetch dashboard data
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getMockStatsData
  });

  // Get predictions data for opportunities section
  const { data: predictions, isLoading: isLoadingPredictions } = useQuery({
    queryKey: ['/api/predictions'],
    queryFn: getMockPredictions
  });

  // Recent venues data - this would be fetched from API in a real app
  const recentVenues = [
    {
      id: 1,
      name: "The Fillmore",
      address: "456 Fillmore St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94117",
      country: "USA",
      capacity: 1150,
      contactEmail: null,
      contactPhone: null,
      latitude: 37.7749,
      longitude: -122.4194,
      website: null,
      description: null,
      imageUrl: null,
      ownerId: 2
    },
    {
      id: 2,
      name: "9:30 Club",
      address: "815 V St NW",
      city: "Washington",
      state: "DC",
      zipCode: "20001",
      country: "USA",
      capacity: 1200,
      contactEmail: null,
      contactPhone: null,
      latitude: 38.9172,
      longitude: -77.0250,
      website: null,
      description: null,
      imageUrl: null,
      ownerId: 3
    },
    {
      id: 3,
      name: "First Avenue",
      address: "701 N 1st Ave",
      city: "Minneapolis",
      state: "MN",
      zipCode: "55403",
      country: "USA",
      capacity: 1550,
      contactEmail: null,
      contactPhone: null,
      latitude: 44.9781,
      longitude: -93.2763,
      website: null,
      description: null,
      imageUrl: null,
      ownerId: 4
    }
  ];

  const handleSendInquiry = (prediction: PredictionWithDetails) => {
    toast({
      title: "Inquiry Sent",
      description: `Your inquiry to ${prediction.artist.name} for ${prediction.suggestedDate} has been sent.`,
    });
  };

  const handleViewDetails = (prediction: PredictionWithDetails) => {
    toast({
      title: "View Details",
      description: `Viewing details for ${prediction.artist.name}`,
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Upcoming Opportunities"
            value={statsData?.upcomingOpportunities || 0}
            change={{ value: 12, increasing: true }}
            icon="opportunities"
          />
          <StatsCard
            title="Confirmed Bookings"
            value={statsData?.confirmedBookings || 0}
            change={{ value: 8, increasing: true }}
            icon="bookings"
          />
          <StatsCard
            title="Venue Network"
            value={statsData?.venueNetworkCount || 0}
            change={{ value: 2, increasing: true }}
            icon="network"
          />
        </div>
        
        {/* Tour Routing Section */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tour Routing</h2>
          
          <TourRoutingSection />
        </div>
        
        {/* Recent Opportunities */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Opportunities</h2>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 text-gray-400 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUpRight className="h-4 w-4 text-gray-400 mr-1" />
                Sort
              </Button>
            </div>
          </div>
          
          {/* Opportunities Grid */}
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {predictions?.map((prediction) => (
              <OpportunityCard
                key={prediction.id}
                prediction={prediction}
                onSendInquiry={handleSendInquiry}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="outline" className="inline-flex items-center">
              View All Opportunities
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Recently Added Venues */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recently Added Venues</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onClick={() => {
                  toast({
                    title: "Venue Selected",
                    description: `Viewing details for ${venue.name}`,
                  });
                }}
              />
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
