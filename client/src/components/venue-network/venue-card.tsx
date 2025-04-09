import React from "react";
import { Venue } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface VenueCardProps {
  venue: Venue;
  onClick?: (venue: Venue) => void;
}

export function VenueCard({ venue, onClick }: VenueCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(venue);
    }
  };

  return (
    <div
      className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex-shrink-0">
        {venue.imageUrl ? (
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={venue.imageUrl}
            alt={venue.name}
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-800 font-semibold text-lg">
              {venue.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <a className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true"></span>
          <p className="text-sm font-medium text-gray-900">{venue.name}</p>
          <p className="text-sm text-gray-500 truncate">
            {venue.city}, {venue.state} • {venue.capacity.toLocaleString()} capacity
          </p>
        </a>
      </div>
    </div>
  );
}
