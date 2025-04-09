import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NetworkVisualization } from "@/components/venue-network/network-visualization";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMockVenueNetworkData, getMockCollaborativeOpportunities } from "@/lib/api";
import { CollaborativeOpportunityWithDetails } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function VenueNetwork() {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Fetch network data
  const { data: networkData, isLoading: isLoadingNetwork } = useQuery({
    queryKey: ['/api/venue-network/graph'],
    queryFn: getMockVenueNetworkData
  });

  // Fetch collaborative opportunities
  const { data: collaborativeOpportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ['/api/collaborative-opportunities'],
    queryFn: getMockCollaborativeOpportunities
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

  const collaborativeColumns = [
    {
      header: "Artist",
      accessorKey: (row: CollaborativeOpportunityWithDetails) => row.artist.name
    },
    {
      header: "Venue Partners",
      accessorKey: (row: CollaborativeOpportunityWithDetails) => 
        row.participants.map(p => p.venue.name).join(", ")
    },
    {
      header: "Date Range",
      accessorKey: (row: CollaborativeOpportunityWithDetails) => 
        `${new Date(row.dateRangeStart).toLocaleDateString()} - ${new Date(row.dateRangeEnd).toLocaleDateString()}`
    },
    {
      header: "Status",
      cell: (row: CollaborativeOpportunityWithDetails) => {
        const statusMap: Record<string, { color: string, label: string }> = {
          "pending": { color: "bg-yellow-100 text-yellow-800", label: "Pending Response" },
          "ready": { color: "bg-green-100 text-green-800", label: "Ready for Offer" },
          "rejected": { color: "bg-red-100 text-red-800", label: "Rejected" },
          "confirmed": { color: "bg-blue-100 text-blue-800", label: "Confirmed" }
        };
        
        const status = statusMap[row.status] || statusMap.pending;
        
        return (
          <Badge className={status.color}>
            {status.label}
          </Badge>
        );
      }
    },
    {
      header: "Actions",
      cell: (row: CollaborativeOpportunityWithDetails) => (
        <Button variant="link" className="text-primary-600 hover:text-primary-900" onClick={() => {
          toast({
            title: "View Details",
            description: `Viewing details for collaborative opportunity with ${row.artist.name}`
          });
        }}>
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
              {/* Invite form would go here - just simulated for this implementation */}
              <p className="text-center py-4 text-sm text-muted-foreground">
                Venue invitation form would be implemented here
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Invitation Sent",
                    description: "Your invitation has been sent to the venue."
                  });
                  setShowInviteDialog(false);
                }}>
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
