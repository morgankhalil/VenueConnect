import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NetworkVisualization } from "@/components/venue-network/network-visualization";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getVenueNetworkGraph, getCollaborativeOpportunitiesByVenue, createVenueConnection } from "@/lib/api";
import { CollaborativeOpportunityWithDetails, Venue } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function VenueNetwork() {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  // For now, hardcode currentVenueId to 1 (The Echo Lounge)
  const currentVenueId = 1;

  // Fetch network data
  const { data: networkData, isLoading: isLoadingNetwork } = useQuery({
    queryKey: ['/api/venue-network/graph', currentVenueId],
    queryFn: () => getVenueNetworkGraph(currentVenueId)
  });

  // Fetch collaborative opportunities (This is removed in the edited code, but kept for completeness if needed later)
  const { data: collaborativeOpportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ['/api/venues', currentVenueId, 'collaborative-opportunities'],
    queryFn: () => getCollaborativeOpportunitiesByVenue(currentVenueId)
  });

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
    setShowInviteDialog(true);
  };

  if (isLoadingNetwork) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>
          <div className="mt-6">
            <Card>
              <CardContent className="flex items-center justify-center h-80">
                <p>Loading network data...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!networkData || !networkData.nodes?.length) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>
          <div className="mt-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-80 space-y-4">
                <p>No venues found in the network.</p>
                <Button onClick={handleAddVenue}>Add First Venue</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>

        <div className="mt-6">
          <NetworkVisualization 
            data={networkData || { nodes: [], links: [] }} 
            onNodeClick={handleNodeClick}
            onAddVenue={handleAddVenue}
          />
        </div>

        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Venues</h3>
              {networkData?.nodes.filter(node => !node.isCurrentVenue).map(node => (
                <div key={node.id} className="mb-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{node.name}</h4>
                      <p className="text-sm text-gray-500">{node.city}, {node.state}</p>
                    </div>
                    <Badge>
                      Trust Score: {node.trustScore}%
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Venue to Network</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const venueId = Number(formData.get('venueId'));

              if (venueId && currentVenueId) {
                createConnectionMutation.mutate({
                  venueId: currentVenueId,
                  connectedVenueId: venueId,
                  status: 'pending',
                  trustScore: 50,
                  collaborativeBookings: 0
                });
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="venueId" className="text-sm font-medium">Venue ID</label>
                <input 
                  id="venueId"
                  name="venueId" 
                  type="number" 
                  className="w-full p-2 border rounded" 
                  placeholder="Enter venue ID"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}