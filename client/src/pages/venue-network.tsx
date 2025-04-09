import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NetworkVisualization } from "@/components/venue-network/network-visualization";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getVenueNetworkGraph, getCollaborativeOpportunitiesByVenue, createVenueConnection, getMockCollaborativeOpportunities } from "@/lib/api";
import { CollaborativeOpportunityWithDetails, Venue } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

export default function VenueNetwork() {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();
  
  // For now, let's hardcode a current venue ID until we have authentication
  const currentVenueId = 1; // The Echo Lounge venue ID

  // Fetch network data
  const { data: networkData, isLoading: isLoadingNetwork } = useQuery({
    queryKey: ['/api/venue-network/graph', currentVenueId],
    queryFn: () => getVenueNetworkGraph(currentVenueId)
  });

  // Fetch collaborative opportunities
  // TODO: Replace with real API once it's fully implemented with proper joined data
  const { data: collaborativeOpportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ['/api/venues', currentVenueId, 'collaborative-opportunities'],
    queryFn: getMockCollaborativeOpportunities
    // Real API would be:
    // queryFn: () => getCollaborativeOpportunitiesByVenue(currentVenueId)
  });
  
  // Mutation for creating a venue connection
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
        title: "Invitation Sent",
        description: "Your invitation has been sent to the venue."
      });
      setShowInviteDialog(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/venue-network/graph', currentVenueId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send invitation: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleNodeClick = (node: any) => {
    toast({
      title: "Venue Selected",
      description: `Viewing details for ${node.name}`
    });
  };

  const handleAddVenue = () => {
    setShowInviteDialog(true);
  };

  // Define type-safe columns for DataTable
  const collaborativeColumns = [
    {
      header: "Artist",
      accessorKey: "artist" as keyof CollaborativeOpportunityWithDetails,
      cell: (row: CollaborativeOpportunityWithDetails) => <span>{row.artist.name}</span>
    },
    {
      header: "Venue Partners",
      accessorKey: "participants" as keyof CollaborativeOpportunityWithDetails,
      cell: (row: CollaborativeOpportunityWithDetails) => 
        <span>{row.participants.map(p => p.venue.name).join(", ")}</span>
    },
    {
      header: "Date Range",
      accessorKey: "dateRangeStart" as keyof CollaborativeOpportunityWithDetails,
      cell: (row: CollaborativeOpportunityWithDetails) => 
        <span>{`${new Date(row.dateRangeStart).toLocaleDateString()} - ${new Date(row.dateRangeEnd).toLocaleDateString()}`}</span>
    },
    {
      header: "Status",
      accessorKey: "status" as keyof CollaborativeOpportunityWithDetails,
      cell: (row: CollaborativeOpportunityWithDetails) => {
        const statusMap: Record<string, { color: string, label: string }> = {
          "pending": { color: "bg-yellow-100 text-yellow-800", label: "Pending Response" },
          "ready": { color: "bg-green-100 text-green-800", label: "Ready for Offer" },
          "rejected": { color: "bg-red-100 text-red-800", label: "Rejected" },
          "confirmed": { color: "bg-blue-100 text-blue-800", label: "Confirmed" }
        };
        
        const statusInfo = statusMap[row.status] || statusMap.pending;
        
        return (
          <Badge className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
        );
      }
    },
    {
      header: "Actions",
      accessorKey: "id" as keyof CollaborativeOpportunityWithDetails,
      cell: (row: CollaborativeOpportunityWithDetails) => (
        <Button 
          variant="link" 
          className="text-primary-600 hover:text-primary-900" 
          onClick={() => {
            toast({
              title: "View Details",
              description: `Viewing details for collaborative opportunity with ${row.artist.name}`
            });
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Venue Network</h1>
      
        {/* Network Visualization */}
        <div className="mt-6">
          {isLoadingNetwork ? (
            <Card>
              <CardContent className="flex items-center justify-center h-80">
                <p>Loading network data...</p>
              </CardContent>
            </Card>
          ) : (
            <NetworkVisualization 
              data={networkData || { nodes: [], links: [] }} 
              onNodeClick={handleNodeClick}
              onAddVenue={handleAddVenue}
            />
          )}
        </div>
        
        {/* Collaborative Opportunities */}
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Network Collaboration Opportunities</h3>
              
              {isLoadingOpportunities ? (
                <p>Loading opportunities...</p>
              ) : (
                <DataTable 
                  data={collaborativeOpportunities || []}
                  columns={collaborativeColumns}
                  searchable
                  pagination
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Venue Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Venue to Network</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Enter the details of the venue you would like to invite to your network.
            </p>
            <div className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                // In a full implementation, we would use react-hook-form with proper validation
                const venueId = Number(formData.get('venueId'));
                
                if (venueId && currentVenueId) {
                  // Create the venue connection
                  const connection = {
                    venueId: currentVenueId,
                    connectedVenueId: venueId,
                    status: 'pending',
                    trustScore: 50,
                    collaborativeBookings: 0
                  };
                  
                  // Use the mutation to create the connection
                  createConnectionMutation.mutate(connection);
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="venueId" className="text-sm font-medium">Venue ID</label>
                  <input 
                    id="venueId"
                    name="venueId" 
                    type="number" 
                    className="w-full p-2 border rounded" 
                    placeholder="Enter venue ID to connect with"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter the ID of the venue you'd like to add to your network.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Invitation Message</label>
                  <textarea 
                    id="message"
                    name="message" 
                    className="w-full p-2 border rounded min-h-[100px]" 
                    placeholder="Enter a personal message to the venue"
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowInviteDialog(false)}
                    disabled={createConnectionMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createConnectionMutation.isPending}
                  >
                    {createConnectionMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
