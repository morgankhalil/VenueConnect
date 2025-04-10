import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { Icon, DivIcon, LatLngBounds, LatLng } from 'leaflet';
import { MapPin, Info } from 'lucide-react';
import { LeafletBaseMap } from './leaflet-base-map';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapEvent } from '@/types';
import { getStatusInfo, isPriorityHold, getPriorityLevel } from '@/lib/tour-status';

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
  const createMarkerIcon = (status: string, index: number) => {
    const normalizedStatus = status.toLowerCase();
    
    // Get status info from our utility
    const statusInfo = getStatusInfo(normalizedStatus);
    
    // Use the color from status info
    let backgroundColor = statusInfo.color;
    
    // Create a border style based on status - to help differentiate priority levels
    let borderStyle = "2px solid white";
    
    // Special styling for priority holds - make them more visually distinct
    if (isPriorityHold(normalizedStatus)) {
      const priorityLevel = getPriorityLevel(normalizedStatus);
      // Make higher priority holds more prominent
      if (priorityLevel === 1) {
        borderStyle = "3px solid white";
      } else if (priorityLevel === 2) {
        borderStyle = "2px solid white";
      } else if (priorityLevel === 3) {
        borderStyle = "2px dashed white"; 
      } else if (priorityLevel === 4) {
        borderStyle = "1px dashed white";
      }
    }
    
    // Create a custom HTML element for the marker
    return new DivIcon({
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${backgroundColor};
          border: ${borderStyle};
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
  
  // Sort events by sequence first (if available), then by date as fallback
  const sortedEvents = [...events].sort((a, b) => {
    // If both have sequence, sort by sequence
    if (a.sequence !== undefined && b.sequence !== undefined) {
      return a.sequence - b.sequence;
    }
    // Otherwise, if both have dates, sort by date
    else if (a.date && b.date) {
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
          // Use the event's status if available, otherwise determine from properties
          const markerStatus = 
            (event.isCurrentVenue ? 'potential' : 
             event.isRoutingOpportunity ? 'suggested' : 
             event.status || 'confirmed');
            
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
                  {event.artist && <div className="text-sm mb-1">{event.artist}</div>}
                  
                  {event.date && (
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })} · Stop #{idx + 1}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <span 
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium`}
                      style={{
                        backgroundColor: `${getStatusInfo(markerStatus).color}20`, // 20% opacity version of the color
                        color: getStatusInfo(markerStatus).color
                      }}
                      title={getStatusInfo(markerStatus).description}
                    >
                      {getStatusInfo(markerStatus).displayName}
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
        <div className="absolute bottom-8 left-3 bg-white/90 p-2 rounded-md shadow-sm border text-xs z-[1000] max-w-[200px]">
          <div className="text-gray-700 font-medium mb-1">Venue Status Legend</div>
          
          {/* Final Statuses */}
          <div className="mb-2">
            <div className="text-gray-500 mb-1 text-[10px] uppercase">Final Status</div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('confirmed').color }}></span>
              <span className="text-gray-700">Confirmed</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('cancelled').color }}></span>
              <span className="text-gray-700">Cancelled</span>
            </div>
          </div>

          {/* Priority Holds */}
          <div className="mb-2">
            <div className="text-gray-500 mb-1 text-[10px] uppercase">Priority Holds</div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('hold1').color }}></span>
              <span className="text-gray-700">Priority 1 (Highest)</span>
            </div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('hold2').color }}></span>
              <span className="text-gray-700">Priority 2</span>
            </div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('hold3').color }}></span>
              <span className="text-gray-700">Priority 3</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('hold4').color }}></span>
              <span className="text-gray-700">Priority 4</span>
            </div>
          </div>
          
          {/* Contact Phase */}
          <div className="mb-2">
            <div className="text-gray-500 mb-1 text-[10px] uppercase">Contact Phase</div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('contacted').color }}></span>
              <span className="text-gray-700">Contacted</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('negotiating').color }}></span>
              <span className="text-gray-700">Negotiating</span>
            </div>
          </div>
          
          {/* Planning Phase */}
          <div>
            <div className="text-gray-500 mb-1 text-[10px] uppercase">Planning Phase</div>
            <div className="flex items-center mb-1">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('suggested').color }}></span>
              <span className="text-gray-700">Suggested</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full inline-block mr-1" 
                    style={{ backgroundColor: getStatusInfo('potential').color }}></span>
              <span className="text-gray-700">Potential</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}