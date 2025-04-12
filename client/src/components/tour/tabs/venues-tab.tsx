import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  MapPin,
  Building,
  Filter,
  Search,
  ChevronDown,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { formatDate, formatCapacity } from '@/lib/utils';
import { VenueDetail } from '../venue-detail';

interface VenuesTabProps {
  venues: any[];
  tourId: number;
  onStatusUpdate: () => void;
}

export function VenuesTab({ venues, tourId, onStatusUpdate }: VenuesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'capacity' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filteredVenues, setFilteredVenues] = useState<any[]>(venues);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  
  // Filter and sort venues when dependencies change
  useEffect(() => {
    let result = [...venues];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        venue => 
          venue.name?.toLowerCase().includes(lowerSearchTerm) ||
          venue.city?.toLowerCase().includes(lowerSearchTerm) ||
          venue.region?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(venue => venue.status === statusFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'capacity') {
        const capA = a.capacity || 0;
        const capB = b.capacity || 0;
        comparison = capA - capB;
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredVenues(result);
  }, [venues, searchTerm, statusFilter, sortBy, sortDirection]);
  
  // Handle sort change
  const handleSort = (field: 'date' | 'name' | 'capacity' | 'status') => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Confirmed
          </Badge>
        );
      case 'hold':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
            <Clock4 className="h-3.5 w-3.5 mr-1" />
            Hold
          </Badge>
        );
      case 'potential':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Potential
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };
  
  // Count venues by status
  const confirmedCount = venues.filter(v => v.status === 'confirmed').length;
  const holdCount = venues.filter(v => v.status === 'hold').length;
  const potentialCount = venues.filter(v => v.status === 'potential').length;
  const cancelledCount = venues.filter(v => v.status === 'cancelled').length;
  
  return (
    <div className="space-y-6">
      {selectedVenue ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setSelectedVenue(null)}>
            ← Back to Venues
          </Button>
          
          <VenueDetail 
            venue={selectedVenue} 
            tourId={tourId} 
            onStatusUpdate={() => {
              onStatusUpdate();
              setSelectedVenue(null);
            }} 
          />
        </div>
      ) : (
        <>
          {/* Venues Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Tour Venues</CardTitle>
                  <CardDescription>
                    Manage and organize your tour venues
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 flex gap-1 items-center">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {confirmedCount}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 flex gap-1 items-center">
                    <Clock4 className="h-3.5 w-3.5" /> {holdCount}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 flex gap-1 items-center">
                    <AlertCircle className="h-3.5 w-3.5" /> {potentialCount}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 flex gap-1 items-center">
                    <XCircle className="h-3.5 w-3.5" /> {cancelledCount}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                {/* Search Input */}
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search venues by name or location..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="hold">On Hold</SelectItem>
                      <SelectItem value="potential">Potential</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Venues Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      Venue
                      {sortBy === 'name' && (
                        <ChevronDown 
                          className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                    <div className="flex items-center">
                      Date
                      {sortBy === 'date' && (
                        <ChevronDown 
                          className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('capacity')}>
                    <div className="flex items-center">
                      Capacity
                      {sortBy === 'capacity' && (
                        <ChevronDown 
                          className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      {sortBy === 'status' && (
                        <ChevronDown 
                          className={`h-4 w-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No venues found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVenues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{venue.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {venue.city}{venue.region ? `, ${venue.region}` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {venue.date ? (
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                            <span>{formatDate(venue.date)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {venue.capacity ? (
                          <div className="flex items-center">
                            <Building className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                            <span>{formatCapacity(venue.capacity)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(venue.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedVenue(venue)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}