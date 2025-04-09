import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create marker icons for different venue types
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create a custom HTML element for the current venue marker
// This allows us to create a distinctive red marker
const CurrentVenueMarkerHtml = `
<div style="
  background-color: #e11d48; 
  width: 25px; 
  height: 25px; 
  display: block;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 0 4px rgba(0,0,0,0.5);
  text-align: center;
  line-height: 22px;
  font-weight: bold;
  color: white;
">•</div>
`;

// Icon for the current venue (using HTML for custom styling)
const currentVenueIcon = L.divIcon({
  html: CurrentVenueMarkerHtml,
  className: 'current-venue-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
});

// Helper component to fit map bounds
function MapBoundsUpdater({ nodes }: { nodes: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!nodes.length) return;
    
    try {
      // Create bounds for all markers
      const bounds = L.latLngBounds(nodes.map(node => [node.latitude, node.longitude]));
      
      // Fit the map to these bounds with some padding
      map.fitBounds(bounds, { padding: [50, 50] });
    } catch (err) {
      console.error("Error setting map bounds:", err);
    }
  }, [nodes, map]);
  
  return null;
}

// Define interfaces for network visualization
interface NetworkNode {
  id: number;
  name: string;
  city: string;
  state: string;
  isCurrentVenue: boolean;
  collaborativeBookings: number;
  trustScore: number;
  latitude: number;
  longitude: number;
}

interface NetworkLink {
  source: number;
  target: number;
  value: number;
}

interface VenueNetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface NetworkVisualizationProps {
  data: VenueNetworkData;
  onNodeClick?: (node: NetworkNode) => void;
  onAddVenue?: () => void;
}

export function NetworkVisualization({
  data,
  onNodeClick,
  onAddVenue
}: NetworkVisualizationProps) {
  // Find the center of the map
  const defaultCenter: [number, number] = [39.5, -98.5]; // Default US center
  
  // Get center based on current venue or first node
  const mapCenter = React.useMemo(() => {
    if (!data?.nodes?.length) return defaultCenter;
    
    const currentVenue = data.nodes.find(node => node.isCurrentVenue);
    if (currentVenue && currentVenue.latitude && currentVenue.longitude) {
      return [currentVenue.latitude, currentVenue.longitude] as [number, number];
    }
    
    const firstNode = data.nodes[0];
    if (firstNode && firstNode.latitude && firstNode.longitude) {
      return [firstNode.latitude, firstNode.longitude] as [number, number];
    }

    return defaultCenter;
  }, [data?.nodes]);
  
  // Create network connection lines
  const networkLines = React.useMemo(() => {
    return data.links.map((link, index) => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      
      if (!sourceNode || !targetNode) return null;
      
      // Create polyline positions
      const positions: [number, number][] = [
        [sourceNode.latitude, sourceNode.longitude],
        [targetNode.latitude, targetNode.longitude]
      ];
      
      // Determine if this is a primary connection (to/from the current venue)
      const isPrimaryConnection = sourceNode.isCurrentVenue || targetNode.isCurrentVenue;
      
      return (
        <Polyline 
          key={`link-${index}`}
          positions={positions}
          pathOptions={{
            color: isPrimaryConnection ? '#4f46e5' : '#9ca3af',
            weight: isPrimaryConnection ? 3 : 2,
            dashArray: isPrimaryConnection ? '5,5' : '3,7'
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
        
        <div className="h-80 rounded-lg overflow-hidden relative">
          {/* Leaflet Map */}
          <MapContainer 
            center={mapCenter} 
            zoom={4} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Add the bounds updater component */}
            <MapBoundsUpdater nodes={data.nodes} />
            
            {/* Network Connections */}
            {networkLines}
            
            {/* Venue Markers */}
            {data.nodes.map(node => (
              <Marker 
                key={node.id} 
                position={[node.latitude, node.longitude]}
                icon={node.isCurrentVenue ? currentVenueIcon : defaultIcon}
                eventHandlers={{
                  click: () => {
                    if (onNodeClick) onNodeClick(node);
                  }
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-semibold">{node.name}</h3>
                    <div>{node.city}, {node.state}</div>
                    {node.isCurrentVenue ? (
                      <div className="mt-1 text-xs text-green-600 font-semibold">Your Venue</div>
                    ) : (
                      <div className="mt-1 text-xs">
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
        
        {/* Network Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {Math.max(0, data.nodes.filter(node => !node.isCurrentVenue).length)}
            </div>
            <div className="text-sm text-gray-500">Connected Venues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.links.reduce((sum, link) => sum + (link.value || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Collaborative Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.nodes.length > 1 ? Math.round(
                data.nodes
                  .filter(node => !node.isCurrentVenue)
                  .reduce((sum, node) => sum + (node.trustScore || 0), 0) / 
                data.nodes.filter(node => !node.isCurrentVenue).length
              ) : 0}%
            </div>
            <div className="text-sm text-gray-500">Trust Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-700">
              {data.links.filter(link => {
                const targetNode = data.nodes.find(n => n.id === link.target);
                return targetNode && !targetNode.isCurrentVenue;
              }).length}
            </div>
            <div className="text-sm text-gray-500">Pending Invites</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
