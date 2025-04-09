import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { NetworkAgent } from "@/types";
import { AgentResult } from "@/types/agents";
import { Check, X, Calendar, Network, BarChart3, RefreshCw, ExternalLink } from "lucide-react";

interface AgentActivityProps {
  agent: NetworkAgent;
  results: AgentResult[];
  onApply: (resultId: number) => void;
  onView: (resultId: number) => void;
  onDecline: (resultId: number) => void;
}

export default function AgentActivity({
  agent,
  results,
  onApply,
  onView,
  onDecline
}: AgentActivityProps) {
  // Get the agent icon based on type
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "network_growth":
        return <Network className="h-5 w-5 text-green-500" />;
      case "opportunity":
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      default:
        return <RefreshCw className="h-5 w-5" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get the result type badge
  const getResultTypeBadge = (type: string) => {
    switch (type) {
      case "opportunity":
        return <Badge className="bg-blue-500">Booking Opportunity</Badge>;
      case "connection":
        return <Badge className="bg-green-500">New Connection</Badge>;
      case "routing":
        return <Badge className="bg-purple-500">Routing Suggestion</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Get the status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "accepted":
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          {getAgentIcon(agent.type)}
          <CardTitle>{agent.name}</CardTitle>
          <Badge variant={agent.isActive ? "default" : "outline"}>
            {agent.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="text-sm text-gray-500">
          {agent.lastRun ? `Last run: ${new Date(agent.lastRun).toLocaleString()}` : "Never run"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3 className="font-medium">Recent Activity</h3>
          
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activity for this agent yet. Run the agent to generate results.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="text-sm">
                      {formatTimestamp(result.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getResultTypeBadge(result.resultType)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onView(result.id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {result.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => onApply(result.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDecline(result.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}