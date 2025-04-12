import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  BarChart3, 
  Music, 
  Users, 
  Wallet, 
  Edit, 
  Building,
  Clock,
  Route
} from 'lucide-react';
import { StatCard } from '../stat-card';
import { formatCurrency, formatDate, formatDistance, formatTravelTime } from '@/lib/utils';

interface TourStats {
  totalVenues: number;
  confirmedVenues: number;
  potentialVenues: number;
  estimatedDistance: number;
  estimatedTravelTime: number;
  budget: number;
}

interface TourOverviewTabProps {
  tour: any;
  stats: TourStats;
}

export function TourOverviewTab({ tour, stats }: TourOverviewTabProps) {
  const getTourStatusVariant = (status?: string) => {
    if (!status) return 'outline';
    
    switch (status.toLowerCase()) {
      case 'planning': return 'outline';
      case 'booked':
      case 'confirmed': return 'default';
      case 'in-progress': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Tour Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{tour.name}</CardTitle>
            <CardDescription className="flex items-center">
              <Music className="mr-1 h-4 w-4 text-muted-foreground" />
              {tour.artist?.name || 'No artist assigned'}
              <span className="mx-2">•</span>
              <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
              {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getTourStatusVariant(tour.status)}>
              {tour.status || 'Planning'}
            </Badge>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-3 w-3" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {tour.notes || 'No tour notes added yet.'}
          </div>
        </CardContent>
      </Card>

      {/* Tour Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Venues" 
          value={stats.totalVenues.toString()} 
          subtitle={`${stats.confirmedVenues} confirmed, ${stats.potentialVenues} potential`}
          icon={<Building className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Distance" 
          value={formatDistance(stats.estimatedDistance)} 
          subtitle="Estimated travel distance"
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Travel Time" 
          value={formatTravelTime(stats.estimatedTravelTime)} 
          subtitle="Estimated time on the road"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Budget" 
          value={formatCurrency(stats.budget)} 
          subtitle="Total tour budget"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard 
          title="Tour Type" 
          value={tour.type || 'Not specified'} 
          subtitle="Type of performances"
          icon={<Music className="h-4 w-4 text-muted-foreground" />}
        />
        {tour.optimizationScore ? (
          <StatCard 
            title="Optimization" 
            value={`${tour.optimizationScore}/100`} 
            subtitle="Route optimization score"
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          />
        ) : (
          <StatCard 
            title="Optimization" 
            value="Not optimized" 
            subtitle="Route not yet optimized"
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          />
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Tour Details
          </Button>
          <Button size="sm" variant="outline">
            <Building className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
          <Button size="sm" variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Invite Team Members
          </Button>
          <Button size="sm" variant="outline">
            <CalendarDays className="mr-2 h-4 w-4" />
            Export Calendar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}