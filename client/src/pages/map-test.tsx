import React, { useEffect, useRef } from 'react';

declare const L: any;

export default function MapTest() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    try {
      console.log("Simple map test initializing");
      
      // Create a basic map
      const map = L.map(mapContainerRef.current).setView([39.5, -96.0], 4);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Add a simple marker
      L.marker([39.5, -96.0])
        .addTo(map)
        .bindPopup("Center of the USA")
        .openPopup();
      
      console.log("Map test initialized successfully");
      
      return () => {
        map.remove();
      };
    } catch (err) {
      console.error("Map test error:", err);
    }
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Map Test Page</h1>
      <p className="mb-4">Basic Leaflet map implementation</p>
      
      <div 
        className="border border-gray-300 rounded-lg h-[500px] relative overflow-hidden" 
        ref={mapContainerRef}
      />
    </div>
  );
}