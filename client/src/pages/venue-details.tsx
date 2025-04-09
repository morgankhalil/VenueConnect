import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Venue } from "@shared/schema";
import { getVenue, getEventsByVenue } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function VenueDetails() {
  const [_, params] = useRoute<{ id: string }>("/venues/:id");
  const venueId = params?.id ? parseInt(params.id, 10) : 0;
  
  // Define custom types for our mock data to avoid schema conflicts
  type MockVenue = Omit<Venue, 'createdAt'> & { createdAt: string };
  type MockEvent = { 
    id: number; 
    artistId: number; 
    venueId: number;
    date: string;
    startTime: string;
    status: string;
    createdAt: string;
  };
  
  // Use mock data until API endpoints are fully operational
  const [venue, setVenue] = useState<MockVenue | undefined>(undefined);
  const [events, setEvents] = useState<MockEvent[]>([]);
  const [venueLoading, setVenueLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  
  useEffect(() => {
    // Generate venue data based on venue ID
    setTimeout(() => {
      // Different mockups for different venue IDs
      const mockVenues = {
        1: {
          id: 1,
          name: "The Music Hall",
          address: "123 Main Street",
          city: "Austin",
          state: "TX",
          zipCode: "78701",
          country: "USA",
          capacity: 500,
          contactEmail: "booking@musichall.com",
          contactPhone: "(512) 555-1234",
          website: "https://musichall.example.com",
          description: "A premier music venue featuring local and touring artists.",
          imageUrl: null,
          latitude: 30.2672,
          longitude: -97.7431,
          ownerId: 1,
          createdAt: new Date().toISOString()
        },
        2: {
          id: 2,
          name: "Jazz Club Downtown",
          address: "456 Jazz Avenue",
          city: "New Orleans",
          state: "LA",
          zipCode: "70112",
          country: "USA", 
          capacity: 200,
          contactEmail: "info@jazzclub.com",
          contactPhone: "(504) 555-6789",
          website: "https://jazzclub.example.com",
          description: "An intimate jazz club with nightly performances from top jazz artists.",
          imageUrl: null,
          latitude: 29.9511,
          longitude: -90.0715,
          ownerId: 2,
          createdAt: new Date().toISOString()
        },
        3: {
          id: 3,
          name: "Stadium Arena",
          address: "789 Stadium Way",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90001",
          country: "USA",
          capacity: 15000,
          contactEmail: "bookings@stadium.com",
          contactPhone: "(213) 555-9876",
          website: "https://stadiumentertainment.example.com",
          description: "Large arena venue hosting major touring acts and festivals.",
          imageUrl: null,
          latitude: 34.0522,
          longitude: -118.2437,
          ownerId: 3,
          createdAt: new Date().toISOString()
        }
      };
      
      // Set the venue based on ID, or use a default if ID doesn't match
      const selectedVenue = mockVenues[venueId as keyof typeof mockVenues] || {
        id: venueId,
        name: `Venue ${venueId}`,
        address: `${venueId}00 Music Street`,
        city: "Musicville",
        state: "MU",
        zipCode: `${venueId}0000`,
        country: "USA",
        capacity: venueId * 100,
        contactEmail: `venue${venueId}@example.com`,
        contactPhone: `(555) 555-${venueId.toString().padStart(4, '0')}`,
        website: `https://venue${venueId}.example.com`,
        description: `Venue ${venueId} is a great place to see live music and performances.`,
        imageUrl: null,
        latitude: 40 + (venueId / 10),
        longitude: -90 - (venueId / 10),
        ownerId: venueId,
        createdAt: new Date().toISOString()
      };
      
      setVenue(selectedVenue);
      setVenueLoading(false);
    }, 500);
    
    // Mock events data based on venue ID
    setTimeout(() => {
      // Create different events for each venue
      const eventCount = 2 + (venueId % 3); // Different number of events per venue
      const events: MockEvent[] = [];
      
      for (let i = 0; i < eventCount; i++) {
        events.push({
          id: i + 1,
          artistId: (venueId * 10) + i,
          venueId: venueId,
          date: new Date(Date.now() + ((i + 1) * 7) * 24 * 60 * 60 * 1000).toISOString(),
          startTime: `${7 + i}:${venueId % 2 === 0 ? '00' : '30'} PM`,
          status: i === 0 ? "confirmed" : (i === 1 ? "pending" : "confirmed"),
          createdAt: new Date().toISOString()
        });
      }
      
      setEvents(events);
      setEventsLoading(false);
    }, 800);
  }, [venueId]);
  
  if (venueLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!venue) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Venue Not Found</h2>
        <p className="text-gray-600">The venue you're looking for doesn't exist or is not available.</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
            <p className="text-gray-600">{venue.city}, {venue.state}</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <div className="flex items-center text-sm font-medium text-gray-700">
              <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="details">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-medium">Venue Information</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Address</h4>
                    <p className="mt-1">{venue.address}</p>
                    <p>{venue.city}, {venue.state} {venue.zipCode}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Capacity</h4>
                    <p className="mt-1">{venue.capacity}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <p className="mt-1">{venue.description || "No description available."}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Contact Information</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Booking Contact</h4>
                    <p className="mt-1">Venue Manager</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Email</h4>
                    <p className="mt-1">{venue.contactEmail || "Not available"}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                    <p className="mt-1">{venue.contactPhone || "Not available"}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Website</h4>
                    <p className="mt-1">
                      {venue.website ? (
                        <a 
                          href={venue.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {venue.website}
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Upcoming Events</h3>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : events && events.length > 0 ? (
                <div className="space-y-6">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start border-b border-gray-200 pb-4">
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="text-sm font-semibold text-gray-700">
                          {new Date(event.date).toLocaleDateString(undefined, { month: 'short' })}
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          {new Date(event.date).getDate()}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="text-lg font-medium text-gray-900">
                          {venue.id === 1 
                            ? "Rock Night with The Amplifiers" 
                            : venue.id === 2 
                              ? "Jazz Sessions" 
                              : venue.id === 3 
                                ? "Summer Festival" 
                                : `Concert at ${venue.name} #${event.id}`}
                        </h4>
                        <p className="text-gray-600">
                          {formatDate(event.date)} at {event.startTime || "TBD"}
                        </p>
                        <p className="mt-1 text-gray-500">
                          {venue.id === 1 
                            ? "High-energy rock music with local favorites." 
                            : venue.id === 2 
                              ? "Smooth jazz performances from acclaimed artists." 
                              : venue.id === 3 
                                ? "Major touring act with special guests." 
                                : `Live music event at ${venue.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No upcoming events scheduled.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Performance Insights</h3>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-gray-500">
                Venue performance insights coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}