import React, { useState } from 'react';
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
import { MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (venueId === user?.venueId) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/user/select-venue/${venueId}`);
      
      // Invalidate queries to refresh data across the application
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Invalidate venue-specific queries
      if (user?.venueId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/venue-network/graph', user.venueId] 
        });
      }
      
      // Invalidate queries for the newly selected venue
      queryClient.invalidateQueries({ 
        queryKey: ['/api/venue-network/graph', venueId] 
      });
      
      // Also invalidate general venue data and settings
      queryClient.invalidateQueries({ 
        queryKey: ['/api/venues'] 
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/settings']
      });
      
      toast({
        title: "Venue Changed",
        description: `Now managing: ${venues?.find(v => v.id === venueId)?.name || 'Selected venue'}`,
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
        <Button 
          variant="outline" 
          className="w-full justify-between border-[hsl(var(--custom-grey-light))] dark:border-[hsl(var(--custom-grey-dark))] bg-white dark:bg-black text-black dark:text-white"
          disabled={isLoading}
        >
          <div className="flex items-center overflow-hidden">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-[hsl(var(--custom-grey-medium))]" />
            <span className="truncate">
              {currentVenue 
                ? currentVenue.name
                : "Select Venue"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        <DropdownMenuLabel>Manage Venue</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {venues && venues.length > 0 ? (
          venues.map((venue: Venue) => (
            <DropdownMenuItem
              key={venue.id}
              disabled={venue.id === user?.venueId || isLoading}
              onClick={() => selectVenue(venue.id)}
              className={cn(
                "cursor-pointer justify-between",
                venue.id === user?.venueId ? "bg-primary/10" : ""
              )}
            >
              <div className="flex flex-col overflow-hidden mr-2">
                <span className="font-medium truncate">{venue.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {venue.city}{venue.region ? `, ${venue.region}` : ''}
                </span>
              </div>
              {venue.id === user?.venueId && (
                <span className="ml-2 text-green-600 flex-shrink-0">●</span>
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