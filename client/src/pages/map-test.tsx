import React, { useEffect, useRef, useState } from 'react';

// Access the global mapboxgl that was loaded from the CDN
declare const mapboxgl: any;

export default function MapTest() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    try {
      console.log("Mapbox test initializing");
      
      // Check if mapboxgl is available
      if (!mapboxgl) {
        throw new Error("Mapbox GL JS is not loaded");
      }
      
      // Access token for mapbox - using the actual token from environment
      mapboxgl.accessToken = "pk.eyJ1IjoibWlzc21hbmFnZW1lbnQiLCJhIjoiY205OTllOGFvMDhsaDJrcTliYjdha241dCJ9.In3R8-WuiwMYenu_SnZ4aA";
      
      // Initialize the map with Mapbox open-source style
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap Contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [-96.0, 39.5], // [lng, lat]
        zoom: 3
      });
      
      // Add navigation controls (zoom, etc)
      map.addControl(new mapboxgl.NavigationControl());
      
      // Add a marker
      new mapboxgl.Marker()
        .setLngLat([-96.0, 39.5])
        .setPopup(new mapboxgl.Popup().setHTML("<h3>Center of USA</h3>"))
        .addTo(map);
      
      // Add some test markers
      const testLocations = [
        { lng: -122.4194, lat: 37.7749, name: "San Francisco" },
        { lng: -87.6298, lat: 41.8781, name: "Chicago" },
        { lng: -74.0060, lat: 40.7128, name: "New York" },
        { lng: -84.3880, lat: 33.7490, name: "Atlanta" },
      ];
      
      // Add markers for each location
      testLocations.forEach(location => {
        new mapboxgl.Marker({ color: '#3B82F6' })
          .setLngLat([location.lng, location.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${location.name}</h3>`))
          .addTo(map);
      });
      
      console.log("Mapbox initialized successfully");
      
      // Clean up
      return () => {
        map.remove();
      };
    } catch (err: any) {
      console.error("Mapbox test error:", err);
      setMapError(err.message || "Failed to initialize map");
    }
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Map Test Page</h1>
      <p className="mb-4">Using Mapbox GL JS</p>
      
      {mapError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Map Error</p>
          <p className="text-sm">{mapError}</p>
        </div>
      ) : null}
      
      <div 
        className="border border-gray-300 rounded-lg h-[500px] relative overflow-hidden" 
        ref={mapContainerRef}
      />
    </div>
  );
}