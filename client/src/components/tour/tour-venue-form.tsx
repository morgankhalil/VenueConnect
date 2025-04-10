import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { addVenueToTour } from '@/lib/api';
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

// Form schema for validating tour venue data
const tourVenueFormSchema = z.object({
  venueId: z.number({ required_error: 'Venue is required' }),
  date: z.date().optional(),
  status: z.string().default('pending'),
  sequence: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type TourVenueFormValues = z.infer<typeof tourVenueFormSchema>;

type TourVenueFormProps = {
  tourId: number;
  defaultValues?: Partial<TourVenueFormValues>;
  onSuccess?: (data: any) => void;
};

export function TourVenueForm({ tourId, defaultValues, onSuccess }: TourVenueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Get venues for the select input
  const { data: venues, isLoading: isLoadingVenues } = useQuery({
    queryKey: ['/api/venues'],
    queryFn: () => fetch('/api/venues').then(res => res.json()),
  });
  
  const form = useForm<TourVenueFormValues>({
    resolver: zodResolver(tourVenueFormSchema),
    defaultValues: defaultValues || {
      status: 'pending',
      notes: '',
    },
  });
  
  const onSubmit = async (data: TourVenueFormValues) => {
    setIsSubmitting(true);
    
    try {
      const result = await addVenueToTour(tourId, {
        venueId: data.venueId,
        status: data.status,
        date: data.date ? format(data.date, 'yyyy-MM-dd') : undefined,
        sequence: data.sequence,
        notes: data.notes,
      });
      
      toast({
        title: 'Venue Added',
        description: 'The venue has been added to the tour successfully.',
      });
      
      // Invalidate tour query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/tour/tours', tourId] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error adding venue to tour:', error);
      
      toast({
        title: 'Error',
        description: 'There was an error adding the venue to the tour. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="venueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingVenues ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    venues?.map((venue: any) => (
                      <SelectItem key={venue.id} value={venue.id.toString()}>
                        {venue.name} - {venue.city}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the venue to add to this tour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="tentative">Tentative</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
          <Button type="button" variant="outline" onClick={() => {
            if (onSuccess) onSuccess(null);
          }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Venue
          </Button>
        </div>
      </form>
    </Form>
  );
}