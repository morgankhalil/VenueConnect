import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Clock,
  BarChart,
  Users,
  Music,
  Building,
  Truck,
  DollarSign,
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  Clock4,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { 
  formatDate, 
  formatDistance, 
  formatTravelTime, 
  formatCapacity, 
  formatCurrency 
} from '@/lib/utils';

interface TourOverviewTabProps {
  tourData: any;
  venues: any[];
}

export function TourOverviewTab({ tourData, venues }: TourOverviewTabProps) {
  if (!tourData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p>Tour data not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate tour statistics
  const confirmedVenues = venues.filter(v => v.status === 'confirmed');
  const potentialVenues = venues.filter(v => v.status === 'potential' || v.status === 'hold');
  const cancelledVenues = venues.filter(v => v.status === 'cancelled');
  
  // Total capacity (based on confirmed venues)
  const totalCapacity = confirmedVenues.reduce((sum, venue) => sum + (venue.capacity || 0), 0);
  
  // Average venue capacity
  const avgCapacity = confirmedVenues.length 
    ? Math.round(confirmedVenues.reduce((sum, venue) => sum + (venue.capacity || 0), 0) / confirmedVenues.length) 
    : 0;
  
  // Total distance and travel time
  const totalDistance = tourData.totalDistance || 0;
  const travelTime = tourData.travelTimeMinutes || 0;
  
  // Revenue potential (very simple calculation)
  const estimatedRevenue = totalCapacity * 25; // $25 average ticket price
  
  // Tour duration in days
  const tourDuration = tourData.startDate && tourData.endDate
    ? Math.ceil((new Date(tourData.endDate).getTime() - new Date(tourData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  
  // Regions covered
  const regions = Array.from(new Set(venues.map(v => v.region).filter(Boolean)));
  
  // Market distribution
  const marketCategories = venues.reduce((acc: any, venue) => {
    if (venue.marketCategory) {
      acc[venue.marketCategory] = (acc[venue.marketCategory] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Status card colors  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'hold': return 'bg-amber-100 text-amber-700';
      case 'potential': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle2 className="h-3.5 w-3.5 mr-1" />;
      case 'hold': return <Clock4 className="h-3.5 w-3.5 mr-1" />;
      case 'potential': return <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      case 'cancelled': return <XCircle className="h-3.5 w-3.5 mr-1" />;
      default: return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Main Tour Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{tourData.name}</CardTitle>
              <CardDescription className="mt-1">
                {tourData.startDate && tourData.endDate 
                  ? `${formatDate(tourData.startDate)} - ${formatDate(tourData.endDate)}`
                  : 'Dates not finalized'}
              </CardDescription>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Badge className={`px-3 py-1 ${tourData.optimizationScore > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <BarChart className="h-3.5 w-3.5 mr-1" />
                Optimization Score: {tourData.optimizationScore || 'Not optimized'}
              </Badge>
              
              {tourDuration > 0 && (
                <Badge variant="outline">
                  <CalendarRange className="h-3.5 w-3.5 mr-1" />
                  {tourDuration} days
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Venues Summary */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Venues</h3>
                <p className="text-muted-foreground">{venues.length} total</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {confirmedVenues.length > 0 && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {confirmedVenues.length} confirmed
                    </Badge>
                  )}
                  {potentialVenues.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {potentialVenues.length} pending
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Capacity Summary */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Capacity</h3>
                <p className="text-muted-foreground">
                  {formatCapacity(totalCapacity)} total
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCapacity(avgCapacity)} avg. per venue
                </p>
              </div>
            </div>
            
            {/* Route Summary */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Distance</h3>
                <p className="text-muted-foreground">
                  {formatDistance(totalDistance)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Travel time: {formatTravelTime(travelTime)}
                </p>
              </div>
            </div>
            
            {/* Revenue Potential */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Revenue Potential</h3>
                <p className="text-muted-foreground">
                  {formatCurrency(estimatedRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on confirmed venues
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Status Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Venue Status Overview</CardTitle>
            <CardDescription>
              Summary of venue booking statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { status: 'confirmed', count: confirmedVenues.length },
                  { status: 'hold', count: venues.filter(v => v.status === 'hold').length },
                  { status: 'potential', count: venues.filter(v => v.status === 'potential').length },
                  { status: 'cancelled', count: cancelledVenues.length }
                ].map(item => (
                  <div key={item.status} className={`p-4 rounded-md ${getStatusColor(item.status)} bg-opacity-20`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{item.status}</span>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2 mt-2">
                <div className="text-sm text-muted-foreground">Booking Progress</div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  {venues.length > 0 && (
                    <>
                      <div 
                        className="h-full bg-green-500 float-left" 
                        style={{ width: `${(confirmedVenues.length / venues.length) * 100}%` }}
                      ></div>
                      <div 
                        className="h-full bg-amber-500 float-left" 
                        style={{ width: `${(venues.filter(v => v.status === 'hold').length / venues.length) * 100}%` }}
                      ></div>
                      <div 
                        className="h-full bg-blue-500 float-left" 
                        style={{ width: `${(venues.filter(v => v.status === 'potential').length / venues.length) * 100}%` }}
                      ></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Market & Region Details</CardTitle>
            <CardDescription>
              Market categories and geographic coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Market Category Breakdown */}
              <div>
                <h3 className="text-sm font-medium mb-2">Market Categories</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(marketCategories).length > 0 ? (
                    Object.entries(marketCategories).map(([category, count]: [string, any]) => (
                      <Badge 
                        key={category}
                        variant="outline" 
                        className="justify-between px-3 py-1.5"
                      >
                        <span className="capitalize">{category}</span>
                        <span className="bg-muted ml-2 px-1.5 py-0.5 rounded-full text-xs">
                          {count}
                        </span>
                      </Badge>
                    ))
                  ) : (
                    <div className="col-span-3 text-sm text-muted-foreground">
                      No market data available
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Regions Covered */}
              <div>
                <h3 className="text-sm font-medium mb-2">Regions Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {regions.length > 0 ? (
                    regions.map(region => (
                      <Badge key={region} variant="outline" className="px-3 py-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {region}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No region data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Important Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Important Dates</CardTitle>
          <CardDescription>
            Key dates and deadlines for your tour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-3 border rounded-md">
              <div className="bg-primary/10 p-2 rounded-full">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Tour Start</h3>
                <p className="text-muted-foreground">
                  {tourData.startDate ? formatDate(tourData.startDate) : 'Not set'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-md">
              <div className="bg-primary/10 p-2 rounded-full">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Tour End</h3>
                <p className="text-muted-foreground">
                  {tourData.endDate ? formatDate(tourData.endDate) : 'Not set'}
                </p>
              </div>
            </div>
            
            {confirmedVenues.length > 0 && (
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Building className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">First Confirmed Venue</h3>
                  <p className="text-muted-foreground">
                    {confirmedVenues[0].date ? formatDate(confirmedVenues[0].date) : 'Date TBD'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {confirmedVenues[0].name}
                  </p>
                </div>
              </div>
            )}
            
            {tourData.createdAt && (
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Tour Created</h3>
                  <p className="text-muted-foreground">
                    {formatDate(tourData.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}