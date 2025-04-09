import React from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { VenueCard } from "@/components/venue-network/venue-card";
import { Button } from "@/components/ui/button";
import { getStatsData, getPredictionsWithDetails } from "@/lib/api";
import { PredictionWithDetails } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Filter, ArrowUpRight, BarChart3, List } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";


export default function Dashboard() {
  const { toast } = useToast();

  // Fetch dashboard data
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getStatsData
  });

  // Get predictions data for opportunities section
  const { data: predictions, isLoading: isLoadingPredictions } = useQuery({
    queryKey: ['/api/predictions'],
    queryFn: getPredictionsWithDetails,
    initialData: [] //Added initialData to prevent errors if predictions are not immediately available.
  });

  // Fetch recent venues
  const { data: recentVenues, isLoading: isLoadingVenues } = useQuery({
    queryKey: ['/api/venues/recent'],
    queryFn: () => apiRequest('GET', '/api/venues/recent').then(res => res.json())
  });

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

  // Check for loading states and empty data
  if (isLoadingStats || isLoadingPredictions || isLoadingVenues) {
    return <div>Loading...</div>;
  }

  // Initialize empty data placeholders
  const displayPredictions = predictions || [];
  const displayVenues = recentVenues || [];
  const displayStats = statsData || {
    upcomingOpportunities: 0,
    confirmedBookings: 0,
    venueNetworkCount: 0,
    recentInquiries: 0
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
            value={displayStats.upcomingOpportunities}
            change={{ value: 12, increasing: true }}
            icon="opportunities"
          />
          <StatsCard
            title="Confirmed Bookings"
            value={displayStats.confirmedBookings}
            change={{ value: 8, increasing: true }}
            icon="bookings"
          />
          <StatsCard
            title="Venue Network"
            value={displayStats.venueNetworkCount}
            change={{ value: 2, increasing: true }}
            icon="network"
          />
        </div>

        {/* Tour Routing Section - Moved to Discover page */}

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
            {displayPredictions.map((prediction) => (
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
            {displayVenues.map((venue) => (
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