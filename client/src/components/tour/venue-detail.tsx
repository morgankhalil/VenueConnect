import React, { useState } from 'react';
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
import { formatDate } from '@/lib/utils';
import {
  Building,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Music,
  Phone,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VenueDetailProps {
  venue: any;
  onEdit?: () => void;
  tourId: number;
  refetch: () => void;
}

export function VenueDetail({ venue, onEdit, tourId, refetch }: VenueDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await apiRequest(`/api/tours/${tourId}/venues/${venue.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      toast({
        title: 'Status updated',
        description: `Venue status updated to ${newStatus}`,
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Error updating status',
        description: 'There was a problem updating the venue status',
        variant: 'destructive',
      });
    }
    setUpdating(false);
  };
  
  const handleRemoveVenue = async () => {
    setUpdating(true);
    try {
      await apiRequest(`/api/tours/${tourId}/venues/${venue.id}`, {
        method: 'DELETE',
      });
      
      toast({
        title: 'Venue removed',
        description: 'Venue has been removed from the tour',
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Error removing venue',
        description: 'There was a problem removing the venue from the tour',
        variant: 'destructive',
      });
    }
    setUpdating(false);
    setConfirmDelete(false);
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{venue.name}</CardTitle>
          
          <Badge variant={
            venue.status === 'confirmed' ? 'default' :
            venue.status === 'potential' ? 'secondary' :
            venue.status === 'hold' ? 'outline' :
            venue.status === 'cancelled' ? 'destructive' : 
            'outline'
          }>
            {venue.status || 'Unknown'}
          </Badge>
        </div>
        <CardDescription className="flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          {venue.city}{venue.region ? `, ${venue.region}` : ''}{venue.country ? `, ${venue.country}` : ''}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Performance Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Performance Details</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {venue.performanceDate ? formatDate(venue.performanceDate) : 'No date set'}
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {venue.performanceTime || 'No time set'}
              </div>
              <div className="flex items-center text-sm">
                <DollarSign className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {venue.fee ? `$${venue.fee}` : 'No fee set'}
              </div>
              <div className="flex items-center text-sm">
                <Star className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {venue.deal || 'No deal set'}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Venue Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Venue Information</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center text-sm">
                <Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                Capacity: {venue.capacity || 'Unknown'}
              </div>
              <div className="flex items-center text-sm">
                <Music className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {venue.venueType || 'Unknown type'}
              </div>
            </div>
            
            {venue.website && (
              <div className="flex items-center text-sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {venue.website}
                </a>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Contact Information</h4>
            {venue.contactName || venue.contactEmail || venue.contactPhone ? (
              <div className="space-y-1">
                {venue.contactName && (
                  <div className="flex items-center text-sm">
                    <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    {venue.contactName}
                  </div>
                )}
                {venue.contactEmail && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <a href={`mailto:${venue.contactEmail}`} className="text-primary hover:underline">
                      {venue.contactEmail}
                    </a>
                  </div>
                )}
                {venue.contactPhone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <a href={`tel:${venue.contactPhone}`} className="text-primary hover:underline">
                      {venue.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No contact information available</p>
            )}
          </div>
          
          {/* Notes */}
          {venue.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Notes
                </h4>
                <p className="text-sm">{venue.notes}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-4">
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Venue</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove {venue.name} from this tour? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRemoveVenue} disabled={updating}>
                  {updating ? 'Removing...' : 'Remove Venue'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="space-x-2">
          {venue.status !== 'confirmed' && (
            <Button size="sm" onClick={() => handleStatusChange('confirmed')} disabled={updating}>
              Confirm Venue
            </Button>
          )}
          
          {venue.status !== 'potential' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('potential')} disabled={updating}>
              Mark as Potential
            </Button>
          )}
          
          {venue.status !== 'hold' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('hold')} disabled={updating}>
              Put on Hold
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}