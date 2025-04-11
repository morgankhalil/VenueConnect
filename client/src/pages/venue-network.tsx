import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NetworkVisualization } from "@/components/venue-network/network-visualization";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getVenueNetworkGraph, getCollaborativeOpportunitiesByVenue, createVenueConnection, searchVenues } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";

export default function VenueNetwork() {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();
  
  // Get the current user from auth context
  const { currentVenueId: authVenueId, user } = useAuth();
  
  // Use a React.useEffect to track venue ID changes
  const [currentVenueId, setCurrentVenueId] = useState<number | null>(null);
  
  // Update the currentVenueId state when the auth venue ID changes
  useEffect(() => {
    if (authVenueId) {
      console.log(`Auth venue ID changed to ${authVenueId}`);
      setCurrentVenueId(authVenueId);
    } else {
      // Don't set a venue ID if none is available from auth context
      console.log("No venue ID available in auth context");
      setCurrentVenueId(null);
    }
  }, [authVenueId]);
  
  // Force a refetch of the user data when this page mounts to ensure we have the current venue ID
  useEffect(() => {
    // Refetch the current user to ensure we have the latest venue ID
    queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
  }, [queryClient]);

  // Ensure the venue network graph is refetched when the user changes 
  const { data: networkData, isLoading: isLoadingNetwork, refetch: refetchNetwork, error: networkError } = useQuery({
    queryKey: ['/api/venue-network/graph', currentVenueId],
    queryFn: async () => {
      if (!currentVenueId) {
        console.log("Cannot fetch venue network - no venue ID provided");
        return { nodes: [], links: [] };
      }
      
      console.log(`Fetching venue network for venue ID: ${currentVenueId}`);
      const data = await getVenueNetworkGraph(currentVenueId);
      return data;
    },
    enabled: !!currentVenueId, // Only fetch when we have a venue ID
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
  
  // Force a refetch when the venueId changes
  useEffect(() => {
    if (currentVenueId) {
      console.log(`Refetching network data for venue ID: ${currentVenueId}`);
      refetchNetwork();
    }
  }, [currentVenueId, refetchNetwork]);

  const createConnectionMutation = useMutation({
    mutationFn: (connection: { 
      venueId: number; 
      connectedVenueId: number; 
      status: string; 
      trustScore: number; 
      collaborativeBookings: number;
    }) => createVenueConnection(connection),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Venue connection created successfully"
      });
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/venue-network/graph', currentVenueId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create connection: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleNodeClick = (node: any) => {
    toast({
      title: "Venue Selected",
      description: `Selected ${node.name}`
    });
  };

  const handleAddVenue = () => {
    // Reset search state when opening the dialog
    setSearchQuery("");
    setSearchResults([]);
    setSelectedVenue(null);
    setShowInviteDialog(true);
  };
  
  // Handle search for venues
  const handleVenueSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await searchVenues(searchQuery);
      
      // Filter out venues that are already in the network
      const existingVenueIds = networkData?.nodes.map(node => node.id) || [];
      const filteredResults = results.filter(venue => !existingVenueIds.includes(venue.id));
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching venues:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for venues. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Show a different message if no venue is selected
  if (!currentVenueId) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
            <p className="text-amber-800 font-medium">No venue selected</p>
            <p className="text-amber-700 text-sm mt-1">
              Please select a venue from the venue selector in the navigation bar to view its network.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (isLoadingNetwork) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-heading font-semibold text-gray-900">Loading Network...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your venue connections and discover new collaboration opportunities
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleAddVenue} size="lg" className="shadow-sm">
              Connect New Venue
            </Button>
          </div>
        </div>

        <Tabs defaultValue="map" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map">Network Map</TabsTrigger>
            <TabsTrigger value="list">Connected Venues</TabsTrigger>
            <TabsTrigger value="stats">Network Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <NetworkVisualization 
              data={networkData || { nodes: [], links: [] }} 
              onNodeClick={handleNodeClick}
              onAddVenue={handleAddVenue}
            />
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-6">
                {networkData && networkData.nodes && networkData.nodes.length > 1 ? (
                  <div className="grid gap-4">
                    {networkData.nodes.filter(node => !node.isCurrentVenue).map((node) => (
                      <div key={node.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50">
                        <div>
                          <h3 className="font-medium text-gray-900">{node.name}</h3>
                          <p className="text-sm text-gray-500">{node.city}, {node.state}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="bg-primary-50 text-primary-700">
                            Trust Score: {node.trustScore}%
                          </Badge>
                          <Badge variant="outline">
                            {node.collaborativeBookings} Collaborations
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No connected venues yet</p>
                    <Button onClick={handleAddVenue}>Connect New Venue</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Connections</h3>
                  <p className="text-2xl font-semibold">{networkData?.nodes?.filter(n => !n.isCurrentVenue)?.length || 0}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Collaborations</h3>
                  <p className="text-2xl font-semibold">
                    {networkData?.links?.reduce((sum, link) => sum + (link.value || 0), 0) || 0}
                  </p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Average Trust Score</h3>
                  <p className="text-2xl font-semibold">
                    {(() => {
                        const connectedVenues = networkData?.nodes?.filter(n => !n.isCurrentVenue) || [];
                        if (connectedVenues.length === 0) return '0%';
                        const avgScore = Math.round(
                          connectedVenues.reduce((sum, n) => sum + (n.trustScore || 0), 0) / 
                          connectedVenues.length
                        );
                        return `${avgScore}%`;
                      })()}
                  </p>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/*The following TabsContent is redundant.  It's identical to the previous one.  Removing it.*/}
          {/*<TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Connections</h3>
                  <p className="text-2xl font-semibold">{networkData?.nodes.length - 1}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total Collaborations</h3>
                  <p className="text-2xl font-semibold">
                    {networkData?.links.reduce((sum, link) => sum + link.value, 0)}
                  </p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-gray-500">Average Trust Score</h3>
                  <p className="text-2xl font-semibold">
                    {networkData?.nodes.length > 1 
                      ? Math.round(networkData.nodes
                          .filter(n => !n.isCurrentVenue)
                          .reduce((sum, n) => sum + n.trustScore, 0) / 
                          (networkData.nodes.length - 1)
                        )
                      : 0}%
                  </p>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>*/}
        </Tabs>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect with a New Venue</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {/* Search for venues */}
            <div className="space-y-4 mb-6">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Search venues by name, city, or region"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleVenueSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              
              {/* Search results */}
              <div className="mt-4">
                {searchResults.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    {searchResults.map((venue) => (
                      <div 
                        key={venue.id}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedVenue?.id === venue.id ? 'bg-primary-50' : ''}`}
                        onClick={() => setSelectedVenue(venue)}
                      >
                        <div>
                          <h3 className="font-medium">{venue.name}</h3>
                          <p className="text-sm text-gray-500">{venue.city}, {venue.region}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {venue.capacity ? `Capacity: ${venue.capacity}` : 'No capacity data'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="text-center py-4 text-gray-500">
                    No venues found matching your search
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* Manual venue ID input and form submission */}
            <form onSubmit={(e) => {
              e.preventDefault();
              
              let targetVenueId: number;
              
              if (selectedVenue) {
                targetVenueId = selectedVenue.id;
              } else {
                const formData = new FormData(e.currentTarget);
                targetVenueId = Number(formData.get('venueId'));
              }

              if (targetVenueId && currentVenueId) {
                // Check if user has permission to manage venue network
                if (!hasPermission(user, 'canManageVenueNetwork')) {
                  toast({
                    title: "Permission Error",
                    description: "You don't have permission to manage venue connections",
                    variant: "destructive"
                  });
                  return;
                }
                
                createConnectionMutation.mutate({
                  venueId: currentVenueId,
                  connectedVenueId: targetVenueId,
                  status: 'pending',
                  trustScore: 50,
                  collaborativeBookings: 0
                });
              }
            }} className="space-y-4">
              {selectedVenue ? (
                <div className="space-y-2 rounded-md p-3 bg-primary-50 border">
                  <h3 className="font-medium">Selected Venue</h3>
                  <p>{selectedVenue.name} - {selectedVenue.city}, {selectedVenue.region}</p>
                  <input type="hidden" name="venueId" value={selectedVenue.id} />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedVenue(null)}
                    className="mt-2"
                  >
                    Clear Selection
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="venueId" className="text-sm font-medium">Or enter Venue ID manually</label>
                  <Input 
                    id="venueId"
                    name="venueId" 
                    type="number" 
                    placeholder="Enter venue ID"
                    required={!selectedVenue}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createConnectionMutation.isPending}
                >
                  {createConnectionMutation.isPending ? "Connecting..." : "Send Connection Request"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}