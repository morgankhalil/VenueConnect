import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { VenueMap } from "@/components/maps/venue-map";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getMockPredictions, getMockTourGroups, getMockEventMapData } from "@/lib/api";
import { Search, Filter, SlidersHorizontal, Music, Clock, MapPin, ArrowUpRight, Calendar, Route } from "lucide-react";
import { PredictionWithDetails, TourGroup, MapEvent } from "@/types";
import { TourSelection } from "@/components/dashboard/tour-selection";
import { TourLeafletMap } from "@/components/dashboard/tour-leaflet-map";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("30");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [viewMode, setViewMode] = useState("unified");
  const [selectedTour, setSelectedTour] = useState<TourGroup | null>(null);
  const [displayMode, setDisplayMode] = useState<"all" | "individual" | "tours">("all");
  const { toast } = useToast();

  // Fetch predictions data (individual opportunities)
  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['/api/predictions'],
    queryFn: getMockPredictions
  });
  
  // Fetch tour groups
  const { data: tourGroups, isLoading: toursLoading } = useQuery({
    queryKey: ['/api/tours'],
    queryFn: getMockTourGroups
  });
  
  // Fetch map event data
  const { data: mapEvents, isLoading: mapEventsLoading } = useQuery({
    queryKey: ['/api/mapEvents'],
    queryFn: getMockEventMapData
  });
  
  // Combine individual opportunities with tour data for unified view
  const [combinedOpportunities, setCombinedOpportunities] = useState<any[]>([]);
  
  useEffect(() => {
    if (predictions && tourGroups) {
      // Create a combined dataset
      const combined = [...(predictions || [])];
      
      // Add tour opportunities with source information to help with filtering
      const tourOpportunities = tourGroups?.flatMap(tour => {
        return tour.events
          .filter(event => event.isRoutingOpportunity)
          .map(event => ({
            id: `tour-${tour.id}-${event.id}`,
            artist: { 
              name: tour.artistName,
              genres: [tour.genre]
            },
            suggestedDate: event.date,
            confidenceScore: 90, // Tours tend to be higher confidence
            venue: {
              name: event.venue
            },
            reasoning: `Part of ${tour.name} tour`,
            latitude: event.latitude,
            longitude: event.longitude,
            isTourOpportunity: true,
            tourId: tour.id,
            tourName: tour.name
          }));
      }) || [];
      
      setCombinedOpportunities([...combined, ...tourOpportunities]);
    }
  }, [predictions, tourGroups]);
  
  const handleSelectTour = (tour: TourGroup) => {
    setSelectedTour(tour);
    setViewMode("unified");
  };
  
  const handleCloseTour = () => {
    setSelectedTour(null);
  };
  
  // Function to highlight routing gaps on map
  const identifyRoutingGaps = () => {
    if (!selectedTour) return [];
    
    // TODO: Implement actual routing gap identification algorithm
    // This would analyze travel times and dates between confirmed tour stops
    return selectedTour.events.filter(e => e.isRoutingOpportunity);
  };

  // Apply filters to the combined opportunities
  const filteredOpportunities = combinedOpportunities?.filter(opportunity => {
    // Filter by display mode
    if (displayMode === "individual" && opportunity.isTourOpportunity) {
      return false;
    }
    if (displayMode === "tours" && !opportunity.isTourOpportunity) {
      return false;
    }

    // Search filter
    if (searchQuery && !opportunity.artist.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Genre filter
    if (genreFilter !== "all" && opportunity.artist.genres && !opportunity.artist.genres.includes(genreFilter)) {
      return false;
    }

    // Confidence filter
    if (confidenceFilter === "high" && opportunity.confidenceScore < 85) {
      return false;
    } else if (confidenceFilter === "medium" && (opportunity.confidenceScore < 70 || opportunity.confidenceScore >= 85)) {
      return false;
    } else if (confidenceFilter === "low" && opportunity.confidenceScore >= 70) {
      return false;
    }

    // Date range filter could be implemented here with actual date logic

    return true;
  });

  const handleSendInquiry = (opportunity: any) => {
    toast({
      title: "Inquiry Sent",
      description: `Your inquiry to ${opportunity.artist.name} for ${opportunity.suggestedDate} has been sent.`
    });
  };

  const handleViewDetails = (opportunity: any) => {
    if (opportunity.isTourOpportunity && opportunity.tourId) {
      // Find and select the tour
      const tour = tourGroups?.find(t => t.id === opportunity.tourId);
      if (tour) {
        setSelectedTour(tour);
        setViewMode("unified");
      }
    } else {
      toast({
        title: "View Details",
        description: `Viewing details for ${opportunity.artist.name}`
      });
    }
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

        {/* Opportunity Type Toggle */}
        <div className="mt-6">
          <ToggleGroup 
            type="single" 
            value={displayMode} 
            onValueChange={(value) => {
              if (value) setDisplayMode(value as "all" | "individual" | "tours");
            }}
            className="justify-start border rounded-md p-1"
          >
            <ToggleGroupItem value="all" aria-label="All Opportunities">
              <Filter className="h-4 w-4 mr-2" />
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="individual" aria-label="Individual Opportunities">
              <Music className="h-4 w-4 mr-2" />
              Single Bookings
            </ToggleGroupItem>
            <ToggleGroupItem value="tours" aria-label="Tour Opportunities">
              <Route className="h-4 w-4 mr-2" />
              Tour Opportunities
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Unified Discovery Interface */}
        <div className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                Booking Opportunities
              </CardTitle>
              <CardDescription>
                {filteredOpportunities?.length || 0} opportunities found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Interactive map at the top */}
              <div className="h-[400px] relative border-b">
                {predictionsLoading || toursLoading || mapEventsLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <p>Loading map data...</p>
                  </div>
                ) : (
                  <VenueMap
                    events={mapEvents || []}
                    height="100%"
                    showLegend={true}
                  />
                )}
              </div>
              
              {/* Selected Tour Details (if any) */}
              {selectedTour && (
                <div className="border-b">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{selectedTour.name}</h3>
                      <p className="text-sm text-gray-500">{selectedTour.artistName} · {selectedTour.region}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCloseTour}>
                      Close Tour Details
                    </Button>
                  </div>
                  
                  {/* Tour routing info */}
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-4 divide-x border rounded-md bg-gray-50 mb-4">
                      <div className="p-3 text-center">
                        <div className="text-sm font-medium">{selectedTour.totalShows}</div>
                        <div className="text-xs text-gray-500">Total Shows</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-sm font-medium">{selectedTour.confirmedShows}</div>
                        <div className="text-xs text-gray-500">Confirmed</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-sm font-medium">
                          {selectedTour.totalShows - selectedTour.confirmedShows}
                        </div>
                        <div className="text-xs text-gray-500">Open Dates</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-sm font-medium">
                          {new Date(selectedTour.startDate).toLocaleDateString()} - {new Date(selectedTour.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">Dates</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Timeline View */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium">Opportunity Timeline</h3>
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
                      <span>Individual</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></div>
                      <span>Tour</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
                      <span>Gaps</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-32 bg-gray-50 rounded-md relative overflow-hidden border">
                  {/* Month labels */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between px-4 py-1 bg-gray-100 text-xs text-gray-500 border-b">
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                  </div>
                  
                  {/* Timeline grid */}
                  <div className="absolute top-6 bottom-0 left-0 right-0">
                    <div className="relative w-full h-full">
                      {/* Grid lines */}
                      <div className="grid grid-cols-5 h-full">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="border-r border-gray-200 h-full"></div>
                        ))}
                      </div>
                      
                      {/* Timeline content */}
                      <div className="absolute inset-0 p-2">
                        {selectedTour && (
                          <>
                            {/* Tour date range indicator */}
                            <div 
                              className="absolute h-6 bg-blue-100 opacity-30 rounded-sm"
                              style={{ 
                                left: '5%', 
                                width: '35%', 
                                top: '0%' 
                              }}
                            ></div>
                            
                            {/* Tour stops */}
                            {selectedTour.events.filter(e => !e.isRoutingOpportunity).map((event, i) => (
                              <div 
                                key={`tour-stop-${i}`}
                                className="absolute w-3 h-3 bg-blue-600 rounded-full border-2 border-white z-10"
                                style={{ 
                                  left: `${5 + i * 8}%`, 
                                  top: '3%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                                title={`${event.venue} - ${new Date(event.date).toLocaleDateString()}`}
                              ></div>
                            ))}
                            
                            {/* Routing gaps */}
                            {selectedTour.events.filter(e => e.isRoutingOpportunity).map((gap, i) => (
                              <div 
                                key={`tour-gap-${i}`}
                                className="absolute flex flex-col items-center"
                                style={{ 
                                  left: `${15 + i * 10}%`, 
                                  top: '6%',
                                }}
                              >
                                <div 
                                  className="w-3 h-5 bg-red-500 rounded-sm cursor-pointer"
                                  title={`Routing gap: ${gap.venue} - ${new Date(gap.date).toLocaleDateString()}`}
                                  onClick={() => {
                                    // Find corresponding opportunity
                                    const oppTour = combinedOpportunities.find(o => 
                                      o.isTourOpportunity && 
                                      o.tourId === selectedTour.id && 
                                      o.suggestedDate === gap.date
                                    );
                                    if (oppTour) handleViewDetails(oppTour);
                                  }}
                                ></div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"></div>
                              </div>
                            ))}
                          </>
                        )}
                        
                        {/* Individual opportunities */}
                        {filteredOpportunities
                          ?.filter(opp => !opp.isTourOpportunity)
                          .map((opp, index) => {
                            // Position based on date - this would need real date math in production
                            // For demo, we'll just space them out
                            const leftPos = `${10 + (index * 15) % 80}%`;
                            const topPos = `${40 + (index * 15) % 40}%`;
                          
                            return (
                              <div 
                                key={opp.id}
                                className="absolute"
                                style={{ 
                                  left: leftPos,
                                  top: topPos
                                }}
                              >
                                <div 
                                  className="w-4 h-4 bg-green-500 rounded-full shadow-sm cursor-pointer transform hover:scale-110 transition-transform"
                                  title={`${opp.artist.name} - ${new Date(opp.suggestedDate).toLocaleDateString()}`}
                                  onClick={() => handleViewDetails(opp)}
                                ></div>
                              </div>
                            );
                          })
                        }
                        
                        {/* Tour opportunities */}
                        {filteredOpportunities
                          ?.filter(opp => opp.isTourOpportunity)
                          .map((opp, index) => {
                            // Position based on date - this would need real date math in production
                            // For demo, we'll just space them out
                            const leftPos = `${20 + (index * 12) % 70}%`;
                            
                            return (
                              <div 
                                key={opp.id}
                                className="absolute"
                                style={{ 
                                  left: leftPos,
                                  top: '25%' 
                                }}
                              >
                                <div 
                                  className="w-4 h-4 bg-blue-500 rounded-full shadow-sm cursor-pointer transform hover:scale-110 transition-transform"
                                  title={`${opp.artist.name} - ${opp.tourName} - ${new Date(opp.suggestedDate).toLocaleDateString()}`}
                                  onClick={() => handleViewDetails(opp)}
                                ></div>
                              </div>
                            );
                          })
                        }
                        
                        {filteredOpportunities?.length === 0 && !selectedTour && (
                          <div className="flex items-center justify-center h-full text-sm text-gray-400">
                            No opportunities in selected time period
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedTour && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    <span className="text-blue-600 font-medium">Pro tip:</span> Blue dots are confirmed tour dates, red markers show routing gaps where your venue could fit into the tour schedule.
                  </div>
                )}
              </div>
              
              {/* Opportunity Cards */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOpportunities?.map((opportunity) => (
                    <div 
                      key={opportunity.id}
                      className={`border rounded-md p-4 hover:shadow-md transition-shadow ${
                        opportunity.isTourOpportunity ? 'border-blue-200 bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium">{opportunity.artist.name}</h3>
                        <Badge className={opportunity.confidenceScore >= 85 
                          ? "bg-green-100 text-green-800" 
                          : opportunity.confidenceScore >= 70 
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }>
                          {opportunity.confidenceScore}% Match
                        </Badge>
                      </div>
                      
                      {opportunity.isTourOpportunity && (
                        <div className="mb-2">
                          <Badge variant="outline" className="flex items-center gap-1 border-blue-300">
                            <Route className="h-3 w-3" />
                            <span>{opportunity.tourName}</span>
                          </Badge>
                        </div>
                      )}
                      
                      <div className="space-y-1 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                          {new Date(opportunity.suggestedDate).toLocaleDateString()}
                        </div>
                        
                        <div className="flex items-center">
                          <Music className="mr-1 h-4 w-4 text-gray-400" />
                          {opportunity.artist.genres?.join(" / ") || "Genre N/A"}
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-4 w-4 text-gray-400" />
                          {opportunity.venue?.name || "Your Venue"}
                        </div>
                        
                        {opportunity.reasoning && (
                          <div className="text-xs mt-1 text-gray-600 italic">
                            {opportunity.reasoning}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleSendInquiry(opportunity)}
                        >
                          Send Inquiry
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1" 
                          onClick={() => handleViewDetails(opportunity)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {(predictionsLoading || toursLoading) && (
                    <div className="col-span-full py-10 text-center">
                      Loading opportunities...
                    </div>
                  )}
                  
                  {!predictionsLoading && !toursLoading && filteredOpportunities?.length === 0 && (
                    <div className="col-span-full py-10 text-center">
                      <p className="text-lg font-medium">No opportunities found</p>
                      <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
