import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTourVenueSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  TOUR_VENUE_STATUSES, 
  STATUS_DISPLAY_NAMES, 
  STATUS_DESCRIPTIONS, 
  PLANNING_STATUSES,
  CONTACT_STATUSES,
  PRIORITY_HOLD_STATUSES,
  CONFIRMATION_STATUSES
} from "@/lib/tour-status";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Extend the tour venue schema for form validation
const tourVenueFormSchema = insertTourVenueSchema.extend({
  date: z.date().optional(),
  // Ensure notes and status can't be null
  notes: z.string().optional().default(''),
  status: z.string().default('potential'),
});

// Form data type
type TourVenueFormValues = z.infer<typeof tourVenueFormSchema>;

interface TourVenueFormProps {
  tourId: number;
  venueId?: number;
  initialData?: Partial<TourVenueFormValues>;
  onSubmit?: (data: TourVenueFormValues) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function TourVenueForm({ 
  tourId, 
  venueId, 
  initialData = {}, 
  onSubmit, 
  onCancel,
  onSuccess
}: TourVenueFormProps) {
  const [date, setDate] = useState<Date | undefined>(
    initialData.date ? new Date(initialData.date) : undefined
  );
  const { toast } = useToast();
  
  // Set up the form
  const form = useForm<TourVenueFormValues>({
    resolver: zodResolver(tourVenueFormSchema),
    defaultValues: {
      tourId: tourId,
      venueId: venueId || initialData.venueId,
      status: initialData.status || "potential",
      date: initialData.date ? new Date(initialData.date) : undefined,
      notes: initialData.notes || "",
      sequence: initialData.sequence !== undefined ? initialData.sequence : null,
    },
  });

  // Handle form submission
  const handleSubmit = async (values: TourVenueFormValues) => {
    try {
      if (onSubmit) {
        // Pass the values to the parent component if onSubmit is provided
        onSubmit(values);
      } else {
        // Default implementation if onSubmit is not provided
        // Send a request to add a venue to the tour
        const response = await fetch(`/api/tour/tours/${tourId}/venues`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add venue to tour');
        }
        
        toast({
          title: "Success",
          description: "Venue added to tour successfully.",
        });
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error saving tour venue:', error);
      toast({
        title: "Error",
        description: "Failed to save tour venue details.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Status Field */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {/* Planning Status Group */}
                  <SelectGroup>
                    <SelectLabel>Planning</SelectLabel>
                    {PLANNING_STATUSES.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        title={STATUS_DESCRIPTIONS[status]}
                      >
                        {STATUS_DISPLAY_NAMES[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  
                  {/* Contact Status Group */}
                  <SelectGroup>
                    <SelectLabel>Contact Phase</SelectLabel>
                    {CONTACT_STATUSES.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        title={STATUS_DESCRIPTIONS[status]}
                      >
                        {STATUS_DISPLAY_NAMES[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  
                  {/* Priority Hold Status Group */}
                  <SelectGroup>
                    <SelectLabel>Priority Holds</SelectLabel>
                    {PRIORITY_HOLD_STATUSES.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        title={STATUS_DESCRIPTIONS[status]}
                      >
                        {STATUS_DISPLAY_NAMES[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  
                  {/* Confirmation Status Group */}
                  <SelectGroup>
                    <SelectLabel>Final Status</SelectLabel>
                    {CONFIRMATION_STATUSES.map((status) => (
                      <SelectItem 
                        key={status} 
                        value={status}
                        title={STATUS_DESCRIPTIONS[status]}
                      >
                        {STATUS_DISPLAY_NAMES[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the current status of this venue in the tour
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Field */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        formatDate(field.value)
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
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                The date this venue is scheduled for the tour
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any special requirements or notes for this venue"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include any additional information about this venue booking
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onCancel ? onCancel() : null}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}