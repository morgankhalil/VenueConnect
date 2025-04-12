import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Users, 
  Building, 
  Music, 
  Calendar as CalendarIcon,
  Truck, 
  BarChart 
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime } from '@/lib/utils';

interface TourOverviewTabProps {
  tourData: any;
  venues: any[];
}

export function TourOverviewTab({ tourData, venues }: TourOverviewTabProps) {
  if (!tourData) return null;
  
  const confirmedVenues = venues.filter(venue => venue.status === 'confirmed');
  const potentialVenues = venues.filter(venue => venue.status === 'potential');
  const onHoldVenues = venues.filter(venue => venue.status === 'hold');
  
  const tourLength = tourData.startDate && tourData.endDate 
    ? Math.ceil((new Date(tourData.endDate).getTime() - new Date(tourData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
    
  // Calculate the total audience capacity
  const totalCapacity = confirmedVenues.reduce((total, venue) => {
    return total + (venue.capacity || 0);
  }, 0);
  
  // Calculate average distance between venues
  const averageDistance = tourData.totalDistance && confirmedVenues.length > 1 
    ? tourData.totalDistance / (confirmedVenues.length - 1) 
    : 0;

  // Determine primary region/market
  const regionCounts: Record<string, number> = {};
  confirmedVenues.forEach(venue => {
    const region = venue.region || 'Unknown';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  
  const primaryRegion = Object.entries(regionCounts).reduce(
    (max, [region, count]) => count > (max.count || 0) ? { region, count } : max,
    { region: 'N/A', count: 0 }
  ).region;
  
  return (
    <div className="space-y-6">
      {/* Tour Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{tourData.name}</CardTitle>
              <CardDescription>
                {tourData.startDate && tourData.endDate ? (
                  <span>
                    {formatDate(tourData.startDate)} - {formatDate(tourData.endDate)}
                    {tourLength && <span> ({tourLength} days)</span>}
                  </span>
                ) : (
                  <span>Tour dates not finalized</span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                {confirmedVenues.length} confirmed
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                {potentialVenues.length} potential
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                {onHoldVenues.length} on hold
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Total Distance</h3>
                <p className="text-muted-foreground text-sm">{formatDistance(tourData.totalDistance)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Travel Time</h3>
                <p className="text-muted-foreground text-sm">{formatTravelTime(tourData.travelTimeMinutes)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Total Capacity</h3>
                <p className="text-muted-foreground text-sm">{totalCapacity.toLocaleString()} attendees</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tour Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Tour Analysis</CardTitle>
          <CardDescription>
            Metrics and insights for your tour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {confirmedVenues.length} confirmed venues across {tourLength || '?'} days
                  </span>
                </div>
                {tourData.startDate && tourData.endDate && (
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Tour runs from {formatDate(tourData.startDate)} to {formatDate(tourData.endDate)}
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="font-medium text-lg pt-2">Logistics</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Average distance between venues: {formatDistance(averageDistance)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Primary region: {primaryRegion}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Venues</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Average venue capacity: {confirmedVenues.length > 0 
                      ? Math.round(totalCapacity / confirmedVenues.length).toLocaleString() 
                      : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Venue types: {getVenueTypesSummary(confirmedVenues)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Optimization score: {tourData.optimizationScore ? `${tourData.optimizationScore}/100` : 'Not optimized'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {potentialVenues.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-md">
                <h3 className="font-medium">Confirm potential venues</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {potentialVenues.length} potential {potentialVenues.length === 1 ? 'venue' : 'venues'} that need to be confirmed
                </p>
              </div>
            )}
            
            {(!tourData.optimizationScore || tourData.optimizationScore < 70) && (
              <div className="p-3 bg-amber-50 rounded-md">
                <h3 className="font-medium">Optimize your tour route</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {!tourData.optimizationScore 
                    ? 'Optimize your tour to minimize travel time and distance' 
                    : 'Your tour optimization score is low, check the optimization tab for suggestions'}
                </p>
              </div>
            )}
            
            {!tourData.endDate && (
              <div className="p-3 bg-purple-50 rounded-md">
                <h3 className="font-medium">Set tour end date</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Setting an end date will help with planning and optimization
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline">Export Tour Summary</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper function to get venue types summary
function getVenueTypesSummary(venues: any[]): string {
  const typeCount: Record<string, number> = {};
  
  venues.forEach(venue => {
    if (venue.venueType) {
      typeCount[venue.venueType] = (typeCount[venue.venueType] || 0) + 1;
    }
  });
  
  const types = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
    
  return types || 'Various';
}