import React, { ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletBaseMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  width?: string | number;
  children?: ReactNode;
  className?: string;
  showZoomControl?: boolean;
}

/**
 * A reusable Leaflet map component that can be used throughout the app
 */
export function LeafletBaseMap({
  center = [39.5, -98.0], // Default center (US)
  zoom = 4,
  height = '100%',
  width = '100%',
  children,
  className = '',
  showZoomControl = true
}: LeafletBaseMapProps) {
  return (
    <div className={`leaflet-map-container ${className}`} style={{ height, width }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={showZoomControl}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}