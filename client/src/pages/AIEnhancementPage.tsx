import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AIEnhancer from '../components/AIEnhancer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Building2, MusicIcon } from 'lucide-react';

export default function AIEnhancementPage() {
  const [selectedVenueId, setSelectedVenueId] = useState<number | undefined>();
  const [selectedArtistId, setSelectedArtistId] = useState<number | undefined>();
  
  // Fetch all venues
  const venuesQuery = useQuery({
    queryKey: ['/api/venues'],
    refetchOnWindowFocus: false,
  });

  // Fetch all artists
  const artistsQuery = useQuery({
    queryKey: ['/api/artists'],
    refetchOnWindowFocus: false,
  });

  return (
    <Container>
      <div className="py-10 space-y-6">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">AI Data Enhancement</h1>
        </div>
        
        <p className="text-muted-foreground">
          Use AI to enhance venue and artist descriptions, normalize data formats, and generate 
          additional context about musical venues and artists.
        </p>
        
        <Separator />
        
        <Tabs defaultValue="venues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="venues" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Enhance Venues</span>
            </TabsTrigger>
            <TabsTrigger value="artists" className="flex items-center space-x-2">
              <MusicIcon className="h-4 w-4" />
              <span>Enhance Artists</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Venue Enhancement Tab */}
          <TabsContent value="venues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Venue</CardTitle>
                <CardDescription>
                  Choose a venue to enhance with AI-generated descriptions and metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                {venuesQuery.isLoading ? (
                  <p>Loading venues...</p>
                ) : venuesQuery.isError ? (
                  <p className="text-red-500">Error loading venues</p>
                ) : venuesQuery.data?.length === 0 ? (
                  <p>No venues found</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-select">Venue</Label>
                      <Select 
                        value={selectedVenueId?.toString() || ''} 
                        onValueChange={(value) => setSelectedVenueId(parseInt(value, 10))}
                      >
                        <SelectTrigger id="venue-select">
                          <SelectValue placeholder="Select a venue" />
                        </SelectTrigger>
                        <SelectContent>
                          {venuesQuery.data?.map((venue: any) => (
                            <SelectItem key={venue.id} value={venue.id.toString()}>
                              {venue.name} ({venue.city}, {venue.region})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {selectedVenueId && (
              <AIEnhancer 
                entityType="venue" 
                entityId={selectedVenueId}
                initialData={venuesQuery.data?.find((v: any) => v.id === selectedVenueId)}
                onEnhanced={() => venuesQuery.refetch()}
              />
            )}
          </TabsContent>
          
          {/* Artist Enhancement Tab */}
          <TabsContent value="artists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Artist</CardTitle>
                <CardDescription>
                  Choose an artist to enhance with AI-generated descriptions and metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                {artistsQuery.isLoading ? (
                  <p>Loading artists...</p>
                ) : artistsQuery.isError ? (
                  <p className="text-red-500">Error loading artists</p>
                ) : artistsQuery.data?.length === 0 ? (
                  <p>No artists found</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="artist-select">Artist</Label>
                      <Select 
                        value={selectedArtistId?.toString() || ''} 
                        onValueChange={(value) => setSelectedArtistId(parseInt(value, 10))}
                      >
                        <SelectTrigger id="artist-select">
                          <SelectValue placeholder="Select an artist" />
                        </SelectTrigger>
                        <SelectContent>
                          {artistsQuery.data?.map((artist: any) => (
                            <SelectItem key={artist.id} value={artist.id.toString()}>
                              {artist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {selectedArtistId && (
              <AIEnhancer 
                entityType="artist" 
                entityId={selectedArtistId}
                initialData={artistsQuery.data?.find((a: any) => a.id === selectedArtistId)}
                onEnhanced={() => artistsQuery.refetch()}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}