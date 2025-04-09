import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getEvent } from '@/lib/api';

interface CalendarEvent {
  id: number;
  title: string;
  date: string; // Changed to string for easier handling from API
  startTime?: string;
  endTime?: string;
  type: 'confirmed' | 'opportunity' | 'network' | 'hold' | 'inquiry';
  confidence?: number;
  ticketUrl?: string;
  venue?: string;
  description?: string;
  artist?: string;
  genre?: string;
}

export default function EventDetails() {
  const { id } = useParams();
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(Number(id))
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{event.title}</h1>
      <div className="grid gap-4">
        <div className="p-4 rounded-md border">
          <h2 className="font-medium">Event Details</h2>
          <p>Date: {new Date(event.date).toLocaleDateString()}</p>
          <p>Time: {event.startTime} - {event.endTime}</p>
          <p>Venue: {event.venue}</p>
          <p>Artist: {event.artist}</p>
          <p>Genre: {event.genre}</p>
          <p>Status: {event.type}</p>
          {event.confidence && <p>Confidence: {event.confidence}%</p>}
          {event.ticketUrl && (
            <a href={event.ticketUrl} className="text-blue-500 hover:underline">
              Buy Tickets
            </a>
          )}
        </div>
        <div className="p-4 rounded-md border">
          <h2 className="font-medium">Description</h2>
          <p>{event.description}</p>
        </div>
      </div>
    </div>
  );
}