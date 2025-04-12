import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getAllVenues, searchVenues } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Search, Filter, SlidersHorizontal, Music, Map, MapPin, ArrowUpRight, Calendar, Route, Building, Info, Users, Link2 } from "lucide-react";
import { useLocation } from "wouter";

// Define types for venues
interface Venue {
  id: number;
  name: string;
  city: string;
  region: string | null;
  country: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  primaryGenre?: string | null;
  marketCategory?: string | null;
  venueType?: string | null;
  capacityCategory?: string | null;
}

export default function Venues() {
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [marketCategoryFilter, setMarketCategoryFilter] = useState("all");
  const [venueTypeFilter, setVenueTypeFilter] = useState("all");
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch all venues
  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['/api/venues'],
    queryFn: () => getAllVenues().then(data => {
      // Ensure we always return an array even if the endpoint returns null/undefined
      return Array.isArray(data) ? data : [];
    })
  });

  // Apply filters
  useEffect(() => {
    let filtered = [...venues];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (venue.city && venue.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (venue.region && venue.region.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Genre filter
    if (genreFilter !== "all") {
      filtered = filtered.filter(venue => venue.primaryGenre === genreFilter);
    }

    // Capacity filter
    if (capacityFilter !== "all") {
      filtered = filtered.filter(venue => venue.capacityCategory === capacityFilter);
    }

    // Region filter
    if (regionFilter !== "all") {
      filtered = filtered.filter(venue => venue.region === regionFilter);
    }

    // Market Category filter
    if (marketCategoryFilter !== "all") {
      filtered = filtered.filter(venue => venue.marketCategory === marketCategoryFilter);
    }

    // Venue Type filter
    if (venueTypeFilter !== "all") {
      filtered = filtered.filter(venue => venue.venueType === venueTypeFilter);
    }

    setFilteredVenues(filtered);
  }, [venues, searchQuery, genreFilter, capacityFilter, regionFilter, marketCategoryFilter, venueTypeFilter]);

  const handleViewDetails = (venueId: number) => {
    navigate(`/venues/${venueId}`);
  };

  const formatCapacity = (capacity: number | null) => {
    if (capacity === null) return "Unknown";
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}K`;
    }
    return capacity.toString();
  };

  const getGenreLabel = (genre: string | null | undefined) => {
    if (!genre) return null;
    const genreMap: { [key: string]: string } = {
      rock: "Rock",
      indie: "Indie",
      hip_hop: "Hip-Hop",
      electronic: "Electronic",
      pop: "Pop",
      folk: "Folk",
      metal: "Metal",
      jazz: "Jazz",
      blues: "Blues",
      world: "World",
      classical: "Classical",
      country: "Country",
      reggae: "Reggae",
      punk: "Punk",
      r_and_b: "R&B",
      experimental: "Experimental",
      ambient: "Ambient",
      techno: "Techno",
      house: "House",
      other: "Other"
    };
    return genreMap[genre] || genre;
  };

  // Extract unique regions for the filter
  const uniqueRegions = Array.from(new Set(
    venues.map(venue => venue.region).filter(Boolean)
  )).sort();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Discovery</h1>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/venue-network')}>
              <Link2 className="h-4 w-4 mr-2" />
              Venue Network
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/discover')}>
              <Music className="h-4 w-4 mr-2" />
              Discover Artists
            </Button>
          </div>
        </div>

        {/* Horizontal Filters */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Search</h3>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      className="pl-10"
                      placeholder="Venue name, city, region..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Genre Filter */}
              <div className="w-[150px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Genre</h3>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger>
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
                </div>
              </div>
              
              {/* Capacity Filter */}
              <div className="w-[150px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Capacity</h3>
                  <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      <SelectItem value="tiny">Tiny (&lt; 100)</SelectItem>
                      <SelectItem value="small">Small (100-500)</SelectItem>
                      <SelectItem value="medium">Medium (500-1000)</SelectItem>
                      <SelectItem value="large">Large (1000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Region Filter */}
              <div className="w-[150px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Region</h3>
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {uniqueRegions.map(region => (
                        <SelectItem key={region} value={region as string}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Market Category Filter */}
              <div className="w-[180px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Market Category</h3>
                  <Select value={marketCategoryFilter} onValueChange={setMarketCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Markets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markets</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="tertiary">Tertiary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Venue Type Filter */}
              <div className="w-[180px]">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Venue Type</h3>
                  <Select value={venueTypeFilter} onValueChange={setVenueTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="club">Club</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="theater">Theater</SelectItem>
                      <SelectItem value="coffeehouse">Coffeehouse</SelectItem>
                      <SelectItem value="diy_space">DIY Space</SelectItem>
                      <SelectItem value="art_gallery">Art Gallery</SelectItem>
                      <SelectItem value="college_venue">College Venue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button className="mb-1" onClick={() => {
                // Reset all filters
                setSearchQuery("");
                setGenreFilter("all");
                setCapacityFilter("all");
                setRegionFilter("all");
                setMarketCategoryFilter("all");
                setVenueTypeFilter("all");
              }}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Main content area - results summary */}
        <Card className="mt-4">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Venues
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {filteredVenues.length} venues found
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Venue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {venuesLoading ? (
                <div className="col-span-3 text-center py-12">Loading venues...</div>
              ) : filteredVenues.length > 0 ? (
                filteredVenues.map((venue) => (
                  <Card key={venue.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{venue.name}</CardTitle>
                        {venue.primaryGenre && (
                          <Badge className="ml-2" variant="outline">
                            {getGenreLabel(venue.primaryGenre)}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1 inline" />
                        {venue.city}{venue.region ? `, ${venue.region}` : ""}{venue.country && venue.country !== "USA" ? `, ${venue.country}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-3 mt-1">
                        {venue.capacity && (
                          <div className="flex items-center text-sm">
                            <Users className="h-3 w-3 mr-1 inline" />
                            <span>{formatCapacity(venue.capacity)}</span>
                          </div>
                        )}
                        {venue.venueType && (
                          <div className="flex items-center text-sm">
                            <Building className="h-3 w-3 mr-1 inline" />
                            <span>{venue.venueType.replace('_', ' ')}</span>
                          </div>
                        )}
                        {venue.marketCategory && (
                          <div className="flex items-center text-sm">
                            <Map className="h-3 w-3 mr-1 inline" />
                            <span>{venue.marketCategory} market</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => handleViewDetails(venue.id)}
                      >
                        View Details
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-12">
                  <Info className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600">No venues found</h3>
                  <p className="text-gray-500">Try adjusting your search filters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}