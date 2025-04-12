import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  SlidersHorizontal,
  Building,
  Users,
  CalendarDays,
  Music,
  MapPin,
  Filter,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { VenueDetail } from '../venue-detail';
import { formatCapacity, formatDate } from '@/lib/utils';

interface VenuesTabProps {
  venues: any[];
  tourId: number;
  onVenueClick: (venue: any) => void;
  refetch: () => void;
}

export function VenuesTab({
  venues,
  tourId,
  onVenueClick,
  refetch
}: VenuesTabProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [capacitySort, setCapacitySort] = useState<'asc' | 'desc' | null>(null);
  const [dateSort, setDateSort] = useState<'asc' | 'desc' | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'details'>('all');
  
  // Filter and sort venues
  const filteredVenues = venues.filter(venue => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (venue.region && venue.region.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === null || venue.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Sort venues
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    // Date sort
    if (dateSort === 'asc') {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (dateSort === 'desc') {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    
    // Capacity sort
    if (capacitySort === 'asc') {
      return (a.capacity || 0) - (b.capacity || 0);
    } else if (capacitySort === 'desc') {
      return (b.capacity || 0) - (a.capacity || 0);
    }
    
    // Default sort by date (if available)
    if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (a.date) {
      return -1;
    } else if (b.date) {
      return 1;
    }
    
    // Fallback to status priority
    const statusPriority: Record<string, number> = {
      'confirmed': 1,
      'hold': 2,
      'potential': 3,
      'cancelled': 4
    };
    
    return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
  });
  
  // Group venues by status
  const groupedVenues: Record<string, any[]> = {
    confirmed: [],
    hold: [],
    potential: [],
    cancelled: []
  };
  
  sortedVenues.forEach(venue => {
    if (venue.status && groupedVenues[venue.status]) {
      groupedVenues[venue.status].push(venue);
    }
  });
  
  // Handle venue click
  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue);
    setViewMode('details');
    onVenueClick(venue);
  };
  
  // Handle status filter click
  const handleStatusFilterClick = (status: string | null) => {
    setStatusFilter(status);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(null);
    setCapacitySort(null);
    setDateSort(null);
  };
  
  // Handle venue status update
  const handleStatusUpdate = () => {
    refetch();
  };
  
  return (
    <div className="space-y-6">
      {viewMode === 'all' ? (
        <>
          {/* Search and filter controls */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Venues</CardTitle>
                  <CardDescription>
                    Manage venues for your tour
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Venue
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-auto flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search venues..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Status
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleStatusFilterClick(null)}>
                        All Statuses
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusFilterClick('confirmed')}>
                        Confirmed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusFilterClick('hold')}>
                        On Hold
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusFilterClick('potential')}>
                        Potential
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusFilterClick('cancelled')}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Sort
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setDateSort('asc'); setCapacitySort(null); }}>
                        Date (Earliest First)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setDateSort('desc'); setCapacitySort(null); }}>
                        Date (Latest First)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setCapacitySort('desc'); setDateSort(null); }}>
                        Capacity (Largest First)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setCapacitySort('asc'); setDateSort(null); }}>
                        Capacity (Smallest First)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {(searchTerm || statusFilter || capacitySort || dateSort) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
              
              {statusFilter && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtered by status:</span>
                  <Badge variant="outline" className="bg-muted">
                    {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Venue listing by status */}
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="all">
                All ({sortedVenues.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({groupedVenues.confirmed.length})
              </TabsTrigger>
              <TabsTrigger value="hold">
                Hold ({groupedVenues.hold.length})
              </TabsTrigger>
              <TabsTrigger value="potential">
                Potential ({groupedVenues.potential.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({groupedVenues.cancelled.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <VenuesList
                venues={sortedVenues}
                onVenueClick={handleVenueClick}
              />
            </TabsContent>
            
            <TabsContent value="confirmed" className="space-y-4">
              <VenuesList
                venues={groupedVenues.confirmed}
                onVenueClick={handleVenueClick}
              />
            </TabsContent>
            
            <TabsContent value="hold" className="space-y-4">
              <VenuesList
                venues={groupedVenues.hold}
                onVenueClick={handleVenueClick}
              />
            </TabsContent>
            
            <TabsContent value="potential" className="space-y-4">
              <VenuesList
                venues={groupedVenues.potential}
                onVenueClick={handleVenueClick}
              />
            </TabsContent>
            
            <TabsContent value="cancelled" className="space-y-4">
              <VenuesList
                venues={groupedVenues.cancelled}
                onVenueClick={handleVenueClick}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          {/* Venue details view */}
          <div className="flex items-center mb-6">
            <Button
              variant="outline"
              onClick={() => setViewMode('all')}
              className="mr-4"
            >
              Back to Venues
            </Button>
            <h2 className="text-xl font-semibold">
              {selectedVenue?.name}
            </h2>
          </div>
          
          {selectedVenue && (
            <VenueDetail
              venue={selectedVenue}
              tourId={tourId}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </>
      )}
    </div>
  );
}

// Component for rendering the list of venues
function VenuesList({ venues, onVenueClick }: { venues: any[], onVenueClick: (venue: any) => void }) {
  if (venues.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md">
        <p className="text-muted-foreground">No venues match your filters</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {venues.map(venue => (
        <Card 
          key={venue.id} 
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onVenueClick(venue)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-lg">{venue.name}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {venue.city}{venue.region ? `, ${venue.region}` : ''}
                </div>
              </div>
              
              <Badge 
                className={`
                  ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                  ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                  ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}
                  ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                `}
              >
                {venue.status}
              </Badge>
            </div>
            
            <Separator className="my-3" />
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              {venue.date && (
                <div className="flex items-center">
                  <CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <span>{formatDate(venue.date)}</span>
                </div>
              )}
              
              {venue.capacity && (
                <div className="flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <span>{formatCapacity(venue.capacity)}</span>
                </div>
              )}
              
              {venue.venueType && (
                <div className="flex items-center">
                  <Building className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <span>{venue.venueType}</span>
                </div>
              )}
              
              {venue.genre && (
                <div className="flex items-center">
                  <Music className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <span>{venue.genre}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}