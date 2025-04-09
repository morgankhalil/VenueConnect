import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VenueMap } from "@/components/maps/venue-map";
import { MapEvent } from "@/types";

export default function MapTest() {
  const [selectedRegion, setSelectedRegion] = useState<string>("us");
  
  // Sample data for different regions
  const mapData: Record<string, MapEvent[]> = {
    us: [
      {
        id: 1,
        venue: "The Fillmore",
        artist: "Fleet Foxes",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 37.7749,
        longitude: -122.4194,
        isCurrentVenue: false,
        isRoutingOpportunity: false
      },
      {
        id: 2,
        venue: "9:30 Club",
        artist: "Fleet Foxes",
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 38.9172,
        longitude: -77.0250,
        isCurrentVenue: false,
        isRoutingOpportunity: true
      },
      {
        id: 3,
        venue: "First Avenue",
        artist: "Fleet Foxes",
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 44.9781,
        longitude: -93.2763,
        isCurrentVenue: true,
        isRoutingOpportunity: false
      }
    ],
    europe: [
      {
        id: 4,
        venue: "O2 Arena",
        artist: "Arcade Fire",
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 51.5033,
        longitude: 0.0031,
        isCurrentVenue: false,
        isRoutingOpportunity: false
      },
      {
        id: 5,
        venue: "Olympia",
        artist: "Arcade Fire",
        date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 48.8566,
        longitude: 2.3522,
        isCurrentVenue: false,
        isRoutingOpportunity: true
      },
      {
        id: 6,
        venue: "Paradiso",
        artist: "Arcade Fire",
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 52.3676,
        longitude: 4.8945,
        isCurrentVenue: true,
        isRoutingOpportunity: false
      }
    ],
    asia: [
      {
        id: 7,
        venue: "Nippon Budokan",
        artist: "Tame Impala",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 35.6895,
        longitude: 139.7514,
        isCurrentVenue: false,
        isRoutingOpportunity: false
      },
      {
        id: 8,
        venue: "AsiaWorld-Expo",
        artist: "Tame Impala",
        date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 22.3089,
        longitude: 113.9144,
        isCurrentVenue: false,
        isRoutingOpportunity: true
      },
      {
        id: 9,
        venue: "Impact Arena",
        artist: "Tame Impala",
        date: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 13.7563,
        longitude: 100.5018,
        isCurrentVenue: true,
        isRoutingOpportunity: false
      }
    ]
  };
  
  // Function to handle marker clicks
  const handleMarkerClick = (event: MapEvent) => {
    console.log("Marker clicked:", event);
    // Additional logic can be added here
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Map Testing</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the Leaflet map integration with OpenStreetMap tiles.
          No API key is required for this implementation.
        </p>
        
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-medium">Tour Route Visualization</h2>
                
                <div className="flex gap-2">
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">North America</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="asia">Asia</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline">Filter Options</Button>
                </div>
              </div>
              
              <div className="h-[600px] relative rounded-md overflow-hidden">
                <VenueMap
                  events={mapData[selectedRegion]}
                  height="100%"
                  showLegend={true}
                  onMarkerClick={handleMarkerClick}
                  showRoute={true}
                />
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium mb-2">About This Map</h3>
                <p className="text-sm text-gray-600">
                  This map uses Leaflet with OpenStreetMap tiles, which are completely free and don't 
                  require any API keys. The markers show different venue statuses: green for confirmed shows, 
                  amber for holds, and gray for potential venues. The dotted blue line shows the tour route.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}