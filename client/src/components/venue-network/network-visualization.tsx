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
      latitude: number;
      longitude: number;
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
  // Find map center based on current venue
  const mapCenter = React.useMemo(() => {
    const currentVenue = data.nodes.find(n => n.isCurrentVenue);
    return currentVenue 
      ? [currentVenue.latitude, currentVenue.longitude] 
      : [39.5, -98.5]; // US center
  }, [data.nodes]);

  // Create connection lines between venues
  const networkLines = React.useMemo(() => {
    return data.links.map((link, idx) => {
      const source = data.nodes.find(n => n.id === link.source);
      const target = data.nodes.find(n => n.id === link.target);

      if (!source || !target) return null;

      return (
        <Polyline
          key={`link-${idx}`}
          positions={[
            [source.latitude, source.longitude],
            [target.latitude, target.longitude]
          ]}
          pathOptions={{
            color: '#4f46e5',
            weight: 2,
            opacity: 0.6,
            dashArray: '5,5'
          }}
        />
      );
    });
  }, [data]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="sm:flex sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Venue Network</h3>
          <div className="mt-3 sm:mt-0 sm:ml-4">
            <Button onClick={onAddVenue}>
              <Plus className="mr-1 h-4 w-4" />
              Invite Venue
            </Button>
          </div>
        </div>

        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={4}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {networkLines}

            {data.nodes.map((node) => (
              <Marker
                key={node.id}
                position={[node.latitude, node.longitude]}
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
            ))}
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