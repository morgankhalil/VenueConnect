import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { VenueDetail } from '@/components/tour/venue-detail';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import { Check, ChevronsUpDown, Filter, MapPin, Building, Search, Calendar } from 'lucide-react';

interface VenuesTabProps {
  venues: any[];
  tourId: number;
  onVenueClick: (venue: any) => void;
  refetch: () => void;
}

export function VenuesTab({ venues, tourId, onVenueClick, refetch }: VenuesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  
  // Filter venues based on search query and status filter
  const filteredVenues = venues.filter(venue => {
    const matchesSearch = searchQuery === '' || 
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.region?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === null || venue.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Sort venues by status (confirmed first, then others)
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
    if (a.status !== 'confirmed' && b.status === 'confirmed') return 1;
    
    // If same status, sort by performance date if available
    if (a.performanceDate && b.performanceDate) {
      return new Date(a.performanceDate).getTime() - new Date(b.performanceDate).getTime();
    }
    
    // Otherwise, sort by name
    return a.name.localeCompare(b.name);
  });
  
  const handleVenueSelect = (venue: any) => {
    setSelectedVenue(venue);
    onVenueClick(venue);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Venues List */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Tour Venues</h2>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search venues..."
                className="pl-8 w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                  {statusFilter && <Badge variant="secondary" className="ml-2">{statusFilter}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  <div className="flex items-center justify-between w-full">
                    All Venues
                    {statusFilter === null && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('confirmed')}>
                  <div className="flex items-center justify-between w-full">
                    Confirmed
                    {statusFilter === 'confirmed' && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('potential')}>
                  <div className="flex items-center justify-between w-full">
                    Potential
                    {statusFilter === 'potential' && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('hold')}>
                  <div className="flex items-center justify-between w-full">
                    Hold
                    {statusFilter === 'hold' && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                  <div className="flex items-center justify-between w-full">
                    Cancelled
                    {statusFilter === 'cancelled' && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVenues.length > 0 ? (
                  sortedVenues.map(venue => (
                    <TableRow 
                      key={venue.id}
                      className={`cursor-pointer ${selectedVenue?.id === venue.id ? 'bg-primary/5' : ''}`}
                      onClick={() => handleVenueSelect(venue)}
                    >
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          venue.status === 'confirmed' ? 'default' :
                          venue.status === 'potential' ? 'secondary' :
                          venue.status === 'hold' ? 'outline' :
                          venue.status === 'cancelled' ? 'destructive' :
                          'outline'
                        }>
                          {venue.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {venue.city}{venue.region ? `, ${venue.region}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        {venue.performanceDate ? formatDate(venue.performanceDate) : 'Not scheduled'}
                      </TableCell>
                      <TableCell>{venue.capacity || 'Unknown'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {searchQuery || statusFilter 
                        ? 'No venues match your filters'
                        : 'No venues added to this tour yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Venue Details */}
      <div className="md:col-span-1">
        {selectedVenue ? (
          <VenueDetail 
            venue={selectedVenue} 
            onEdit={() => console.log('Edit venue', selectedVenue.id)}
            tourId={tourId}
            refetch={refetch}
          />
        ) : (
          <Card className="h-full flex flex-col items-center justify-center text-center p-6">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Venue</h3>
            <p className="text-muted-foreground">
              Click on any venue from the list to view its details
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}