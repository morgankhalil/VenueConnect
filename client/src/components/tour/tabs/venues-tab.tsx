import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { VenueDetail } from '@/components/tour/venue-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Calculator, 
  Info, 
  MapPin, 
  Search, 
  SortAsc, 
  User 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
  const [filteredVenues, setFilteredVenues] = useState<any[]>(venues);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);

  // Update filtered venues when venues, search, filter, or sort changes
  useEffect(() => {
    let result = [...venues];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(venue => 
        venue.name.toLowerCase().includes(query) ||
        venue.city.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(venue => venue.status === statusFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'city':
          return a.city.localeCompare(b.city);
        case 'capacity':
          return (b.capacity || 0) - (a.capacity || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          // Venues with date come first, then sort by date
          if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
      }
    });
    
    setFilteredVenues(result);
  }, [venues, searchQuery, statusFilter, sortBy]);

  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue);
    onVenueClick(venue);
  };

  const handleStatusUpdate = async () => {
    // Refetch venues after status update
    refetch();
    setSelectedVenue(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Venues list and filters */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex gap-2 w-full md:w-1/2">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search venues..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-1/2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="potential">Potential</SelectItem>
                    <SelectItem value="hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="name">Venue Name</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="capacity">Capacity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.length > 0 ? (
                    filteredVenues.map(venue => (
                      <TableRow key={venue.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => handleVenueClick(venue)} className="font-medium">
                          {venue.name}
                        </TableCell>
                        <TableCell onClick={() => handleVenueClick(venue)}>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                            {venue.city}{venue.region ? `, ${venue.region}` : ''}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleVenueClick(venue)}>
                          {venue.date ? formatDate(venue.date) : 'Not scheduled'}
                        </TableCell>
                        <TableCell onClick={() => handleVenueClick(venue)}>
                          <div className={`
                            inline-flex items-center rounded-full px-2 py-1 text-xs 
                            ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                            ${venue.status === 'potential' ? 'bg-blue-100 text-blue-700' : ''}
                            ${venue.status === 'hold' ? 'bg-amber-100 text-amber-700' : ''}
                            ${venue.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                            {venue.status}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleVenueClick(venue)}>
                          {venue.capacity ? (
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1 text-muted-foreground" />
                              {venue.capacity.toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVenueClick(venue)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No venues found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Venue details panel */}
      <div className="lg:col-span-1">
        {selectedVenue ? (
          <VenueDetail 
            venue={selectedVenue} 
            onStatusUpdate={handleStatusUpdate}
            tourId={tourId}
          />
        ) : (
          <Card className="border border-dashed h-full flex items-center justify-center p-6">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-1">Venue Details</h3>
              <p className="text-sm max-w-md">
                Select a venue from the list to view its details, update its status, 
                or see additional information.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}