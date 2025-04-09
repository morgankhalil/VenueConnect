import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getNetworkAgents, 
  createNetworkAgent, 
  updateNetworkAgent, 
  deleteNetworkAgent, 
  runNetworkAgent 
} from "@/lib/api";
import { NetworkAgent } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, BarChart3, Network, RefreshCw, Trash2, Edit, Play } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookingAgentConfig,
  NetworkGrowthAgentConfig,
  OpportunityAgentConfig
} from "@/types/agents";

// Form schema for creating/editing agents
const agentFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  type: z.enum(["booking", "network_growth", "opportunity"]),
  venueId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  config: z.any()
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

const defaultBookingConfig: BookingAgentConfig = {
  maxLookAheadDays: 90,
  minVenueSize: 500,
  priorityGenres: [],
  excludeGenres: [],
  preferredDayOfWeek: [5, 6], // Friday, Saturday
  targetCapacityRange: { min: 500, max: 2000 }
};

const defaultNetworkGrowthConfig: NetworkGrowthAgentConfig = {
  maxDistance: 300,
  minTrustScore: 70,
  preferredRegions: [],
  venueTypes: [],
  excludeCompetitors: true
};

const defaultOpportunityConfig: OpportunityAgentConfig = {
  lookAheadDays: 120,
  genreFocus: [],
  minConfidenceScore: 75,
  routingRadius: 200,
  notifyVenues: true
};

export default function AgentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<NetworkAgent | null>(null);
  const venueId = 1; // In a real app, this would come from auth or params
  
  // Fetch agents data
  const { data: agents, isLoading } = useQuery({
    queryKey: ['/api/venues', venueId, 'agents'],
    queryFn: () => getNetworkAgents(venueId)
  });
  
  // Set up form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      type: "booking",
      venueId: venueId,
      isActive: true,
      config: defaultBookingConfig
    }
  });
  
  // Get the current agent type
  const agentType = form.watch("type");
  
  // Update config when agent type changes
  React.useEffect(() => {
    if (agentType === "booking") {
      form.setValue("config", defaultBookingConfig);
    } else if (agentType === "network_growth") {
      form.setValue("config", defaultNetworkGrowthConfig);
    } else if (agentType === "opportunity") {
      form.setValue("config", defaultOpportunityConfig);
    }
  }, [agentType, form]);
  
  // Set up mutations
  const createMutation = useMutation({
    mutationFn: createNetworkAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/venues', venueId, 'agents'] });
      toast({
        title: "Agent created",
        description: "The agent has been created successfully"
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create agent",
        variant: "destructive"
      });
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, agent }: { id: number; agent: Partial<NetworkAgent> }) => 
      updateNetworkAgent(id, agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/venues', venueId, 'agents'] });
      toast({
        title: "Agent updated",
        description: "The agent has been updated successfully"
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive"
      });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteNetworkAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/venues', venueId, 'agents'] });
      toast({
        title: "Agent deleted",
        description: "The agent has been deleted successfully"
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    }
  });
  
  const runAgentMutation = useMutation({
    mutationFn: runNetworkAgent,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/venues', venueId, 'agents'] });
      toast({
        title: "Agent executed",
        description: data.message
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to run agent",
        variant: "destructive"
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (values: AgentFormValues) => {
    // Make sure config is never undefined
    const valuesWithConfig = {
      ...values,
      config: values.config || {}
    };
    
    if (currentAgent) {
      // Update existing agent
      updateMutation.mutate({ 
        id: currentAgent.id, 
        agent: valuesWithConfig 
      });
    } else {
      // Create new agent
      createMutation.mutate(valuesWithConfig);
    }
  };
  
  const openCreateDialog = () => {
    setCurrentAgent(null);
    form.reset({
      name: "",
      type: "booking",
      venueId: venueId,
      isActive: true,
      config: defaultBookingConfig
    });
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (agent: NetworkAgent) => {
    setCurrentAgent(agent);
    form.reset({
      name: agent.name,
      type: agent.type,
      venueId: agent.venueId,
      isActive: agent.isActive,
      config: agent.config
    });
    setIsDialogOpen(true);
  };
  
  const openDeleteDialog = (agent: NetworkAgent) => {
    setCurrentAgent(agent);
    setIsDeleteDialogOpen(true);
  };
  
  const runAgent = (agentId: number) => {
    runAgentMutation.mutate(agentId);
  };
  
  // Render agent type icon
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
  
  // Helper to format agent type display
  const formatAgentType = (type: string) => {
    switch (type) {
      case "booking":
        return "Booking Agent";
      case "network_growth":
        return "Network Growth Agent";
      case "opportunity":
        return "Opportunity Agent";
      default:
        return type;
    }
  };
  
  // Format last run time
  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return "Never run";
    return new Date(lastRun).toLocaleString();
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">Network Agents</h1>
          <Button onClick={openCreateDialog}>Create Agent</Button>
        </div>
        
        {isLoading ? (
          <div>Loading agents...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents && agents.length > 0 ? (
              agents.map((agent) => (
                <Card key={agent.id} className={`${agent.isActive ? "" : "opacity-70"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {getAgentIcon(agent.type)}
                        <CardTitle className="ml-2">{agent.name}</CardTitle>
                      </div>
                      <Badge variant={agent.isActive ? "default" : "outline"}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-1 text-sm text-gray-500">
                      {formatAgentType(agent.type)}
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Last run: {formatLastRun(agent.lastRun)}
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openEditDialog(agent)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => openDeleteDialog(agent)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => runAgent(agent.id)}
                        disabled={runAgentMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a new agent to help automate venue networking and booking tasks.
                </p>
                <div className="mt-6">
                  <Button onClick={openCreateDialog}>Create Your First Agent</Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {currentAgent ? "Edit Agent" : "Create New Agent"}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter agent name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Type</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        defaultValue={field.value}
                        disabled={!!currentAgent}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="booking">Booking Agent</SelectItem>
                          <SelectItem value="network_growth">Network Growth Agent</SelectItem>
                          <SelectItem value="opportunity">Opportunity Agent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {agentType === "booking" && (
                          "Booking agents help identify optimal dates for new bookings."
                        )}
                        {agentType === "network_growth" && (
                          "Network growth agents suggest new venues to connect with."
                        )}
                        {agentType === "opportunity" && (
                          "Opportunity agents find booking opportunities with other venues."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active
                        </FormLabel>
                        <FormDescription>
                          Active agents will run automatically on a schedule.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <h3 className="text-lg font-medium text-gray-900 pt-2">Agent Configuration</h3>
                
                {agentType === "booking" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxLookAheadDays">Max Look Ahead (days)</Label>
                        <Input
                          id="maxLookAheadDays"
                          type="number"
                          min="1"
                          max="365"
                          value={form.getValues("config")?.maxLookAheadDays || 90}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultBookingConfig;
                            form.setValue("config", {
                              ...config,
                              maxLookAheadDays: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minVenueSize">Min Venue Size</Label>
                        <Input
                          id="minVenueSize"
                          type="number"
                          min="0"
                          value={form.getValues("config")?.minVenueSize || 500}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultBookingConfig;
                            form.setValue("config", {
                              ...config,
                              minVenueSize: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {agentType === "network_growth" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxDistance">Max Distance (miles)</Label>
                        <Input
                          id="maxDistance"
                          type="number"
                          min="0"
                          value={form.getValues("config")?.maxDistance || 300}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultNetworkGrowthConfig;
                            form.setValue("config", {
                              ...config,
                              maxDistance: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minTrustScore">Min Trust Score</Label>
                        <Input
                          id="minTrustScore"
                          type="number"
                          min="0"
                          max="100"
                          value={form.getValues("config")?.minTrustScore || 70}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultNetworkGrowthConfig;
                            form.setValue("config", {
                              ...config,
                              minTrustScore: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          Exclude Competitors
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Don't suggest competing venues in the same area.
                        </p>
                      </div>
                      <Switch
                        checked={form.getValues("config")?.excludeCompetitors !== false}
                        onCheckedChange={(checked) => {
                          const config = form.getValues("config") || defaultNetworkGrowthConfig;
                          form.setValue("config", {
                            ...config,
                            excludeCompetitors: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {agentType === "opportunity" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lookAheadDays">Look Ahead (days)</Label>
                        <Input
                          id="lookAheadDays"
                          type="number"
                          min="1"
                          max="365"
                          value={form.getValues("config")?.lookAheadDays || 120}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultOpportunityConfig;
                            form.setValue("config", {
                              ...config,
                              lookAheadDays: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minConfidenceScore">Min Confidence Score</Label>
                        <Input
                          id="minConfidenceScore"
                          type="number"
                          min="0"
                          max="100"
                          value={form.getValues("config")?.minConfidenceScore || 75}
                          onChange={(e) => {
                            const config = form.getValues("config") || defaultOpportunityConfig;
                            form.setValue("config", {
                              ...config,
                              minConfidenceScore: parseInt(e.target.value)
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          Notify Venues
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically notify connected venues about opportunities.
                        </p>
                      </div>
                      <Switch
                        checked={form.getValues("config")?.notifyVenues !== false}
                        onCheckedChange={(checked) => {
                          const config = form.getValues("config") || defaultOpportunityConfig;
                          form.setValue("config", {
                            ...config,
                            notifyVenues: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {currentAgent ? "Update Agent" : "Create Agent"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              Are you sure you want to delete this agent?
              {currentAgent && (
                <p className="font-medium mt-2">{currentAgent.name}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => currentAgent && deleteMutation.mutate(currentAgent.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}