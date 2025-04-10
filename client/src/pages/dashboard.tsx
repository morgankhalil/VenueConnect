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

  // Fetch dashboard data with optimized loading
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: getStatsData,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    // Default data to prevent loading state
    placeholderData: {
      upcomingOpportunities: 0,
      confirmedBookings: 0,
      venueNetworkCount: 0,
      recentInquiries: 0
    }
  });

  // Get predictions data for opportunities section
  const { data: predictions, isLoading: isLoadingPredictions } = useQuery({
    queryKey: ['/api/predictions/details'],
    queryFn: getPredictionsWithDetails,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    initialData: [], // Default empty array to avoid errors
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Fetch recent venues
  const { data: recentVenues, isLoading: isLoadingVenues } = useQuery({
    queryKey: ['/api/venues/recent'],
    queryFn: () => apiRequest('/api/venues/recent'),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    initialData: [], // Default empty array
    refetchOnWindowFocus: false // Don't refetch when window regains focus
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

  // Initialize empty data placeholders
  const displayPredictions = predictions || [];
  const displayVenues = recentVenues || [];
  const displayStats = statsData || {
    upcomingOpportunities: 0,
    confirmedBookings: 0,
    venueNetworkCount: 0,
    recentInquiries: 0
  };

  // Create skeleton loaders for different sections
  const renderStatsSkeleton = () => (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg shadow p-5 animate-pulse">
          <div className="flex">
            <div className="w-10 h-10 rounded bg-gray-200"></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPredictionsSkeleton = () => (
    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg shadow h-48 animate-pulse">
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="flex justify-end">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVenuesSkeleton = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg shadow h-36 animate-pulse">
          <div className="p-4">
            <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-200 mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">

        {/* Stats Overview */}
        {isLoadingStats ? renderStatsSkeleton() : (
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
        )}

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
          {isLoadingPredictions ? renderPredictionsSkeleton() : (
            <>
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
            </>
          )}
        </div>

        {/* Recently Added Venues */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recently Added Venues</h2>
          {isLoadingVenues ? renderVenuesSkeleton() : (
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
          )}
        </div>

      </div>
    </div>
  );
}