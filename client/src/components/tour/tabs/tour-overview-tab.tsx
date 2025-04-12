import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/tour/stat-card';
import { 
  Building, 
  Calendar, 
  Clock, 
  DollarSign,
  Route, 
  CheckCircle2
} from 'lucide-react';
import { formatDate, formatDistance, formatTravelTime, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { calculatePercentageImprovement } from '@/lib/utils';

interface TourStatsProps {
  totalVenues: number;
  confirmedVenues: number;
  potentialVenues: number;
  estimatedDistance: number;
  estimatedTravelTime: number;
  budget: number;
}

interface TourOverviewTabProps {
  tour: any;
  stats: TourStatsProps;
}

export function TourOverviewTab({ tour, stats }: TourOverviewTabProps) {
  // Calculate improvement percentages if optimization was done
  const distanceImprovement = tour.initialTotalDistance && tour.totalDistance
    ? calculatePercentageImprovement(tour.initialTotalDistance, tour.totalDistance)
    : undefined;

  const timeImprovement = tour.initialTravelTimeMinutes && tour.travelTimeMinutes
    ? calculatePercentageImprovement(tour.initialTravelTimeMinutes, tour.travelTimeMinutes)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Tour Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tour Summary</CardTitle>
          <CardDescription>Overview of your tour details and statistics</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                Tour Dates
              </h4>
              <p className="text-lg font-medium">
                {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                {getDurationInDays(tour.startDate, tour.endDate)} days
              </p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                Venues
              </h4>
              <p className="text-lg font-medium">
                {stats.totalVenues} Total
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.confirmedVenues} Confirmed, {stats.potentialVenues} Potential
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center">
                <Route className="h-4 w-4 mr-2 text-muted-foreground" />
                Travel Distance
              </h4>
              <p className="text-lg font-medium">
                {formatDistance(stats.estimatedDistance)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatTravelTime(stats.estimatedTravelTime)} estimated travel time
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                Budget
              </h4>
              <p className="text-lg font-medium">
                {formatCurrency(stats.budget)}
              </p>
              <p className="text-sm text-muted-foreground">
                Tour budget estimated
              </p>
            </div>
          </div>
          
          {tour.optimizationScore && (
            <div className="bg-primary/10 p-4 rounded-lg mt-2 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
              <div>
                <p className="font-medium">Tour is optimized</p>
                <p className="text-sm text-muted-foreground">
                  This tour has been optimized with a score of {tour.optimizationScore}/100
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tour Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Distance"
          value={formatDistance(tour.totalDistance || 0)}
          subtitle="Distance between all venues"
          icon={<Route className="h-5 w-5 text-primary" />}
          improvement={distanceImprovement}
        />
        <StatCard
          title="Travel Time"
          value={formatTravelTime(tour.travelTimeMinutes || 0)}
          subtitle="Estimated driving time"
          icon={<Clock className="h-5 w-5 text-primary" />}
          improvement={timeImprovement}
        />
        <StatCard
          title="Venues"
          value={`${stats.totalVenues}`}
          subtitle={`${stats.confirmedVenues} confirmed / ${stats.potentialVenues} potential`}
          icon={<Building className="h-5 w-5 text-primary" />}
        />
      </div>
      
      {/* Artist Info & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Artist Info */}
        <Card>
          <CardHeader>
            <CardTitle>Artist Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Artist/Band Name</h4>
                <p className="font-medium">{tour.artistName || 'Not specified'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Genre</h4>
                <div className="flex flex-wrap gap-2">
                  {tour.genre ? (
                    <Badge variant="outline">{tour.genre}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Manager Contact</h4>
                <p className="font-medium">{tour.managerContact || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tour Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Tour Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tour.notes ? (
                <p>{tour.notes}</p>
              ) : (
                <p className="text-muted-foreground italic">No notes have been added to this tour.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to calculate the duration in days
function getDurationInDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}