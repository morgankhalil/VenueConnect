import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VenueMap } from "@/components/maps/venue-map";
import { Venue } from "@shared/schema";
import { MapEvent } from "@/types";
import { getVenue, getEventsByVenue, apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Info, MapPin } from "lucide-react";

export default function VenueDetails() {
  const [_, params] = useRoute<{ id: string }>("/venues/:id");
  const venueId = params?.id ? parseInt(params.id, 10) : 0;

  const { data: venue, isLoading: venueLoading } = useQuery({
    queryKey: ['/api/venues', venueId],
    queryFn: () => apiRequest('GET', `/api/venues/${venueId}`).then(res => res.json())
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/venues', venueId, 'events'],
    queryFn: () => apiRequest('GET', `/api/venues/${venueId}/events`).then(res => res.json())
  });

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
          <TabsTrigger value="location">Location</TabsTrigger>
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
                  {events.map((event: any) => (
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
                          Event at {venue.name}
                        </h4>
                        <p className="text-gray-600">
                          {formatDate(event.date)} at {event.startTime || "TBD"}
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

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Location Map</h3>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-md space-y-4">
                <p className="font-medium">Venue Address:</p>
                <p>
                  {venue.address}<br />
                  {venue.city}, {venue.state} {venue.zipCode}<br />
                  {venue.country}
                </p>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-500">
                    {venue.latitude ? venue.latitude.toFixed(6) : 'N/A'}, {venue.longitude ? venue.longitude.toFixed(6) : 'N/A'}
                  </span>
                </div>

                <div className="h-[300px] relative overflow-hidden mt-4 rounded-md border">
                  {venue.latitude && venue.longitude ? (
                    <iframe 
                      width="100%"
                      height="100%"
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude-0.01},${venue.latitude-0.01},${venue.longitude+0.01},${venue.latitude+0.01}&layer=mapnik&marker=${venue.latitude},${venue.longitude}`}
                      style={{ border: 0 }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <div className="text-center p-4">
                        <MapPin className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-gray-500">Location Not Available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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