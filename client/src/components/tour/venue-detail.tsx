import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  ChevronsUpDown,
  MapPin,
  Phone,
  Mail,
  Users,
  Music,
  Clock,
  Building,
  DollarSign,
  ThumbsUp,
  Link as LinkIcon,
  Star,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDate, formatCurrency } from '@/lib/utils';

interface VenueDetailProps {
  venue: any;
  tourId: number;
  onStatusUpdate: () => void;
}

export function VenueDetail({ venue, tourId, onStatusUpdate }: VenueDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  if (!venue) return null;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === venue.status) return;
    
    setIsUpdating(true);
    try {
      const response = await apiRequest(`/api/tours/${tourId}/venues/${venue.tourVenueId}`, {
        method: 'PATCH',
        data: { status: newStatus }
      });
      
      if (response.success) {
        toast({
          title: 'Status Updated',
          description: `Venue status changed to ${newStatus}`,
          duration: 3000,
        });
        onStatusUpdate();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update venue status',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Format labels based on venue data
  const formattedCapacity = venue.capacity ? venue.capacity.toLocaleString() : 'Unknown';
  const formattedGenre = venue.primaryGenre || 'Various';
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{venue.name}</CardTitle>
            <CardDescription className="flex items-center text-sm mt-1">
              <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              {venue.city}{venue.region ? `, ${venue.region}` : ''}
              {venue.country && venue.country !== 'USA' ? `, ${venue.country}` : ''}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isUpdating}>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <span className={`
                  h-2 w-2 rounded-full mr-1
                  ${venue.status === 'confirmed' ? 'bg-green-500' : ''}
                  ${venue.status === 'potential' ? 'bg-blue-500' : ''}
                  ${venue.status === 'hold' ? 'bg-amber-500' : ''}
                  ${venue.status === 'cancelled' ? 'bg-red-500' : ''}
                `} />
                {venue.status}
                <ChevronsUpDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('confirmed')}>
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('potential')}>
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                Potential
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('hold')}>
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                On Hold
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('cancelled')}>
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pt-2">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {venue.date && (
            <div className="col-span-2">
              <div className="flex items-center text-sm font-medium">
                <CalendarIcon className="h-4 w-4 mr-1 text-primary" />
                Date
              </div>
              <div className="text-sm mt-1">
                {formatDate(venue.date)}
              </div>
            </div>
          )}
          
          <div>
            <div className="flex items-center text-sm font-medium">
              <Users className="h-4 w-4 mr-1 text-primary" />
              Capacity
            </div>
            <div className="text-sm mt-1">
              {formattedCapacity}
            </div>
          </div>
          
          <div>
            <div className="flex items-center text-sm font-medium">
              <Music className="h-4 w-4 mr-1 text-primary" />
              Genre Focus
            </div>
            <div className="text-sm mt-1">
              {formattedGenre}
            </div>
          </div>
          
          {venue.bookingLeadTime && (
            <div>
              <div className="flex items-center text-sm font-medium">
                <Clock className="h-4 w-4 mr-1 text-primary" />
                Booking Lead Time
              </div>
              <div className="text-sm mt-1">
                {venue.bookingLeadTime} days
              </div>
            </div>
          )}
          
          {venue.marketCategory && (
            <div>
              <div className="flex items-center text-sm font-medium">
                <Building className="h-4 w-4 mr-1 text-primary" />
                Market Type
              </div>
              <div className="text-sm mt-1 capitalize">
                {venue.marketCategory}
              </div>
            </div>
          )}
          
          {venue.typicalGuarantee && (
            <div>
              <div className="flex items-center text-sm font-medium">
                <DollarSign className="h-4 w-4 mr-1 text-primary" />
                Typical Guarantee
              </div>
              <div className="text-sm mt-1">
                {formatCurrency(venue.typicalGuarantee)}
              </div>
            </div>
          )}
          
          {venue.contactName && (
            <div className="col-span-2">
              <div className="flex items-center text-sm font-medium">
                <ThumbsUp className="h-4 w-4 mr-1 text-primary" />
                Contact
              </div>
              <div className="text-sm mt-1">
                {venue.contactName}
                {venue.contactPhone && (
                  <span className="flex items-center text-xs text-muted-foreground mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    {venue.contactPhone}
                  </span>
                )}
                {venue.contactEmail && (
                  <span className="flex items-center text-xs text-muted-foreground mt-1">
                    <Mail className="h-3 w-3 mr-1" />
                    {venue.contactEmail}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Separator className="my-3" />
        
        <div className="space-y-3">
          {venue.venueType && (
            <Badge variant="outline" className="mr-1">
              {venue.venueType}
            </Badge>
          )}
          {venue.productionQuality && (
            <Badge variant="outline" className="mr-1">
              {venue.productionQuality} production
            </Badge>
          )}
          {venue.independentlyOwned && (
            <Badge variant="outline" className="mr-1">
              Independent
            </Badge>
          )}
        </div>
        
        {venue.description && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              {venue.description}
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-0 pb-3">
        {venue.website && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
            <a href={venue.website} target="_blank" rel="noopener noreferrer">
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              Website
            </a>
          </Button>
        )}
        
        {venue.latitude && venue.longitude && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
            <a 
              href={`https://maps.google.com/?q=${venue.latitude},${venue.longitude}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <MapPin className="h-3.5 w-3.5 mr-1" />
              Map
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}