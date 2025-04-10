import { Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { VenueStatusBadge } from "./venue-status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapEvent } from "@/types";

interface VenueListProps {
  venues: MapEvent[];
  onVenueClick: (venue: MapEvent) => void;
  maxHeight?: number;
  selectedVenueId?: number | string;
}

export function VenueList({ 
  venues, 
  onVenueClick, 
  maxHeight = 600, 
  selectedVenueId 
}: VenueListProps) {
  return (
    <ScrollArea className={`max-h-[${maxHeight}px]`}>
      <div className="divide-y">
        {venues.length > 0 ? (
          venues.map(venue => (
            <VenueListItem 
              key={venue.id} 
              venue={venue} 
              onClick={() => onVenueClick(venue)}
              isSelected={selectedVenueId === venue.id}
            />
          ))
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            No venues to display
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

interface VenueListItemProps {
  venue: MapEvent;
  onClick: () => void;
  isSelected?: boolean;
}

function VenueListItem({ venue, onClick, isSelected }: VenueListItemProps) {
  const isPotential = venue.status === 'potential' || venue.isRoutingOpportunity;
  
  return (
    <div 
      className={`p-3 hover:bg-gray-50 cursor-pointer ${
        isSelected ? 'bg-blue-50' : ''
      } ${isPotential ? 'border-l-4 border-orange-400' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2
            ${venue.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              venue.status === 'hold' ? 'bg-amber-100 text-amber-700' :
              venue.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-orange-100 text-orange-700'}
          `}>
            {venue.sequence !== undefined ? venue.sequence + 1 : '-'}
          </div>
          <div className="font-medium">{venue.venue}</div>
        </div>
        <VenueStatusBadge status={venue.status || 'potential'} />
      </div>
      
      <div className="text-sm text-gray-500 mt-1 ml-8">
        {venue.date ? formatDate(venue.date) : 'No date specified'}
      </div>
      
      {isPotential && (
        <div className="mt-2 text-xs text-orange-700 bg-orange-50 p-1 px-2 rounded flex items-center ml-8">
          <Sparkles className="inline h-3 w-3 mr-1" />
          Suggested venue
        </div>
      )}
    </div>
  );
}