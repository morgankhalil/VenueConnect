import React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollaborativeOpportunityWithDetails } from "@/types";
import { Calendar, Music, Users } from "lucide-react";

interface CollaborativeOpportunityTableProps {
  opportunities: CollaborativeOpportunityWithDetails[];
  isLoading: boolean;
  onViewDetails: (opportunity: CollaborativeOpportunityWithDetails) => void;
}

export function CollaborativeOpportunityTable({
  opportunities,
  isLoading,
  onViewDetails
}: CollaborativeOpportunityTableProps) {
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      "pending": { color: "bg-yellow-100 text-yellow-800", label: "Pending Response" },
      "ready": { color: "bg-green-100 text-green-800", label: "Ready for Offer" },
      "rejected": { color: "bg-red-100 text-red-800", label: "Rejected" },
      "confirmed": { color: "bg-blue-100 text-blue-800", label: "Confirmed" }
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const columns = [
    {
      header: "Artist",
      accessorKey: "artist",
      cell: (row: { artist: any }) => (
        <div className="flex items-center space-x-2">
          <Music className="h-4 w-4 text-gray-400" />
          <span>{row.artist.name}</span>
        </div>
      )
    },
    {
      header: "Participating Venues",
      accessorKey: "participants",
      cell: (row: { participants: any[] }) => (
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{row.participants.length} venues</span>
        </div>
      )
    },
    {
      header: "Date Range",
      accessorKey: "dateRange",
      cell: (row: { dateRangeStart: string; dateRangeEnd: string }) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDateRange(row.dateRangeStart, row.dateRangeEnd)}</span>
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: { status: string }) => getStatusBadge(row.status)
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row: CollaborativeOpportunityWithDetails) => (
        <Button 
          variant="link" 
          className="text-primary-600 hover:text-primary-900"
          onClick={() => onViewDetails(row)}
        >
          View Details
        </Button>
      )
    }
  ];

  if (isLoading) {
    return <div className="text-center py-8">Loading collaborative opportunities...</div>;
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium">No collaborative opportunities found</p>
        <p className="text-sm text-muted-foreground mt-2">Create a new opportunity to collaborate with venues in your network</p>
      </div>
    );
  }

  return (
    <DataTable
      data={opportunities}
      columns={columns}
      searchable
      pagination
      pageSize={5}
    />
  );
}
