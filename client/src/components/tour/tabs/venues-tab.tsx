import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Filter, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { VenueList } from '@/components/tour/venue-list';
import { VenueDetail } from '@/components/tour/venue-detail';
import { Badge } from '@/components/ui/badge';

interface VenuesTabProps {
  tour: any;
  venues: any[];
  filteredVenues: any[];
  showAllVenues: boolean;
  setShowAllVenues: (show: boolean) => void;
  selectedVenue: any;
  onVenueClick: (venue: any) => void;
  tourId: number;
  refetch: () => void;
}

export function VenuesTab({
  tour,
  venues,
  filteredVenues,
  showAllVenues,
  setShowAllVenues,
  selectedVenue,
  onVenueClick,
  tourId,
  refetch
}: VenuesTabProps) {
  // Count venues by status
  const confirmedCount = filteredVenues.filter(v => 
    v.status?.toLowerCase() === 'confirmed' || 
    v.status?.toLowerCase() === 'booked'
  ).length;

  const potentialCount = filteredVenues.filter(v => 
    v.status?.toLowerCase() === 'potential' || 
    v.status?.toLowerCase() === 'hold'
  ).length;

  const cancelledCount = filteredVenues.filter(v => 
    v.status?.toLowerCase() === 'cancelled'
  ).length;

  // Count venues by type
  const venueTypes = filteredVenues.reduce((acc: Record<string, number>, venue: any) => {
    const type = venue.venueType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const venueTypeEntries = Object.entries(venueTypes).sort((a, b) => b[1] - a[1]);

  // Calculate average capacity
  const averageCapacity = Math.round(
    filteredVenues.reduce((sum, venue) => sum + (venue.capacity || 0), 0) / 
    filteredVenues.length || 1
  );

  return (
    <div className="space-y-6">
      {/* Venues Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5 text-muted-foreground" />
              Tour Venues
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage venues included in this tour
            </p>
          </div>
          <div className="flex space-x-2">
            <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Venue
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="border-t pt-4">
          <div className="flex items-center">
            <Switch
              id="showAllVenues"
              checked={showAllVenues}
              onCheckedChange={setShowAllVenues}
            />
            <Label htmlFor="showAllVenues" className="ml-2 text-sm">
              Show suggested venues
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Venue List and Detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Venue List: 8 columns on md+ screens */}
        <div className="md:col-span-8">
          <Card className="h-[calc(100vh-300px)] overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-lg">
                {filteredVenues.length} Venues
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-full overflow-y-auto">
              <VenueList
                venues={filteredVenues}
                onVenueClick={onVenueClick}
                maxHeight={500}
                selectedVenueId={selectedVenue?.id}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Selected Venue Details: 4 columns on md+ screens */}
        <div className="md:col-span-4">
          {selectedVenue ? (
            <VenueDetail 
              venue={selectedVenue}
              onEdit={() => {}}
              refetch={refetch}
              tourId={tourId}
            />
          ) : (
            <Card className="flex items-center justify-center p-6 h-[400px]">
              <div className="text-center">
                <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Venue Selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a venue from the list to view details
                </p>
                <Button
                  variant="outline"
                  className="mx-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Venue
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Venue Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Venue Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Venues</p>
              <p className="text-2xl font-bold">{filteredVenues.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Confirmed</p>
              <p className="text-2xl font-bold">{confirmedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Potential</p>
              <p className="text-2xl font-bold">{potentialCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Average Capacity</p>
              <p className="text-2xl font-bold">{averageCapacity}</p>
            </div>
          </div>
          
          {venueTypeEntries.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Venue Categories</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {venueTypeEntries.slice(0, 5).map(([type, count]) => (
                  <div key={type} className="bg-muted p-3 rounded-md flex justify-between">
                    <span className="text-sm">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}