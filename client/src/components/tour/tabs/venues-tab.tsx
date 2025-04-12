import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertTriangle,
  SearchIcon,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock4,
  XCircle,
  CalendarIcon,
  MapPin,
  Users,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  MusicIcon,
  BuildingIcon,
} from 'lucide-react';
import { VenueDetail } from '@/components/tour/venue-detail';
import { formatDate, formatCapacity } from '@/lib/utils';

interface VenuesTabProps {
  venues: any[];
  tourId: number;
  onStatusUpdate: () => void;
}

export function VenuesTab({ venues, tourId, onStatusUpdate }: VenuesTabProps) {
  // State for venue detail dialog
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Status state for filtering
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Search term
  const [searchTerm, setSearchTerm] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<string>('sequence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Confirmed
          </Badge>
        );
      case 'hold':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock4 className="h-3.5 w-3.5 mr-1" />
            Hold
          </Badge>
        );
      case 'potential':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Potential
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Filter venues by status and search term
  const filteredVenues = (venues || []).filter(venue => {
    const matchesSearch = 
      searchTerm === '' || 
      (venue?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (venue?.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(venue.status);

    return matchesSearch && matchesStatus;
  });

  // Sort venues
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    let valueA, valueB;

    switch (sortField) {
      case 'name':
        valueA = a.name || '';
        valueB = b.name || '';
        break;
      case 'city':
        valueA = a.city || '';
        valueB = b.city || '';
        break;
      case 'date':
        valueA = a.date ? new Date(a.date).getTime() : 0;
        valueB = b.date ? new Date(b.date).getTime() : 0;
        break;
      case 'capacity':
        valueA = a.capacity || 0;
        valueB = b.capacity || 0;
        break;
      case 'sequence':
      default:
        valueA = a.sequence || 0;
        valueB = b.sequence || 0;
        break;
    }

    // Compare values
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  // Open venue detail
  const handleOpenVenueDetail = (venue: any) => {
    setSelectedVenue(venue);
    setIsDetailOpen(true);
  };

  // Close venue detail
  const handleCloseVenueDetail = () => {
    setIsDetailOpen(false);
    setSelectedVenue(null);
  };

  // Venue detail update callback
  const handleVenueUpdate = () => {
    setIsDetailOpen(false);
    onStatusUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Venues Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Tour Venues</CardTitle>
              <CardDescription>
                Manage and view all venues for this tour
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {venues?.length || 0} venues
              </Badge>
              <Badge className="bg-green-100 text-green-700">
                {venues?.filter(v => v.status === 'confirmed')?.length || 0} confirmed
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-auto">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search venues..."
                className="pl-8 w-full sm:w-[260px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                    {statusFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-full px-1 text-xs">
                        {statusFilter.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter by Status</h4>
                    <div className="grid gap-2">
                      {['confirmed', 'hold', 'potential', 'cancelled'].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`status-${status}`} 
                            checked={statusFilter.includes(status)}
                            onCheckedChange={() => handleStatusFilter(status)}
                          />
                          <Label htmlFor={`status-${status}`} className="flex items-center gap-1.5 capitalize">
                            {status === 'confirmed' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                            {status === 'hold' && <Clock4 className="h-3.5 w-3.5 text-amber-500" />}
                            {status === 'potential' && <AlertCircle className="h-3.5 w-3.5 text-blue-500" />}
                            {status === 'cancelled' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {statusFilter.length > 0 && (
                      <>
                        <Separator />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setStatusFilter([])}
                        >
                          Clear filters
                        </Button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    <span>Sort</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">Sort by</h4>
                    <div className="grid gap-2">
                      {[
                        { id: 'sequence', label: 'Sequence' },
                        { id: 'name', label: 'Venue Name' },
                        { id: 'date', label: 'Date' },
                        { id: 'city', label: 'Location' },
                        { id: 'capacity', label: 'Capacity' }
                      ].map((option) => (
                        <Button
                          key={option.id}
                          variant={sortField === option.id ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start"
                          onClick={() => handleSort(option.id)}
                        >
                          {option.label}
                          {sortField === option.id && (
                            <span className="ml-auto">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Venues Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVenues.length > 0 ? (
                  sortedVenues.map((venue) => (
                    <TableRow 
                      key={venue.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenVenueDetail(venue)}
                    >
                      <TableCell>
                        <div className="font-medium">{venue.name}</div>
                        {venue.venueType && (
                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                            <BuildingIcon className="h-3 w-3 mr-1" />
                            {venue.venueType}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {venue.date ? (
                          <div className="flex items-center">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {formatDate(venue.date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          {venue.city}{venue.region ? `, ${venue.region}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        {venue.capacity ? (
                          <div className="flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {formatCapacity(venue.capacity)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(venue.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleOpenVenueDetail(venue);
                            }}>
                              View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertTriangle className="h-10 w-10 mb-2" />
                        {searchTerm || statusFilter.length > 0 ? (
                          <p>No venues match your search or filter criteria</p>
                        ) : (
                          <p>No venues found in this tour</p>
                        )}
                        {(searchTerm || statusFilter.length > 0) && (
                          <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter([]);
                            }}
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Venue Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl h-[80vh] overflow-y-auto p-0">
          {selectedVenue && (
            <VenueDetail 
              venue={selectedVenue}
              tourId={tourId}
              onClose={handleCloseVenueDetail}
              onUpdate={handleVenueUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}