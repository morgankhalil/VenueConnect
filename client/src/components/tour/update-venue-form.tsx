import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { updateTourVenue } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  TOUR_VENUE_STATUSES, 
  STATUS_DISPLAY_NAMES, 
  STATUS_DESCRIPTIONS 
} from '@/lib/tour-status';

// Form schema for validating tour venue updates
const updateVenueFormSchema = z.object({
  date: z.date().optional(),
  status: z.string().default('potential'),
  sequence: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type UpdateVenueFormValues = z.infer<typeof updateVenueFormSchema>;

type UpdateVenueFormProps = {
  tourId: number;
  venueData: any; // Will contain venue and tourVenue data
  onSuccess?: () => void;
};

export function UpdateVenueForm({ tourId, venueData, onSuccess }: UpdateVenueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Parse date if available
  const defaultDate = venueData.tourVenue.date ? new Date(venueData.tourVenue.date) : undefined;
  
  const form = useForm<UpdateVenueFormValues>({
    resolver: zodResolver(updateVenueFormSchema),
    defaultValues: {
      // Map legacy statuses to new simplified system
      status: venueData.tourVenue.status ? 
        ((status) => {
          // Map legacy statuses to the new simplified system
          const normalizedStatus = status.toLowerCase();
          if (normalizedStatus.startsWith('hold') || 
              normalizedStatus === 'contacted' || 
              normalizedStatus === 'negotiating' ||
              normalizedStatus === 'pending' || 
              normalizedStatus === 'tentative' ||
              normalizedStatus === 'requested') {
            return 'hold';
          } else if (normalizedStatus === 'suggested' || 
                     normalizedStatus === 'proposed') {
            return 'potential';
          } else if (normalizedStatus === 'confirmed') {
            return 'confirmed';
          } else if (normalizedStatus === 'cancelled') {
            return 'cancelled';
          }
          return 'potential'; // Default for unknown statuses
        })(venueData.tourVenue.status)
        : 'potential',
      sequence: venueData.tourVenue.sequence || undefined,
      date: defaultDate,
      notes: venueData.tourVenue.notes || '',
    },
  });
  
  // Update tour venue mutation
  const updateVenueMutation = useMutation({
    mutationFn: (data: UpdateVenueFormValues) => {
      // Format the date if it exists
      const formattedData = {
        ...data,
        date: data.date ? format(data.date, 'yyyy-MM-dd') : undefined,
      };
      
      return updateTourVenue(tourId, venueData.tourVenue.id, formattedData);
    },
    onSuccess: () => {
      toast({
        title: 'Venue Updated',
        description: 'The venue details have been updated successfully.',
      });
      
      // Invalidate tour query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tour/tours', tourId] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error('Error updating venue:', error);
      
      toast({
        title: 'Error',
        description: 'There was an error updating the venue details. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = async (data: UpdateVenueFormValues) => {
    setIsSubmitting(true);
    updateVenueMutation.mutate(data);
    setIsSubmitting(false);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Performance Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When is the show at this venue?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Venue Status</SelectLabel>
                      {TOUR_VENUE_STATUSES.map((status) => (
                        <SelectItem 
                          key={status} 
                          value={status}
                          title={STATUS_DESCRIPTIONS[status]}
                          className={`${
                            status === 'confirmed' ? 'text-green-700' :
                            status === 'hold' ? 'text-amber-700' :
                            status === 'potential' ? 'text-orange-700' :
                            status === 'cancelled' ? 'text-red-700' : ''
                          }`}
                        >
                          {STATUS_DISPLAY_NAMES[status]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current booking status at this venue.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="sequence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sequence</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="e.g., 1" 
                  {...field}
                  value={field.value === undefined ? '' : field.value}
                />
              </FormControl>
              <FormDescription>
                Order of this venue in the tour (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any notes about this venue" 
                  className="min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Any additional details about this venue on the tour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || updateVenueMutation.isPending}
          >
            {(isSubmitting || updateVenueMutation.isPending) && 
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            }
            Update Venue
          </Button>
        </div>
      </form>
    </Form>
  );
}