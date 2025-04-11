import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create custom marker icon
const venueIcon = new L.DivIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `
    <div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #4f46e5;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `
});

const currentVenueIcon = new L.DivIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  html: `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #e11d48;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `
});

interface NetworkVisualizationProps {
  data: {
    nodes: Array<{
      id: number;
      name: string;
      city: string;
      state: string;
      isCurrentVenue: boolean;
      collaborativeBookings: number;
      trustScore: number;
      latitude?: number;
      longitude?: number;
      lat?: number;
      lng?: number;
    }>;
    links: Array<{
      source: number;
      target: number;
      value: number;
    }>;
  };
  onNodeClick?: (node: any) => void;
  onAddVenue?: () => void;
}

export function NetworkVisualization({
  data,
  onNodeClick,
  onAddVenue
}: NetworkVisualizationProps) {
  if (!data?.nodes?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-80 space-y-4">
          <p>No venues found in the network.</p>
          <Button onClick={onAddVenue}>Add First Venue</Button>
        </CardContent>
      </Card>
    );
  }

  // Find the current venue and log it for debugging
  const currentVenue = data.nodes.find(n => n.isCurrentVenue);
  
  if (currentVenue) {
    console.log(`Current venue in map: ${currentVenue.id} - ${currentVenue.name}`);
  } else {
    console.log('No current venue found in the data');
    console.log('Venues in data:', data.nodes.map(n => `${n.id} - ${n.name} - isCurrent: ${n.isCurrentVenue}`).join(', '));
  }
  
  // Set map center based on current venue, or default to US center
  const mapCenter = currentVenue 
    ? [
        currentVenue.latitude || currentVenue.lat || 39.5, 
        currentVenue.longitude || currentVenue.lng || -98.5
      ] 
    : [39.5, -98.5];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[600px] rounded-lg overflow-hidden relative">
          {/* Floating action button for adding new venues */}
          <div className="absolute bottom-6 right-6 z-10">
            <Button 
              onClick={onAddVenue} 
              size="lg" 
              className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center"
            >
              <Plus size={24} />
            </Button>
          </div>
          
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {data.links.map((link, idx) => {
              const source = data.nodes.find(n => n.id === link.source);
              const target = data.nodes.find(n => n.id === link.target);

              if (!source || !target) return null;

              // Get coordinates from either latitude/longitude or lat/lng
              const sourceLat = source.latitude || source.lat;
              const sourceLng = source.longitude || source.lng;
              const targetLat = target.latitude || target.lat;
              const targetLng = target.longitude || target.lng;

              // Skip if any coordinates are missing
              if (!sourceLat || !sourceLng || !targetLat || !targetLng) return null;

              return (
                <Polyline
                  key={`link-${idx}`}
                  positions={[
                    [sourceLat as number, sourceLng as number],
                    [targetLat as number, targetLng as number]
                  ]}
                  pathOptions={{
                    color: '#4f46e5',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '5,5'
                  }}
                />
              );
            })}

            {data.nodes.map((node) => {
              // Get coordinates from either latitude/longitude or lat/lng
              const nodeLat = node.latitude || node.lat;
              const nodeLng = node.longitude || node.lng;

              // Skip nodes with missing coordinates
              if (!nodeLat || !nodeLng) return null;

              return (
                <Marker
                  key={node.id}
                  position={[nodeLat as number, nodeLng as number]}
                  icon={node.isCurrentVenue ? currentVenueIcon : venueIcon}
                  eventHandlers={{
                    click: () => onNodeClick?.(node)
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-semibold">{node.name}</h3>
                      <div>{node.city}, {node.state}</div>
                      {!node.isCurrentVenue && (
                        <div className="mt-1">
                          <div>Trust Score: {node.trustScore}%</div>
                          <div>Collaborations: {node.collaborativeBookings}</div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.nodes.filter(n => !n.isCurrentVenue).length}
            </div>
            <div className="text-sm text-gray-500">Connected Venues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.links.reduce((sum, link) => sum + link.value, 0)}
            </div>
            <div className="text-sm text-gray-500">Collaborative Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.nodes.length > 1 
                ? Math.round(data.nodes
                    .filter(n => !n.isCurrentVenue)
                    .reduce((sum, n) => sum + n.trustScore, 0) / 
                    (data.nodes.length - 1)
                  )
                : 0}%
            </div>
            <div className="text-sm text-gray-500">Avg Trust Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.links.length}
            </div>
            <div className="text-sm text-gray-500">Active Connections</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}