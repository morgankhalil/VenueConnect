import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { createTour, updateTour } from '@/lib/api';
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
import { useNavigate } from 'react-router-dom';


// Form schema for validating tour data
const tourFormSchema = z.object({
  name: z.string().min(3, { message: 'Tour name must be at least 3 characters long' }),
  artistId: z.number({ required_error: 'Artist is required' }),
  status: z.string().optional(),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional().refine(
    (date, ctx) => {
      const startDate = ctx.parent.startDate;
      if (date && startDate && date < startDate) {
        return false;
      }
      return true;
    },
    { message: 'End date cannot be before start date' }
  ),
  totalBudget: z.coerce.number().min(0).optional(),
});

type TourFormValues = z.infer<typeof tourFormSchema>;

type TourFormProps = {
  tourId?: number;
  defaultValues?: Partial<TourFormValues>;
  onSuccess?: (data: any) => void;
};

export function TourForm({ tourId, defaultValues, onSuccess }: TourFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Get artists for the select input
  const { data: artists, isLoading: isLoadingArtists } = useQuery({
    queryKey: ['/api/artists'],
    queryFn: () => fetch('/api/artists').then(res => res.json()),
  });

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourFormSchema),
    defaultValues: defaultValues || {
      name: '',
      status: 'planning',
      description: '',
      totalBudget: undefined,
    },
  });

  const onSubmit = async (data: TourFormValues) => {
    setIsSubmitting(true);

    try {
      let result;

      if (tourId) {
        // Update existing tour
        result = await updateTour(tourId, {
          name: data.name,
          status: data.status,
          description: data.description,
          startDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : undefined,
          endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined,
          totalBudget: data.totalBudget,
        });

        toast({
          title: 'Tour Updated',
          description: 'The tour has been updated successfully.',
        });
      } else {
        // Create new tour
        result = await createTour({
          name: data.name,
          artistId: data.artistId,
          status: data.status,
          description: data.description,
          startDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : undefined,
          endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined,
          totalBudget: data.totalBudget,
        });

        toast({
          title: 'Tour Created',
          description: 'The tour has been created successfully.',
        });
      }

      // Invalidate tours cache to refresh lists
      await queryClient.invalidateQueries({ queryKey: ['/api/tour/tours'] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      navigate(-1);
    } catch (error) {
      console.error('Error creating/updating tour:', error);

      toast({
        title: 'Error',
        description: 'There was an error saving the tour. Please try again.',
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tour Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer 2025 East Coast Tour" {...field} />
              </FormControl>
              <FormDescription>
                Give your tour a descriptive name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="artistId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Artist</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingArtists ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    artists?.map((artist: any) => (
                      <SelectItem key={artist.id} value={artist.id.toString()}>
                        {artist.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the artist for this tour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                  When does the tour start?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
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
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        return (
                          date < new Date("1900-01-01") || 
                          (startDate && date < startDate)
                        );
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When does the tour end?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Current status of the tour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Budget</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 10000" {...field} />
              </FormControl>
              <FormDescription>
                Estimated total budget for the tour (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add details about the tour" 
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Any additional details or notes about the tour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tourId ? 'Update Tour' : 'Create Tour'}
          </Button>
        </div>
      </form>
    </Form>
  );
}