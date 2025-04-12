import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building, 
  Calendar, 
  Clock, 
  Globe, 
  Mail, 
  MapPin, 
  Music, 
  Phone, 
  Save, 
  User, 
  X,
} from 'lucide-react';

interface VenueDetailProps {
  venue: any;
  tourId: number;
  onUpdate: () => void;
  onClose?: () => void;
}

export function VenueDetail({ venue, tourId, onUpdate, onClose }: VenueDetailProps) {
  const [status, setStatus] = useState(venue.status || 'potential');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const updateVenueStatus = async () => {
    setIsUpdating(true);

    try {
      await apiRequest(`/api/tour-venues/${tourId}/${venue.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      toast({
        title: 'Status Updated',
        description: `${venue.name} status updated to ${status}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating venue status:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the venue status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
      setIsDialogOpen(false);
    }
  };

  const removeVenue = async () => {
    setIsUpdating(true);

    try {
      await apiRequest(`/api/tour-venues/${tourId}/${venue.id}`, {
        method: 'DELETE',
      });

      toast({
        title: 'Venue Removed',
        description: `${venue.name} has been removed from the tour`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error removing venue:', error);
      toast({
        title: 'Removal Failed',
        description: 'There was an error removing the venue from the tour',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{venue.name}</CardTitle>
          <Badge className={`
            ${status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
            ${status === 'potential' ? 'bg-blue-100 text-blue-700' : ''}
            ${status === 'hold' ? 'bg-amber-100 text-amber-700' : ''}
            ${status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
          `}>
            {status}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1" />
          {venue.city}
          {venue.region ? `, ${venue.region}` : ''}
          {venue.country ? `, ${venue.country}` : ''}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date information */}
        {venue.date && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Scheduled Date</h3>
              <div className="text-sm text-muted-foreground">{formatDate(venue.date)}</div>
              {venue.time && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {venue.time}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Venue details */}
        <div className="space-y-3">
          {venue.capacity && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Capacity: {venue.capacity.toLocaleString()}</span>
            </div>
          )}

          {venue.venueType && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Venue Type: {venue.venueType}</span>
            </div>
          )}

          {venue.primaryGenre && (
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Primary Genre: {venue.primaryGenre}</span>
            </div>
          )}

          {venue.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a 
                href={venue.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Visit Website
              </a>
            </div>
          )}

          {venue.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${venue.contactEmail}`}
                className="text-sm text-primary hover:underline"
              >
                {venue.contactEmail}
              </a>
            </div>
          )}

          {venue.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{venue.contactPhone}</span>
            </div>
          )}
        </div>

        {/* Status update section */}
        <div className="pt-3">
          <h3 className="text-sm font-medium mb-2">Update Status</h3>
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="potential">Potential</SelectItem>
                <SelectItem value="hold">On Hold</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Venue from Tour</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {venue.name} from this tour? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={removeVenue} disabled={isUpdating}>
                {isUpdating ? 'Removing...' : 'Remove Venue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={updateVenueStatus} disabled={isUpdating}>
          {isUpdating ? (
            'Updating...'
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Status
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}