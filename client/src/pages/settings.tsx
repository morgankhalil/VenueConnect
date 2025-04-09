import React, { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    phone: "",
    role: "manager"
  });
  
  const [syncFormData, setSyncFormData] = useState({
    artistName: "",
    venueId: 18, // Default to Bug Jar venue ID if no user venue
    radius: 250,
    limit: 10
  });
  
  // Get user data from API
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('/api/user')
  });

  // Get venue data from API
  const { data: venue, isLoading: isLoadingVenue, error: venueError } = useQuery({
    queryKey: ['/api/venues', user?.id], 
    queryFn: async () => {
      // Make sure we have a valid user ID
      if (!user?.id || isNaN(Number(user.id))) {
        console.error("Invalid user ID:", user?.id);
        return Promise.reject(new Error("Invalid user ID"));
      }
      return apiRequest(`/api/venues/${user.id}`);
    },
    enabled: !!user && !!user.id && !isNaN(Number(user.id)), // Only run if user exists with valid ID
    retry: 1 // Only retry once if there's an error
  });
  
  // Get venue network connections
  const { data: networkData, isLoading: isLoadingNetwork } = useQuery({
    queryKey: ['/api/venue-network/graph', user?.id],
    queryFn: async () => {
      if (!user?.id || isNaN(Number(user.id))) {
        return { nodes: [], links: [] };
      }
      try {
        return await apiRequest(`/api/venue-network/graph/${user.id}`);
      } catch (err) {
        console.error("Error fetching venue network:", err);
        return { nodes: [], links: [] };
      }
    },
    enabled: !!user && !!user.id && !isNaN(Number(user.id))
  });
  
  // Check if the Bandsintown API key is configured
  const { data: bandsintownApiStatus } = useQuery({
    queryKey: ['/api/admin/api-keys/bandsintown/status'],
    queryFn: async () => {
      try {
        return await api.checkBandsintownApiStatus();
      } catch (err) {
        console.error("Error checking Bandsintown API key status:", err);
        return { configured: false, message: "Failed to check API key status" };
      }
    }
  });
  
  // Update form values when user data is loaded
  React.useEffect(() => {
    if (user) {
      setFormValues({
        name: user.name || "",
        email: user.email || user.contactEmail || "",
        phone: user.contactPhone || "",
        role: user.role || "manager"
      });
      
      // Update venue ID for sync operations
      if (user.venueId) {
        setSyncFormData(prev => ({
          ...prev,
          venueId: user.venueId
        }));
      }
    }
  }, [user]);
  
  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully."
    });
  };
  
  const handleAccountDelete = () => {
    toast({
      title: "Account Deletion",
      description: "Account deletion would require confirmation.",
      variant: "destructive"
    });
  };
  
  // Show loading state
  if (isLoadingUser || isLoadingVenue) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  // Show error state  
  if (userError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error loading user data</h2>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-heading font-semibold text-gray-900">Settings</h1>
        
        <div className="mt-6">
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-4 sm:w-[400px]">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="venue">Venue</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
            </TabsList>
            
            {/* Profile Settings */}
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your personal information and account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-lg">
                          {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button variant="outline" size="sm">
                          Change Avatar
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, GIF or PNG. 1MB max.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={formValues.name} 
                        onChange={(e) => setFormValues({...formValues, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formValues.email}
                        onChange={(e) => setFormValues({...formValues, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        value={formValues.phone}
                        onChange={(e) => setFormValues({...formValues, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={formValues.role}
                        onValueChange={(value) => setFormValues({...formValues, role: value})}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="booker">Booker</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update Password</Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-notifications" className="mb-1 block">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive email notifications about new opportunities</p>
                        </div>
                        <Switch id="email-notifications" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-notifications" className="mb-1 block">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive text messages for urgent communications</p>
                        </div>
                        <Switch id="sms-notifications" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="marketing-emails" className="mb-1 block">Marketing Emails</Label>
                          <p className="text-sm text-muted-foreground">Receive newsletter and promotional content</p>
                        </div>
                        <Switch id="marketing-emails" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button variant="destructive" onClick={handleAccountDelete}>
                      Delete Account
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Venue Settings */}
            <TabsContent value="venue" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Venue Information</CardTitle>
                  <CardDescription>
                    Manage your venue details and technical specifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">Venue Name</Label>
                      <Input id="venue-name" defaultValue={user?.venueName || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-address">Address</Label>
                      <Input id="venue-address" defaultValue={venue?.address || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-city">City</Label>
                      <Input id="venue-city" defaultValue={venue?.city || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-state">State</Label>
                      <Input id="venue-state" defaultValue={venue?.state || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-zip">Zip Code</Label>
                      <Input id="venue-zip" defaultValue={venue?.zipCode || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-capacity">Capacity</Label>
                      <Input id="venue-capacity" type="number" defaultValue={venue?.capacity || 0} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="venue-description">Venue Description</Label>
                    <Textarea 
                      id="venue-description" 
                      className="min-h-[100px]"
                      defaultValue={venue?.description || "No venue description available."}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Technical Specifications</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage-dimensions">Stage Dimensions</Label>
                          <Input id="stage-dimensions" defaultValue={venue?.stageDimensions || ""} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sound-system">Sound System</Label>
                          <Input id="sound-system" defaultValue={venue?.soundSystem || ""} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tech-specs">Detailed Technical Specifications</Label>
                        <Textarea 
                          id="tech-specs" 
                          className="min-h-[100px]"
                          defaultValue={venue?.technicalDetails || ""}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Network Settings */}
            <TabsContent value="network" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Settings</CardTitle>
                  <CardDescription>
                    Configure how you share information with your venue network
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Data Sharing Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-calendar" className="mb-1 block">Calendar Visibility</Label>
                          <p className="text-sm text-muted-foreground">Share your venue's calendar with network members</p>
                        </div>
                        <Switch id="share-calendar" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-artist-data" className="mb-1 block">Artist Performance Data</Label>
                          <p className="text-sm text-muted-foreground">Share artist performance analytics and insights</p>
                        </div>
                        <Switch id="share-artist-data" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-opportunities" className="mb-1 block">Booking Opportunities</Label>
                          <p className="text-sm text-muted-foreground">Allow opportunities to be visible to trusted partners</p>
                        </div>
                        <Switch id="share-opportunities" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Network Visibility</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="discovery-enabled" className="mb-1 block">Discovery Mode</Label>
                          <p className="text-sm text-muted-foreground">Allow other venues to discover and connect with you</p>
                        </div>
                        <Switch id="discovery-enabled" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-accept" className="mb-1 block">Auto-Accept Connections</Label>
                          <p className="text-sm text-muted-foreground">Automatically accept connection requests from verified venues</p>
                        </div>
                        <Switch id="auto-accept" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Connection Trust Rules</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure the rules that determine trust scores for your network connections
                    </p>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-trust-score">Minimum Trust Score</Label>
                          <Input 
                            id="min-trust-score" 
                            type="number" 
                            min="0" 
                            max="100" 
                            defaultValue="60" 
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum score (0-100) required for automatic data sharing
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight-collaborative-bookings">Collaborative Bookings Weight</Label>
                          <Input 
                            id="weight-collaborative-bookings" 
                            type="number" 
                            min="0" 
                            max="100" 
                            defaultValue="70" 
                          />
                          <p className="text-xs text-muted-foreground">
                            How much weight to give to successful collaborative bookings
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button variant="outline">
                      Reset to Defaults
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* API Settings */}
            <TabsContent value="api" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>External APIs & Data Integration</CardTitle>
                  <CardDescription>
                    Manage connections to external services and data providers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">Bandsintown API</h4>
                          <p className="text-sm text-muted-foreground">Connect to Bandsintown for artist and event data</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {bandsintownApiStatus?.configured ? (
                            <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Configured
                            </div>
                          ) : (
                            <div className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                              Not Configured
                            </div>
                          )}
                          <Switch 
                            id="bandsintown-enabled" 
                            defaultChecked={bandsintownApiStatus?.configured}
                            disabled={!bandsintownApiStatus?.configured}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="artist-name">Sync Artist Events</Label>
                          <div className="flex space-x-2">
                            <Input 
                              id="artist-name" 
                              value={syncFormData.artistName}
                              onChange={(e) => setSyncFormData({...syncFormData, artistName: e.target.value})}
                              placeholder="Enter artist name (e.g. 'Metallica')"
                              disabled={!bandsintownApiStatus?.configured}
                            />
                            <Button 
                              variant="secondary"
                              disabled={!bandsintownApiStatus?.configured || !syncFormData.artistName}
                              onClick={async () => {
                                if (!syncFormData.artistName) {
                                  toast({
                                    title: "Missing artist name",
                                    description: "Please enter an artist name to sync",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                toast({
                                  title: "Starting sync",
                                  description: `Fetching events for ${syncFormData.artistName}...`
                                });
                                
                                try {
                                  const response = await api.syncArtistEvents(syncFormData.artistName);
                                  
                                  toast({
                                    title: "Sync initiated",
                                    description: response.message || `Started sync for ${syncFormData.artistName}`
                                  });
                                  
                                  // Clear the input
                                  setSyncFormData({...syncFormData, artistName: ""});
                                } catch (error) {
                                  console.error("Error syncing artist:", error);
                                  toast({
                                    title: "Sync failed",
                                    description: "There was an error syncing artist events. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Sync Events
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            This will fetch and store all upcoming events for this artist from Bandsintown.
                            Depending on the artist's popularity, this might take a few moments.
                          </p>
                        </div>
                      
                        <Button 
                          variant="secondary"
                          disabled={!bandsintownApiStatus?.configured || !user?.id}
                          onClick={() => {
                            if (!user?.id) {
                              toast({
                                title: "Error",
                                description: "No venue ID available",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            toast({
                              title: "Sync Started",
                              description: "Venue sync with Bandsintown has been initiated."
                            });
                            
                            api.triggerVenueSync(user.id, 250, 10)
                              .then(() => {
                                toast({
                                  title: "Sync Requested",
                                  description: "The sync process is running in the background."
                                });
                              })
                              .catch(error => {
                                toast({
                                  title: "Sync Failed",
                                  description: error.message || "Could not start venue sync",
                                  variant: "destructive"
                                });
                              });
                          }}
                        >
                          Sync Venue Network Data
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Discovers nearby venues and adds them to your network
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin Link - Only visible to admin users */}
                  {user?.role === 'admin' && (
                    <div className="mt-6 border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Admin Settings</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure API keys, webhooks, and other system settings
                          </p>
                        </div>
                        <Button variant="outline" asChild>
                          <a href="/admin/settings">
                            Open Admin Panel
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Songkick API</h4>
                        <p className="text-sm text-muted-foreground">Connect to Songkick for artist tour data</p>
                      </div>
                      <Switch defaultChecked id="songkick-enabled" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="songkick-api-key">API Key</Label>
                      <div className="flex">
                        <Input id="songkick-api-key" type="password" defaultValue="•••••••••••••••••••" className="rounded-r-none" />
                        <Button variant="outline" className="rounded-l-none">Show</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Mapbox API</h4>
                        <p className="text-sm text-muted-foreground">Connect to Mapbox for geographic visualization</p>
                      </div>
                      <Switch defaultChecked id="mapbox-enabled" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mapbox-api-key">API Key</Label>
                      <div className="flex">
                        <Input id="mapbox-api-key" type="password" defaultValue="•••••••••••••••••••" className="rounded-r-none" />
                        <Button variant="outline" className="rounded-l-none">Show</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Spotify API</h4>
                        <p className="text-sm text-muted-foreground">Connect to Spotify for artist popularity metrics</p>
                      </div>
                      <Switch id="spotify-enabled" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spotify-client-id">Client ID</Label>
                      <Input id="spotify-client-id" />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="spotify-client-secret">Client Secret</Label>
                      <Input id="spotify-client-secret" type="password" />
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Connect Spotify
                    </Button>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}