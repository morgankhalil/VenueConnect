import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Building, Plus, Filter } from 'lucide-react';
import { VenueList } from '../venue-list';
import { TourVenueForm } from '../tour-venue-form';

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
  return (
    <div className="space-y-6">
      {/* Venue Management Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Tour Venues
            </CardTitle>
            <CardDescription>
              Manage venues included in this tour
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Add Venue to Tour</DialogTitle>
                  <DialogDescription>
                    Select a venue and configure its position in the tour.
                  </DialogDescription>
                </DialogHeader>
                <TourVenueForm 
                  tourId={tourId} 
                  onSuccess={() => {
                    refetch();
                  }} 
                />
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="px-4 py-2 border-b flex items-center">
            <Switch 
              id="show-all-venues" 
              checked={showAllVenues} 
              onCheckedChange={setShowAllVenues} 
            />
            <Label htmlFor="show-all-venues" className="ml-2">
              Show suggested venues
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Venue List */}
      <Card className="h-[calc(100vh-350px)]">
        <CardContent className="p-0 h-full overflow-hidden">
          <VenueList 
            venues={filteredVenues} 
            onVenueClick={onVenueClick}
            maxHeight={700}
            selectedVenueId={selectedVenue?.id}
            showDetailed={true}
          />
        </CardContent>
      </Card>

      {/* Venue Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Venue Statistics</CardTitle>
          <CardDescription>
            Overview of venue distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Venues</p>
              <p className="text-2xl font-bold">{venues.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Confirmed</p>
              <p className="text-2xl font-bold">{venues.filter(v => v.status === 'confirmed').length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Potential</p>
              <p className="text-2xl font-bold">{venues.filter(v => v.status === 'potential').length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Average Capacity</p>
              <p className="text-2xl font-bold">
                {Math.round(venues.reduce((sum, v) => sum + (v.venue?.capacity || 0), 0) / venues.length) || 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium mb-2">Venue Categories</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['club', 'theater', 'arena', 'festival', 'stadium'].map(type => {
                const count = venues.filter(v => v.venue?.venueType === type).length;
                return (
                  <div key={type} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="capitalize">{type}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VenuesTab;