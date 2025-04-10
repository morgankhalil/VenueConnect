import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';

interface Venue {
  id: number;
  name: string;
  city: string;
  region?: string;
}

export function VenueSelector() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('/api/user')
  });

  // Get available venues
  const { data: venues } = useQuery({
    queryKey: ['/api/user/available-venues'],
    queryFn: () => apiRequest('/api/user/available-venues')
  });

  // Find current venue
  const currentVenue = venues?.find((venue: Venue) => 
    venue.id === user?.venueId
  );

  // Handle venue selection
  const selectVenue = async (venueId: number) => {
    setIsLoading(true);
    try {
      await apiRequest(`/api/select-venue/${venueId}`);
      
      // Invalidate user and venue network queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      if (user?.venueId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/venue-network/graph', user.venueId] 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: ['/api/venue-network/graph', venueId] 
      });
      
      toast({
        title: "Venue Changed",
        description: "You are now working with a different venue",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change venue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-4 flex items-center space-x-1">
          <MapPin className="h-4 w-4 mr-1" />
          <span>
            {currentVenue 
              ? `${currentVenue.name} (${currentVenue.city}${currentVenue.region ? `, ${currentVenue.region}` : ''})`
              : "Select Venue"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Switch Venue</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {venues && venues.length > 0 ? (
          venues.map((venue: Venue) => (
            <DropdownMenuItem
              key={venue.id}
              disabled={venue.id === user?.venueId || isLoading}
              onClick={() => selectVenue(venue.id)}
              className="cursor-pointer"
            >
              {venue.name} ({venue.city}{venue.region ? `, ${venue.region}` : ''})
              {venue.id === user?.venueId && (
                <span className="ml-2 text-green-600">●</span>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No venues available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}