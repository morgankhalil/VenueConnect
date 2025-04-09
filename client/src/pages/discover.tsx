import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { VenueMap } from "@/components/maps/venue-map";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getMockPredictions } from "@/lib/api";
import { Search, Filter, SlidersHorizontal, Music, Clock, MapPin } from "lucide-react";
import { PredictionWithDetails } from "@/types";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("30");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const { toast } = useToast();

  // Fetch predictions data
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['/api/predictions'],
    queryFn: getMockPredictions
  });

  // Apply filters
  const filteredPredictions = predictions?.filter(prediction => {
    // Search filter
    if (searchQuery && !prediction.artist.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Genre filter
    if (genreFilter !== "all" && prediction.artist.genres && !prediction.artist.genres.includes(genreFilter)) {
      return false;
    }

    // Confidence filter
    if (confidenceFilter === "high" && prediction.confidenceScore < 85) {
      return false;
    } else if (confidenceFilter === "medium" && (prediction.confidenceScore < 70 || prediction.confidenceScore >= 85)) {
      return false;
    } else if (confidenceFilter === "low" && prediction.confidenceScore >= 70) {
      return false;
    }

    // Date range filter could be implemented here with actual date logic

    return true;
  });

  const handleSendInquiry = (prediction: PredictionWithDetails) => {
    toast({
      title: "Inquiry Sent",
      description: `Your inquiry to ${prediction.artist.name} for ${prediction.suggestedDate} has been sent.`
    });
  };

  const handleViewDetails = (prediction: PredictionWithDetails) => {
    toast({
      title: "View Details",
      description: `Viewing details for ${prediction.artist.name}`
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Discover</h1>
        
        {/* Search and Filters */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                className="pl-10"
                placeholder="Search for artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="indie">Indie</SelectItem>
                  <SelectItem value="hip_hop">Hip-Hop</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="folk">Folk</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="blues">Blues</SelectItem>
                  <SelectItem value="world">World</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Next 30 Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 Days</SelectItem>
                  <SelectItem value="60">Next 60 Days</SelectItem>
                  <SelectItem value="90">Next 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="All Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (85%+)</SelectItem>
                  <SelectItem value="medium">Medium (70-84%)</SelectItem>
                  <SelectItem value="low">Low (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-4">
          <Tabs defaultValue="grid" value={viewMode} onValueChange={setViewMode}>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {filteredPredictions?.length || 0} opportunities found
              </div>
              <TabsList>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid" className="mt-6">
              {isLoading ? (
                <div className="text-center py-10">Loading opportunities...</div>
              ) : filteredPredictions?.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-lg font-medium">No opportunities found</p>
                  <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPredictions?.map((prediction) => (
                    <OpportunityCard
                      key={prediction.id}
                      prediction={prediction}
                      onSendInquiry={handleSendInquiry}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="text-center py-10">Loading opportunities...</div>
                  ) : filteredPredictions?.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-lg font-medium">No opportunities found</p>
                      <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPredictions?.map((prediction) => (
                        <div 
                          key={prediction.id}
                          className="p-4 border rounded-md flex flex-col sm:flex-row justify-between gap-4"
                        >
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900">{prediction.artist.name}</h3>
                              <Badge className={prediction.confidenceScore >= 85 
                                ? "bg-green-100 text-green-800" 
                                : prediction.confidenceScore >= 70 
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                              }>
                                {prediction.confidenceScore}% Match
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="mr-1 h-4 w-4 text-gray-400" />
                                {new Date(prediction.suggestedDate).toLocaleDateString()}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Music className="mr-1 h-4 w-4 text-gray-400" />
                                {prediction.artist.genres?.join(" / ") || "Genre N/A"}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="mr-1 h-4 w-4 text-gray-400" />
                                {prediction.reasoning || "Booking Opportunity"}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 sm:w-32 sm:flex-shrink-0 justify-end">
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleSendInquiry(prediction)}
                            >
                              Send Inquiry
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleViewDetails(prediction)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="relative bg-white rounded-lg">
                    <div className="p-3 border-b">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-medium">Geographic Opportunities</h3>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Filter</Button>
                          <Button variant="outline" size="sm">Region</Button>
                        </div>
                      </div>
                    </div>
                    <div className="h-[500px] relative">
                      {/* Use our new VenueMap component with Leaflet */}
                      <VenueMap
                        events={[
                          {
                            id: 1,
                            venue: "The Fillmore",
                            artist: "The Decemberists",
                            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                            latitude: 37.7749,
                            longitude: -122.4194,
                            isCurrentVenue: false,
                            isRoutingOpportunity: false
                          },
                          {
                            id: 2,
                            venue: "The Wiltern",
                            artist: "The Decemberists",
                            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                            latitude: 34.0522,
                            longitude: -118.2437,
                            isCurrentVenue: false,
                            isRoutingOpportunity: true
                          },
                          {
                            id: 3,
                            venue: "Paramount Theatre",
                            artist: "The Decemberists",
                            date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
                            latitude: 47.6062,
                            longitude: -122.3321,
                            isCurrentVenue: true,
                            isRoutingOpportunity: false
                          }
                        ]}
                        height="100%"
                        showLegend={true}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
