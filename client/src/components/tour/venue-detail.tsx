import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Calendar, 
  Edit, 
  ExternalLink, 
  Link, 
  MapPin, 
  Phone, 
  UsersRound,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';

interface VenueDetailProps {
  venue: any;
  onEdit: () => void;
  tourId: number;
  refetch: () => void;
}

export function VenueDetail({ venue, onEdit, tourId, refetch }: VenueDetailProps) {
  if (!venue) return null;

  const getStatusVariant = (status?: string) => {
    if (!status) return 'outline';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'confirmed') return 'default';
    if (statusLower === 'potential') return 'secondary';
    if (statusLower === 'booked') return 'default';
    if (statusLower === 'hold') return 'warning';
    if (statusLower === 'cancelled') return 'destructive';
    
    return 'outline';
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">{venue.name}</CardTitle>
          <CardDescription className="flex items-center">
            <MapPin className="mr-1 h-3 w-3" />
            {venue.city}{venue.region ? `, ${venue.region}` : ''}
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(venue.status)}>
          {venue.status || 'Unknown'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Performance Info */}
          {venue.performanceDate && (
            <div className="bg-muted p-3 rounded-md space-y-1">
              <h4 className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                Performance Date
              </h4>
              <p className="text-lg font-medium">{formatDate(venue.performanceDate)}</p>
              {venue.performanceTime && (
                <p className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                  {venue.performanceTime}
                </p>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Contact Information</h4>
            {venue.website && (
              <div className="flex items-center text-sm">
                <Link className="h-4 w-4 mr-2 text-muted-foreground" />
                <a 
                  href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {venue.website}
                </a>
              </div>
            )}
            {venue.phoneNumber && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{venue.phoneNumber}</span>
              </div>
            )}
            {venue.contactName && (
              <div className="flex items-center text-sm">
                <UsersRound className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{venue.contactName}{venue.contactEmail ? ` (${venue.contactEmail})` : ''}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Venue Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-medium">{venue.capacity || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Venue Type</p>
              <p className="font-medium">{venue.venueType || 'Unknown'}</p>
            </div>
            {venue.bookedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Booked By</p>
                <p className="font-medium">{venue.bookedBy}</p>
              </div>
            )}
            {venue.genre && (
              <div>
                <p className="text-sm text-muted-foreground">Genre Focus</p>
                <p className="font-medium">{venue.genre}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {venue.notes && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Notes</h4>
              <p className="text-sm text-muted-foreground">{venue.notes}</p>
            </div>
          )}

          <div className="flex flex-col space-y-2 pt-4">
            <Button onClick={onEdit} variant="outline" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Venue
            </Button>
            <Button variant="outline" className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}