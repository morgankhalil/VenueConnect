import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Music,
  Users,
  CheckCircle2,
  Clock4,
  AlertCircle,
  XCircle,
  BarChart,
  Truck,
  CalendarRange,
  CalendarDays
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime, formatCapacity } from '@/lib/utils';

interface TourOverviewTabProps {
  tourData: any;
  venues: any[];
}

export function TourOverviewTab({ tourData, venues }: TourOverviewTabProps) {
  // Filter venues by status for summary stats
  const confirmedVenues = venues.filter(venue => venue.status === 'confirmed');
  const holdVenues = venues.filter(venue => venue.status === 'hold');
  const potentialVenues = venues.filter(venue => venue.status === 'potential');
  const cancelledVenues = venues.filter(venue => venue.status === 'cancelled');
  
  // Calculate average venue capacity
  const venuesWithCapacity = venues.filter(venue => venue.capacity);
  const averageCapacity = venuesWithCapacity.length > 0
    ? Math.round(venuesWithCapacity.reduce((acc, venue) => acc + venue.capacity, 0) / venuesWithCapacity.length)
    : 0;

  // Get summary of venue types
  const venueTypes = getVenueTypesSummary(venues);
  
  // Format dates
  const startDate = tourData?.startDate ? formatDate(tourData.startDate) : 'Not set';
  const endDate = tourData?.endDate ? formatDate(tourData.endDate) : 'Not set';
  
  // Calculate tour duration in days
  const durationDays = tourData?.startDate && tourData?.endDate
    ? Math.round((new Date(tourData.endDate).getTime() - new Date(tourData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Tour Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{tourData?.name || 'Tour'}</CardTitle>
              <CardDescription>
                {startDate} to {endDate}
                {durationDays > 0 && ` · ${durationDays} days`}
              </CardDescription>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Badge className={`px-3 py-1 ${tourData?.optimizationScore > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <BarChart className="h-3.5 w-3.5 mr-1" />
                Optimization Score: {tourData?.optimizationScore || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <CalendarRange className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Tour Duration</h3>
                <p className="text-muted-foreground text-sm">
                  {durationDays > 0 ? `${durationDays} days` : 'Not finalized'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Total Distance</h3>
                <p className="text-muted-foreground text-sm">{formatDistance(tourData?.totalDistance || 0)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Travel Time</h3>
                <p className="text-muted-foreground text-sm">{formatTravelTime(tourData?.travelTimeMinutes || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Venue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Venue Status</CardTitle>
            <CardDescription>Status breakdown of your tour venues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {confirmedVenues.length}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock4 className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">On Hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    {holdVenues.length}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {potentialVenues.length}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {cancelledVenues.length}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between font-medium">
                <span>Total Venues</span>
                <span>{venues.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tour Statistics</CardTitle>
            <CardDescription>Key metrics for your tour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Average Capacity</span>
                </div>
                <span>{formatCapacity(averageCapacity)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Venue Types</span>
                </div>
                <span>{venueTypes}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Regions</span>
                </div>
                <span>{countUniqueRegions(venues)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dates with Shows</span>
                </div>
                <span>{countDatesWithShows(venues)}</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Average Days Between Shows</span>
                </div>
                <span>{calculateAverageDaysBetweenShows(venues)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Start City</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{getStartCity(venues)}</div>
            <p className="text-sm text-muted-foreground">{getStartDate(venues)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">End City</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{getEndCity(venues)}</div>
            <p className="text-sm text-muted-foreground">{getEndDate(venues)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Largest Venue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{getLargestVenue(venues)}</div>
            <p className="text-sm text-muted-foreground">
              {getLargestVenueCapacity(venues) ? formatCapacity(getLargestVenueCapacity(venues)) : 'Unknown'} capacity
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to get a summary of venue types in the tour
function getVenueTypesSummary(venues: any[]): string {
  const venueTypesMap: Record<string, number> = {};
  
  venues.forEach(venue => {
    if (venue.venueType) {
      venueTypesMap[venue.venueType] = (venueTypesMap[venue.venueType] || 0) + 1;
    }
  });
  
  const venueTypes = Object.keys(venueTypesMap);
  
  if (venueTypes.length === 0) return 'Various';
  if (venueTypes.length === 1) return venueTypes[0];
  
  // Return top 2 most common types
  const sortedTypes = venueTypes.sort((a, b) => venueTypesMap[b] - venueTypesMap[a]);
  
  if (sortedTypes.length === 2) {
    return `${sortedTypes[0]} & ${sortedTypes[1]}`;
  }
  
  return `${sortedTypes[0]}, ${sortedTypes[1]} & others`;
}

// Helper function to count unique regions in the tour
function countUniqueRegions(venues: any[]): number {
  const uniqueRegions = new Set<string>();
  
  venues.forEach(venue => {
    if (venue.region) {
      uniqueRegions.add(venue.region);
    }
  });
  
  return uniqueRegions.size;
}

// Helper function to count number of days with shows
function countDatesWithShows(venues: any[]): number {
  const uniqueDates = new Set<string>();
  
  venues.forEach(venue => {
    if (venue.date) {
      uniqueDates.add(new Date(venue.date).toISOString().split('T')[0]);
    }
  });
  
  return uniqueDates.size;
}

// Helper function to calculate average days between shows
function calculateAverageDaysBetweenShows(venues: any[]): string {
  const venuesWithDates = venues
    .filter(venue => venue.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (venuesWithDates.length < 2) return 'N/A';
  
  let totalDaysBetween = 0;
  let countIntervals = 0;
  
  for (let i = 1; i < venuesWithDates.length; i++) {
    const currentDate = new Date(venuesWithDates[i].date);
    const previousDate = new Date(venuesWithDates[i - 1].date);
    
    const diffTime = Math.abs(currentDate.getTime() - previousDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      totalDaysBetween += diffDays;
      countIntervals++;
    }
  }
  
  if (countIntervals === 0) return '0 days';
  
  const average = totalDaysBetween / countIntervals;
  return `${average.toFixed(1)} days`;
}

// Helper function to get the start city of the tour
function getStartCity(venues: any[]): string {
  const venuesWithDates = venues
    .filter(venue => venue.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (venuesWithDates.length === 0) {
    return venues.length > 0 ? venues[0].city : 'Not set';
  }
  
  return venuesWithDates[0].city;
}

// Helper function to get the start date of the tour
function getStartDate(venues: any[]): string {
  const venuesWithDates = venues
    .filter(venue => venue.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (venuesWithDates.length === 0) return 'Date not set';
  
  return formatDate(venuesWithDates[0].date);
}

// Helper function to get the end city of the tour
function getEndCity(venues: any[]): string {
  const venuesWithDates = venues
    .filter(venue => venue.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (venuesWithDates.length === 0) {
    return venues.length > 0 ? venues[venues.length - 1].city : 'Not set';
  }
  
  return venuesWithDates[venuesWithDates.length - 1].city;
}

// Helper function to get the end date of the tour
function getEndDate(venues: any[]): string {
  const venuesWithDates = venues
    .filter(venue => venue.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (venuesWithDates.length === 0) return 'Date not set';
  
  return formatDate(venuesWithDates[venuesWithDates.length - 1].date);
}

// Helper function to get the name of the largest venue in the tour
function getLargestVenue(venues: any[]): string {
  const venuesWithCapacity = venues.filter(venue => venue.capacity);
  
  if (venuesWithCapacity.length === 0) return 'Unknown';
  
  const largestVenue = venuesWithCapacity.reduce((largest, current) => {
    return current.capacity > largest.capacity ? current : largest;
  }, venuesWithCapacity[0]);
  
  return largestVenue.name;
}

// Helper function to get the capacity of the largest venue
function getLargestVenueCapacity(venues: any[]): number {
  const venuesWithCapacity = venues.filter(venue => venue.capacity);
  
  if (venuesWithCapacity.length === 0) return 0;
  
  const largestVenue = venuesWithCapacity.reduce((largest, current) => {
    return current.capacity > largest.capacity ? current : largest;
  }, venuesWithCapacity[0]);
  
  return largestVenue.capacity;
}