import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Music, MapPin, ExternalLink, X } from 'lucide-react';

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
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

interface EventModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, open, onOpenChange }) => {
  if (!event) return null;

  const typeColors = {
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    hold: 'bg-amber-100 text-amber-800 border-amber-200',
    opportunity: 'bg-blue-100 text-blue-800 border-blue-200',
    inquiry: 'bg-purple-100 text-purple-800 border-purple-200',
    network: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const typeLabels = {
    confirmed: 'Confirmed',
    hold: 'Hold',
    opportunity: 'Opportunity',
    inquiry: 'Inquiry',
    network: 'Network Event'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className={`h-2 w-full ${typeColors[event.type].split(' ')[0].replace('100', '500')}`} />
        
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl font-bold">{event.title}</DialogTitle>
            <Badge className={`${typeColors[event.type]} border`}>
              {typeLabels[event.type]}
              {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && 
                ` (${event.confidence}%)`}
            </Badge>
          </div>
          <DialogDescription className="text-base pt-2">
            {event.description || `${event.type === 'confirmed' ? 'Performance' : 'Potential performance'} at ${event.venue || 'venue'}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
              <span>{event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}</span>
            </div>
            
            {event.startTime && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>{event.venue}</span>
              </div>
            )}
            
            {event.genre && (
              <div className="flex items-center">
                <Music className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>{event.genre}</span>
              </div>
            )}
          </div>
          
          {event.ticketUrl && (
            <div className="mt-6">
              <Button className="w-full" onClick={() => window.open(event.ticketUrl, '_blank')}>
                Get Tickets
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          
          {(event.type === 'opportunity' || event.type === 'inquiry') && (
            <div className="mt-6 flex space-x-3">
              <Button className="flex-1" variant="outline">Send Message</Button>
              <Button className="flex-1">Take Action</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;