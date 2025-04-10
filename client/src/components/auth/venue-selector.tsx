import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

interface Venue {
  id: number;
  name: string;
  city?: string;
  region?: string;
}

export function VenueSelector() {
  const { currentVenueId, switchVenue } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Fetch available venues for the user
  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ['/api/user/available-venues'],
    retry: false,
  });

  // Find and set the initially selected venue based on currentVenueId
  useEffect(() => {
    if (venues && currentVenueId) {
      const currentVenue = venues.find(venue => venue.id === currentVenueId);
      if (currentVenue) {
        setSelectedVenue(currentVenue);
      }
    }
  }, [venues, currentVenueId]);

  // Handle venue change
  const handleVenueChange = async (venue: Venue) => {
    try {
      await switchVenue(venue.id);
      setSelectedVenue(venue);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch venue. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedVenue ? (
            <span>{selectedVenue.name}</span>
          ) : (
            <span>Select venue...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search venue..." />
          <CommandEmpty>No venue found.</CommandEmpty>
          <CommandGroup>
            {venues.map((venue) => (
              <CommandItem
                key={venue.id}
                value={venue.name}
                onSelect={() => handleVenueChange(venue)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedVenue?.id === venue.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span>{venue.name}</span>
                {venue.city && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({venue.city}{venue.region ? `, ${venue.region}` : ''})
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}