import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { getEvents } from '@/lib/api';
import type { Event } from '@/types';

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [filter, setFilter] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents
  });

  const filteredEvents = filter === "all" 
    ? events 
    : events.filter(event => event.type === filter);

  const currentMonthEvents = filteredEvents.filter(event => {
    if (!date) return false;
    return new Date(event.date).getMonth() === date.getMonth() && 
           new Date(event.date).getFullYear() === date.getFullYear();
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="space-x-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={filter === "confirmed" ? "default" : "outline"}
            onClick={() => setFilter("confirmed")}
          >
            Confirmed
          </Button>
          <Button 
            variant={filter === "hold" ? "default" : "outline"}
            onClick={() => setFilter("hold")}
          >
            Hold
          </Button>
          <Button 
            variant={filter === "opportunity" ? "default" : "outline"}
            onClick={() => setFilter("opportunity")}
          >
            Opportunities
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
        <div>
          <h2 className="text-xl font-semibold mb-4">Events</h2>
          <div className="space-y-4">
            {currentMonthEvents.map((event) => (
              <div 
                key={event.id}
                className="p-4 rounded-md border"
              >
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleDateString()} {event.startTime}
                </p>
                <p className="text-sm">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}