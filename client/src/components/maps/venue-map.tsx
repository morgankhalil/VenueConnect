import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { Icon, DivIcon, LatLngBounds, LatLng } from 'leaflet';
import { MapPin, Info } from 'lucide-react';
import { LeafletBaseMap } from './leaflet-base-map';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapEvent } from '@/types';

// Map bounds helper component - fits the map to markers
function FitBoundsToMarkers({ events }: { events: MapEvent[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (events.length === 0) return;
    
    const bounds = new LatLngBounds([]);
    events.forEach(event => {
      bounds.extend(new LatLng(event.latitude, event.longitude));
    });
    
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [events, map]);
  
  return null;
}

interface VenueMapProps {
  events: MapEvent[];
  height?: string | number;
  showLegend?: boolean;
  userVenueId?: number;
  onMarkerClick?: (event: MapEvent) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  showRoute?: boolean;
}

export function VenueMap({
  events,
  height = '400px',
  showLegend = true,
  userVenueId,
  onMarkerClick,
  initialCenter,
  initialZoom = 4,
  className = '',
  showRoute = true
}: VenueMapProps) {
  
  // Create custom marker icons based on status
  const createMarkerIcon = (status: 'confirmed' | 'hold' | 'potential', index: number) => {
    const backgroundColor = 
      status === 'confirmed' ? '#10B981' : // Green for confirmed
      status === 'hold' ? '#F59E0B' :      // Amber for holds
      '#9CA3AF';                           // Gray for potential venue
      
    // Create a custom HTML element for the marker
    return new DivIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${backgroundColor};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          ${index + 1}
        </div>
      `
    });
  };
  
  // Sort events by date if dates are available
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return 0;
  });
  
  // Create polyline for tour route
  const pathOptions = { 
    color: '#3B82F6', 
    weight: 3,
    opacity: 0.8,
    dashArray: '5, 10'
  };
  
  // Map points for the polyline route
  const routePoints = sortedEvents.map(event => [event.latitude, event.longitude]);
  
  return (
    <div className={className}>
      <LeafletBaseMap 
        height={height}
        center={initialCenter}
        zoom={initialZoom}
      >
        {/* Add markers for each venue/stop */}
        {sortedEvents.map((event, idx) => {
          const markerStatus = 
            event.isCurrentVenue ? 'potential' : 
            event.isRoutingOpportunity ? 'hold' : 
            'confirmed';
            
          const icon = createMarkerIcon(markerStatus, idx);
          
          return (
            <Marker 
              key={event.id}
              position={[event.latitude, event.longitude]} 
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(event)
              }}
            >
              <Popup>
                <div className="font-sans">
                  <div className="font-semibold text-base mb-1">{event.venue}</div>
                  <div className="text-sm mb-1">{event.artist}</div>
                  
                  {event.date && (
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })} · Stop #{idx + 1}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <span className={`
                      inline-block px-2 py-0.5 rounded-full text-xs font-medium
                      ${markerStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        markerStatus === 'hold' ? 'bg-amber-100 text-amber-800' : 
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {markerStatus === 'confirmed' ? 'Confirmed' : 
                       markerStatus === 'hold' ? 'On Hold' : 
                       'Potential'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Add route polyline if enabled and have multiple points */}
        {showRoute && sortedEvents.length > 1 && (
          <Polyline positions={routePoints as any} pathOptions={pathOptions} />
        )}
        
        {/* Fit map to include all markers */}
        <FitBoundsToMarkers events={sortedEvents} />
      </LeafletBaseMap>
      
      {/* Map legend */}
      {showLegend && (
        <div className="absolute bottom-8 left-3 bg-white/90 p-2 rounded-md shadow-sm border text-xs z-[1000]">
          <div className="flex items-center mb-1">
            <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1"></span>
            <span className="text-gray-700">Confirmed</span>
          </div>
          <div className="flex items-center mb-1">
            <span className="w-3 h-3 bg-amber-500 rounded-full inline-block mr-1"></span>
            <span className="text-gray-700">On Hold</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-gray-400 rounded-full inline-block mr-1"></span>
            <span className="text-gray-700">Potential</span>
          </div>
        </div>
      )}
    </div>
  );
}