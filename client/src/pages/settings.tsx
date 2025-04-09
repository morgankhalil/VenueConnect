import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    phone: "",
    role: "manager"
  });
  
  // Get user data from API
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('GET', '/api/user').then(res => res.json())
  });

  // Get venue data from API
  const { data: venue, isLoading: isLoadingVenue } = useQuery({
    queryKey: ['/api/venues/14'], // Using venue ID from user
    queryFn: () => apiRequest('GET', `/api/venues/14`).then(res => res.json()),
    enabled: !!user // Only run this query if user data exists
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
                      <Input id="venue-address" defaultValue="123 Main St" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-city">City</Label>
                      <Input id="venue-city" defaultValue="Columbus" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-state">State</Label>
                      <Input id="venue-state" defaultValue="OH" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-zip">Zip Code</Label>
                      <Input id="venue-zip" defaultValue="43215" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-capacity">Capacity</Label>
                      <Input id="venue-capacity" type="number" defaultValue="1000" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="venue-description">Venue Description</Label>
                    <Textarea 
                      id="venue-description" 
                      className="min-h-[100px]"
                      defaultValue="The Echo Lounge is a premier music venue in Columbus, featuring state-of-the-art sound systems and an intimate atmosphere for performances."
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Technical Specifications</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage-dimensions">Stage Dimensions</Label>
                          <Input id="stage-dimensions" defaultValue="30ft x 20ft" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sound-system">Sound System</Label>
                          <Input id="sound-system" defaultValue="L-Acoustics PA System" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tech-specs">Detailed Technical Specifications</Label>
                        <Textarea 
                          id="tech-specs" 
                          className="min-h-[100px]"
                          defaultValue="Complete sound system with digital mixing console, professional lighting rig, green rooms, and backstage amenities."
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
                          <Label htmlFor="share-opportunities" className="mb-1 block">Booking Opportunities</Label>
                          <p className="text-sm text-muted-foreground">Share potential booking opportunities with your network</p>
                        </div>
                        <Switch id="share-opportunities" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-artist-info" className="mb-1 block">Artist Information</Label>
                          <p className="text-sm text-muted-foreground">Share details about artists who have performed at your venue</p>
                        </div>
                        <Switch id="share-artist-info" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-financial" className="mb-1 block">Financial Information</Label>
                          <p className="text-sm text-muted-foreground">Share ticket sales and revenue data with trusted venues</p>
                        </div>
                        <Switch id="share-financial" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Network Trust Levels</h3>
                    <p className="text-sm text-muted-foreground">Configure trust levels for different venues in your network</p>
                    
                    <div className="border rounded-md">
                      <div className="p-4 border-b bg-gray-50 grid grid-cols-5 font-medium">
                        <div className="col-span-2">Venue</div>
                        <div>Trust Level</div>
                        <div>Data Sharing</div>
                        <div>Actions</div>
                      </div>
                      
                      <div className="p-4 border-b grid grid-cols-5 items-center">
                        <div className="col-span-2">The Fillmore (San Francisco)</div>
                        <div>
                          <Select defaultValue="high">
                            <SelectTrigger>
                              <SelectValue placeholder="Trust Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>Full Access</div>
                        <div>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                      
                      <div className="p-4 border-b grid grid-cols-5 items-center">
                        <div className="col-span-2">9:30 Club (Washington DC)</div>
                        <div>
                          <Select defaultValue="medium">
                            <SelectTrigger>
                              <SelectValue placeholder="Trust Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>Limited Access</div>
                        <div>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                      
                      <div className="p-4 grid grid-cols-5 items-center">
                        <div className="col-span-2">First Avenue (Minneapolis)</div>
                        <div>
                          <Select defaultValue="low">
                            <SelectTrigger>
                              <SelectValue placeholder="Trust Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>Basic Access</div>
                        <div>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
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
            
            {/* API Settings */}
            <TabsContent value="api" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Integrations</CardTitle>
                  <CardDescription>
                    Manage your API keys and external service integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Tour Data Sources</h3>
                    
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">Bandsintown API</h4>
                            <p className="text-sm text-muted-foreground">Connect to Bandsintown for artist tour data</p>
                          </div>
                          <Switch defaultChecked id="bandsintown-enabled" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bandsintown-api-key">API Key</Label>
                          <div className="flex">
                            <Input id="bandsintown-api-key" type="password" defaultValue="•••••••••••••••••••" className="rounded-r-none" />
                            <Button variant="outline" className="rounded-l-none">Show</Button>
                          </div>
                        </div>
                      </div>
                      
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
