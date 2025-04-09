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
  
  // Use mock data until API endpoints are fully operational
  const [venue, setVenue] = useState<Venue | undefined>(undefined);
  const [events, setEvents] = useState<any[]>([]);
  const [venueLoading, setVenueLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  
  useEffect(() => {
    // Mock venue data
    setTimeout(() => {
      setVenue({
        id: venueId,
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
        createdAt: new Date().toISOString(),
      });
      setVenueLoading(false);
    }, 500);
    
    // Mock events data 
    setTimeout(() => {
      setEvents([
        {
          id: 1,
          artistId: 1,
          venueId: venueId,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          startTime: "8:00 PM",
          status: "confirmed",
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          artistId: 2,
          venueId: venueId,
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          startTime: "9:00 PM",
          status: "confirmed",
          createdAt: new Date().toISOString(),
        }
      ]);
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
                        <h4 className="text-lg font-medium text-gray-900">Concert Event</h4>
                        <p className="text-gray-600">
                          {formatDate(event.date)} at {event.startTime || "TBD"}
                        </p>
                        <p className="mt-1 text-gray-500">
                          Live music event at {venue.name}
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