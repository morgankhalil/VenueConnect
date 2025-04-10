import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  optimizeTourRoute,
  applyTourOptimization,
  getTourById,
} from '@/lib/api';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import {
  Wand2,
  Truck,
  Check,
  Building,
  Map,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  BarChart,
  Calendar,
  Info,
} from 'lucide-react';

// Optimization preferences interface
interface OptimizationPreferences {
  optimizationGoal: 'distance' | 'time' | 'balance' | 'revenue' | 'market';
  preferredRegions: string[];
  minDaysBetweenShows: number;
  maxDaysBetweenShows: number;
  maxTravelDistancePerDay: number;
  requiredDaysOff: string[];
  avoidCities: string[];
  focusOnArtistFanbase: boolean;
  prioritizeVenueSize: 'small' | 'medium' | 'large' | 'any';
}

// Warning message interface
interface WarningMessage {
  key: string;
  message: string;
}

// Tour optimizer props
interface TourOptimizerProps {
  tourId: number;
  onSuccess?: (result: any) => void;
  initialTab?: string;
}

/**
 * Unified Tour Optimizer Component
 * 
 * Combines the functionality of the quick optimizer and the AI wizard
 * into a single, streamlined component with real-time preference adjustments.
 */
export function UnifiedTourOptimizer({ tourId, onSuccess, initialTab = 'preferences' }: TourOptimizerProps) {
  // State management
  const [activeTab, setActiveTab] = useState(initialTab);
  const [preferences, setPreferences] = useState<OptimizationPreferences>({
    optimizationGoal: 'balance',
    preferredRegions: [],
    minDaysBetweenShows: 1,
    maxDaysBetweenShows: 5,
    maxTravelDistancePerDay: 500,
    requiredDaysOff: [],
    avoidCities: [],
    focusOnArtistFanbase: true,
    prioritizeVenueSize: 'any'
  });
  const [lastRanPreferences, setLastRanPreferences] = useState<OptimizationPreferences | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('Setting up optimization...');
  
  const { toast } = useToast();
  
  // Fetch tour data
  const { data: tourData, refetch: refetchTour } = useQuery({
    queryKey: ['/api/tour/tours', tourId],
    queryFn: () => getTourById(tourId)
  });
  
  // Optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: (prefs: OptimizationPreferences) => optimizeTourRoute(tourId, prefs),
    onSuccess: (data) => {
      toast({
        title: 'Tour Optimized',
        description: `Tour optimization complete with score: ${data.optimizationScore.toFixed(2)}`,
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Update lastRanPreferences to track what we've run
      setLastRanPreferences({...preferences});
      
      // Automatically switch to results tab
      setActiveTab('results');
      setProgress(100);
      setProcessingStatus('Optimization complete!');
    },
    onError: (error: any) => {
      console.error('Optimization error:', error);
      
      // Generic error message as fallback
      let errorMessage = 'Failed to optimize tour. Please try again.';
      
      // Handle specific error cases with more helpful messages
      if (error?.message?.includes('at least 2 venues with dates')) {
        errorMessage = 'This tour needs at least 2 venues with confirmed dates to be optimized. Please add dates to your tour venues first.';
      }
      
      toast({
        title: 'Optimization Failed',
        description: error?.message || errorMessage,
        variant: 'destructive',
        duration: 6000, // Show longer for error messages
      });
      
      setProgress(0);
      setActiveTab('preferences'); // Return to preferences tab
    },
  });
  
  // Determine if we have enough venues 
  const hasEnoughVenues = (tourData?.venues?.length || 0) >= 2;
  
  // Determine if we have enough venues with dates for advanced features
  const hasEnoughVenuesWithDates = tourData?.venues?.filter(
    (venue: any) => venue.tourVenue?.date
  ).length >= 2;
  
  // Simulate progress animation during processing
  useEffect(() => {
    if (optimizeMutation.isPending && activeTab === 'processing') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          
          const step = Math.floor(Math.random() * 10) + 1;
          const newProgress = Math.min(prev + step, 95);
          
          // Update status based on progress
          if (newProgress > 90) {
            setProcessingStatus('Finalizing optimization...');
          } else if (newProgress > 75) {
            setProcessingStatus('Calculating venue scores...');
          } else if (newProgress > 60) {
            setProcessingStatus('Preserving confirmed venues...');
          } else if (newProgress > 40) {
            setProcessingStatus('Analyzing route options...');
          } else if (newProgress > 20) {
            setProcessingStatus('Identifying venue opportunities...');
          } else if (newProgress > 10) {
            setProcessingStatus('Processing tour constraints...');
          }
          
          return newProgress;
        });
      }, 600);
      
      return () => clearInterval(interval);
    }
    
    if (optimizeMutation.isSuccess) {
      setProgress(100);
      setProcessingStatus('Optimization complete!');
    }
  }, [optimizeMutation.isPending, activeTab, optimizeMutation.isSuccess]);
  
  // Handle running the optimization
  const handleRunOptimization = () => {
    setProgress(0);
    setActiveTab('processing');
    optimizeMutation.mutate(preferences);
  };
  
  // Check if preferences have changed from last run
  const preferencesChanged = () => {
    if (!lastRanPreferences) return true;
    
    return JSON.stringify(preferences) !== JSON.stringify(lastRanPreferences);
  };
  
  // Handle optimization goal selection
  const selectOptimizationGoal = (goal: 'distance' | 'time' | 'balance' | 'revenue' | 'market') => {
    setPreferences(prev => ({
      ...prev,
      optimizationGoal: goal
    }));
  };
  
  // Render preference conflict warnings
  const renderWarnings = () => {
    // Warning messages to display
    const warningMessages: WarningMessage[] = [];
    
    // Check for potentially conflicting constraints
    if (preferences.minDaysBetweenShows > 3 && preferences.maxTravelDistancePerDay < 300) {
      warningMessages.push({
        key: "conflict-1",
        message: "Long rest periods between shows (over 3 days) with low daily travel distance (under 300km) may make it difficult to reach all desired venues."
      });
    }
    
    if (preferences.preferredRegions.length > 0 && preferences.maxTravelDistancePerDay < 400) {
      warningMessages.push({
        key: "conflict-2",
        message: "Multiple preferred regions with limited daily travel distance may result in inefficient routing or missed opportunities."
      });
    }
    
    // Create React elements for each warning
    const warningElements = warningMessages.map(warning => (
      <div key={warning.key} className="flex items-start p-2 rounded-md bg-amber-50 border border-amber-200">
        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
        <div className="text-sm">
          <strong>Potential conflict:</strong> {warning.message}
        </div>
      </div>
    ));
    
    return warningElements.length > 0 ? (
      <div className="space-y-2 mt-4">
        <h4 className="font-medium text-sm flex items-center">
          <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
          Constraint Warnings
        </h4>
        <div className="space-y-2">
          {warningElements}
        </div>
      </div>
    ) : null;
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="processing" disabled={optimizeMutation.isPending}>Processing</TabsTrigger>
          <TabsTrigger value="results" disabled={!optimizeMutation.data}>Results</TabsTrigger>
        </TabsList>
        
        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {!hasEnoughVenuesWithDates && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                  Important: Not enough tour dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This tour needs at least 2 venues with specific dates to be optimized. 
                  Please add at least 2 confirmed dates to your tour schedule before running the optimizer.
                </p>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
                <CardDescription>
                  Configure how you want your tour to be optimized
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Optimization Goal</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Button 
                      variant={preferences.optimizationGoal === 'distance' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => selectOptimizationGoal('distance')}
                      className="justify-start"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      <span className="text-xs">Minimize Distance</span>
                    </Button>
                    <Button 
                      variant={preferences.optimizationGoal === 'time' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => selectOptimizationGoal('time')}
                      className="justify-start"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      <span className="text-xs">Optimize Timing</span>
                    </Button>
                    <Button 
                      variant={preferences.optimizationGoal === 'balance' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => selectOptimizationGoal('balance')}
                      className="justify-start"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      <span className="text-xs">Balanced</span>
                    </Button>
                    <Button 
                      variant={preferences.optimizationGoal === 'revenue' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => selectOptimizationGoal('revenue')}
                      className="justify-start"
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      <span className="text-xs">Maximize Revenue</span>
                    </Button>
                    <Button 
                      variant={preferences.optimizationGoal === 'market' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => selectOptimizationGoal('market')}
                      className="justify-start"
                    >
                      <Map className="mr-2 h-4 w-4" />
                      <span className="text-xs">Target Markets</span>
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-days">Minimum days between shows</Label>
                    <div className="flex items-center">
                      <Input 
                        id="min-days" 
                        type="number" 
                        min={0} 
                        max={14}
                        value={preferences.minDaysBetweenShows}
                        onChange={(e) => setPreferences({ 
                          ...preferences, 
                          minDaysBetweenShows: parseInt(e.target.value) || 0 
                        })}
                        className="w-20"
                      />
                      <div className="ml-4 text-sm text-muted-foreground w-full">
                        <div className="flex justify-between">
                          <span>Packed schedule</span>
                          <span>More rest between shows</span>
                        </div>
                        <input 
                          type="range" 
                          min={0} 
                          max={5} 
                          value={preferences.minDaysBetweenShows}
                          onChange={(e) => setPreferences({ 
                            ...preferences, 
                            minDaysBetweenShows: parseInt(e.target.value) 
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-days">Maximum days between shows</Label>
                    <div className="flex items-center">
                      <Input 
                        id="max-days" 
                        type="number" 
                        min={1} 
                        max={30}
                        value={preferences.maxDaysBetweenShows}
                        onChange={(e) => setPreferences({ 
                          ...preferences, 
                          maxDaysBetweenShows: parseInt(e.target.value) || 7 
                        })}
                        className="w-20"
                      />
                      <div className="ml-4 text-sm text-muted-foreground w-full">
                        <div className="flex justify-between">
                          <span>Tight schedule</span>
                          <span>Flexible tour length</span>
                        </div>
                        <input 
                          type="range" 
                          min={2} 
                          max={14} 
                          value={preferences.maxDaysBetweenShows}
                          onChange={(e) => setPreferences({ 
                            ...preferences, 
                            maxDaysBetweenShows: parseInt(e.target.value) 
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-travel">Maximum travel distance per day (km)</Label>
                    <div className="flex items-center">
                      <Input 
                        id="max-travel" 
                        type="number" 
                        min={100} 
                        max={1000}
                        value={preferences.maxTravelDistancePerDay}
                        onChange={(e) => setPreferences({ 
                          ...preferences, 
                          maxTravelDistancePerDay: parseInt(e.target.value) || 400 
                        })}
                        className="w-20"
                      />
                      <div className="ml-4 text-sm text-muted-foreground w-full">
                        <div className="flex justify-between">
                          <span>Short travel days</span>
                          <span>Long travel days acceptable</span>
                        </div>
                        <input 
                          type="range" 
                          min={100} 
                          max={800} 
                          step={50}
                          value={preferences.maxTravelDistancePerDay}
                          onChange={(e) => setPreferences({ 
                            ...preferences, 
                            maxTravelDistancePerDay: parseInt(e.target.value) 
                          })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Venue Size Priority</Label>
                    <Select 
                      value={preferences.prioritizeVenueSize}
                      onValueChange={(value: 'small' | 'medium' | 'large' | 'any') => setPreferences({
                        ...preferences,
                        prioritizeVenueSize: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue size priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small Venues (Intimate Shows)</SelectItem>
                        <SelectItem value="medium">Medium-Sized Venues</SelectItem>
                        <SelectItem value="large">Large Venues</SelectItem>
                        <SelectItem value="any">Any Size (No Preference)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="focus-fanbase"
                      checked={preferences.focusOnArtistFanbase}
                      onCheckedChange={(checked) => setPreferences({
                        ...preferences,
                        focusOnArtistFanbase: checked as boolean
                      })}
                    />
                    <Label htmlFor="focus-fanbase">
                      Prioritize venues in regions with strong artist fan base
                    </Label>
                  </div>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced-settings">
                    <AccordionTrigger>Advanced Settings</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Preferred regions (optional)</Label>
                          <Textarea 
                            placeholder="Enter regions separated by commas (e.g., Northeast, West Coast, Midwest)"
                            value={preferences.preferredRegions.join(', ')}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              preferredRegions: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                            })}
                            className="h-20"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Cities to avoid (optional)</Label>
                          <Textarea 
                            placeholder="Enter cities to avoid, separated by commas"
                            value={preferences.avoidCities.join(', ')}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              avoidCities: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                            })}
                            className="h-20"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Required days off (optional)</Label>
                          <Textarea 
                            placeholder="Enter specific dates the artist needs off (MM/DD/YYYY)"
                            value={preferences.requiredDaysOff.join(', ')}
                            onChange={(e) => setPreferences({
                              ...preferences,
                              requiredDaysOff: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
                            })}
                            className="h-20"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Format: MM/DD/YYYY, separated by commas (e.g., 10/31/2025, 12/25/2025)
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {renderWarnings()}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <Info className="h-4 w-4 inline-block mr-1" />
                  <span>Confirmed venues will remain fixed during optimization</span>
                </div>
                <Button onClick={handleRunOptimization} disabled={!hasEnoughVenuesWithDates}>
                  Run Optimization
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>What This Will Do</CardTitle>
                <CardDescription>
                  Understanding the optimization process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Optimize travel efficiency</h4>
                      <p className="text-sm text-muted-foreground">Create the most efficient route between venues</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Fill schedule gaps</h4>
                      <p className="text-sm text-muted-foreground">Get venue recommendations that fit your tour timeline</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Preserve confirmed dates</h4>
                      <p className="text-sm text-muted-foreground">Confirmed venues won't be rescheduled or moved</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Update venue sequence</h4>
                      <p className="text-sm text-muted-foreground">Arrange venues in the optimal order</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Requirements:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center">
                      <span className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${hasEnoughVenues ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {hasEnoughVenues ? <Check className="h-3 w-3" /> : '!'}
                      </span>
                      At least 2 venues in tour
                    </li>
                    
                    {/* Show preferences that might prevent optimization from running */}
                    {preferences.minDaysBetweenShows > 3 && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-amber-100 text-amber-700">!</span>
                        High minimum days between shows ({preferences.minDaysBetweenShows}) may limit options
                      </li>
                    )}
                    
                    {preferences.maxDaysBetweenShows < 3 && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-amber-100 text-amber-700">!</span>
                        Low maximum days between shows ({preferences.maxDaysBetweenShows}) may be too restrictive
                      </li>
                    )}
                    
                    {preferences.maxTravelDistancePerDay < 300 && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-amber-100 text-amber-700">!</span>
                        Low maximum travel distance ({preferences.maxTravelDistancePerDay} km) may limit venue options
                      </li>
                    )}
                    
                    {preferences.preferredRegions.length > 0 && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-blue-100 text-blue-700">i</span>
                        Optimization will prioritize {preferences.preferredRegions.length} selected regions
                      </li>
                    )}
                    
                    {preferences.avoidCities.length > 0 && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-blue-100 text-blue-700">i</span>
                        Avoiding {preferences.avoidCities.length} cities may limit options
                      </li>
                    )}
                    
                    {preferences.prioritizeVenueSize !== 'any' && (
                      <li className="flex items-center">
                        <span className="w-5 h-5 rounded-full mr-2 flex items-center justify-center bg-blue-100 text-blue-700">i</span>
                        Prioritizing {preferences.prioritizeVenueSize} venues only
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Optimizing Your Tour</CardTitle>
              <CardDescription>
                Calculating the optimal route and venue recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 py-4">
              <div className="flex justify-center">
                <div 
                  className="h-32 w-32 rounded-full flex items-center justify-center bg-primary/5 relative"
                  style={{
                    background: `conic-gradient(var(--primary) ${progress}%, transparent 0%)`,
                    borderRadius: '50%',
                  }}
                >
                  <div className="absolute inset-3 bg-background rounded-full flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-center font-medium">{processingStatus}</div>
                  <Progress value={progress} className="h-2 w-full" />
                </div>
                
                <div className="space-y-2 p-4 bg-muted/50 rounded-md">
                  <h3 className="font-medium text-sm">What's happening:</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${progress > 10 ? 'bg-primary' : 'bg-muted'}`}>
                        {progress > 10 ? <CheckCircle2 className="h-3 w-3 text-primary-foreground" /> : <span className="text-xs">1</span>}
                      </div>
                      <span className={progress > 10 ? 'text-foreground' : 'text-muted-foreground'}>Analyzing current venues and constraints</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${progress > 30 ? 'bg-primary' : 'bg-muted'}`}>
                        {progress > 30 ? <CheckCircle2 className="h-3 w-3 text-primary-foreground" /> : <span className="text-xs">2</span>}
                      </div>
                      <span className={progress > 30 ? 'text-foreground' : 'text-muted-foreground'}>Preserving confirmed tour dates and venues</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${progress > 50 ? 'bg-primary' : 'bg-muted'}`}>
                        {progress > 50 ? <CheckCircle2 className="h-3 w-3 text-primary-foreground" /> : <span className="text-xs">3</span>}
                      </div>
                      <span className={progress > 50 ? 'text-foreground' : 'text-muted-foreground'}>Identifying optimal venue opportunities</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${progress > 70 ? 'bg-primary' : 'bg-muted'}`}>
                        {progress > 70 ? <CheckCircle2 className="h-3 w-3 text-primary-foreground" /> : <span className="text-xs">4</span>}
                      </div>
                      <span className={progress > 70 ? 'text-foreground' : 'text-muted-foreground'}>Calculating venue scores and fit</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${progress > 90 ? 'bg-primary' : 'bg-muted'}`}>
                        {progress > 90 ? <CheckCircle2 className="h-3 w-3 text-primary-foreground" /> : <span className="text-xs">5</span>}
                      </div>
                      <span className={progress > 90 ? 'text-foreground' : 'text-muted-foreground'}>Finalizing optimization strategy</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {optimizeMutation.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Sparkles className="h-6 w-6 text-primary mr-2" />
                        <CardTitle>Optimization Results</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        {tourData?.initialOptimizationScore && (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            Before: {Math.round(tourData.initialOptimizationScore)}/100
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge className={
                          optimizeMutation.data.optimizationScore > 80 ? 'bg-green-500' : 
                          optimizeMutation.data.optimizationScore > 60 ? 'bg-amber-500' : 'bg-red-500'
                        }>
                          After: {Math.round(optimizeMutation.data.optimizationScore)}/100
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {optimizeMutation.data.optimizationScore > 80 
                        ? 'Your tour has excellent routing efficiency'
                        : optimizeMutation.data.optimizationScore > 60
                          ? 'Good route with some optimizations suggested'
                          : 'Several opportunities to improve this tour'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-muted/30 p-4 rounded-md">
                        <div className="text-sm text-muted-foreground">Distance</div>
                        <div className="text-2xl font-bold">
                          {Math.round(optimizeMutation.data.totalDistance)} km
                        </div>
                        {tourData?.initialTotalDistance && (
                          <div className="text-sm text-green-500 flex items-center">
                            <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                            Before: {Math.round(tourData.initialTotalDistance)} km
                            <span className="ml-2">
                              ({Math.round((1 - optimizeMutation.data.totalDistance / tourData.initialTotalDistance) * 100)}% reduction)
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="bg-muted/30 p-4 rounded-md">
                        <div className="text-sm text-muted-foreground">Travel Time</div>
                        <div className="text-2xl font-bold">
                          {Math.round(optimizeMutation.data.totalTravelTime / 60)} hrs
                        </div>
                        {tourData?.initialTravelTimeMinutes && (
                          <div className="text-sm text-green-500 flex items-center">
                            <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                            Before: {Math.round(tourData.initialTravelTimeMinutes / 60)} hrs
                          </div>
                        )}
                      </div>
                      <div className="bg-muted/30 p-4 rounded-md">
                        <div className="text-sm text-muted-foreground">Suggestions</div>
                        <div className="text-2xl font-bold">
                          {optimizeMutation.data.potentialFillVenues
                            ?.filter((item: any) => 
                              item.venue && 
                              !optimizeMutation.data.fixedPoints.some((p: any) => p.id === item.venue.id) &&
                              item.gapFilling
                            )?.length || 0}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium">Key Insights</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <strong>Confirmed Venues:</strong> We've preserved all confirmed venues and tour dates while optimizing the routing 
                              for other venues and suggesting potential new stops.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <strong>Geographic Clustering:</strong> Your tour has strong venue clusters in the West Coast, which allows for 
                              efficient routing and minimal travel time between most venues.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <strong>Gap Analysis:</strong> We've identified {optimizeMutation.data.gaps?.length || 0} scheduling gaps where additional venues 
                              could be added to maximize efficiency and revenue opportunities.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm">
                              <strong>Travel Optimization:</strong> The suggested routing reduces overall travel distance by up to 
                              {optimizeMutation.data.totalDistance && optimizeMutation.data.originalDistance 
                                ? Math.round((1 - optimizeMutation.data.totalDistance / optimizeMutation.data.originalDistance) * 100)
                                : 0}%, which can significantly lower transportation costs.
                            </p>
                          </div>
                        </div>
                        
                        {tourData?.initialOptimizationScore && (
                          <div className="flex items-start">
                            <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                            <div>
                              <p className="text-sm">
                                <strong>Overall Improvement:</strong> Your tour optimization score has increased from 
                                {Math.round(tourData.initialOptimizationScore)}/100 to {Math.round(optimizeMutation.data.optimizationScore)}/100, 
                                representing a {Math.round(optimizeMutation.data.optimizationScore - tourData.initialOptimizationScore)} point improvement 
                                in overall tour efficiency.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setActiveTab('preferences')}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Adjust Preferences
                    </Button>
                    <Button 
                      onClick={() => {
                        if (optimizeMutation.data) {
                          // Call the API to apply optimization changes
                          applyTourOptimization(tourId, optimizeMutation.data)
                            .then(() => {
                              // Show success message
                              toast({
                                title: 'Changes Applied',
                                description: 'Tour has been updated with the optimized route'
                              });
                              
                              // Redirect to tour details page to show the updated schedule
                              window.location.href = `/tours/${tourId}`;
                            })
                            .catch((error) => {
                              toast({
                                title: 'Error Applying Changes',
                                description: error?.message || 'Failed to apply tour optimization changes',
                                variant: 'destructive'
                              });
                            });
                        }
                      }}
                      disabled={!optimizeMutation.data}
                    >
                      Apply Changes & Return to Tour
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Venue suggestions list could go here */}
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Venue Suggestions</CardTitle>
                    <CardDescription>
                      Recommended venues that fit your tour
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {optimizeMutation.data.potentialFillVenues
                          ?.filter((item: any) => 
                            item.venue && 
                            !optimizeMutation.data.fixedPoints.some((p: any) => p.id === item.venue.id) &&
                            item.gapFilling
                          )
                          ?.map((item: any, index: number) => (
                            <div key={index} className="flex items-start p-3 bg-card border rounded-md hover:border-primary/50 transition-colors">
                              <div className="w-10 h-10 flex items-center justify-center rounded-full mr-3"
                                style={{
                                  backgroundColor: item.detourRatio && item.detourRatio < 1.2 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : item.detourRatio && item.detourRatio < 1.5 
                                      ? 'rgba(245, 158, 11, 0.1)' 
                                      : 'rgba(239, 68, 68, 0.1)',
                                  color: item.detourRatio && item.detourRatio < 1.2 
                                    ? 'rgb(16, 185, 129)' 
                                    : item.detourRatio && item.detourRatio < 1.5 
                                      ? 'rgb(245, 158, 11)' 
                                      : 'rgb(239, 68, 68)',
                                }}
                              >
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{item.venue.name}</div>
                                <div className="text-xs text-muted-foreground">{item.venue.city}</div>
                                <div className="flex items-center mt-1">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">
                                    {item.suggestedDate 
                                      ? new Date(item.suggestedDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })
                                      : 'No date suggested'
                                    }
                                  </span>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={
                                  item.detourRatio && item.detourRatio < 1.2 
                                    ? 'border-green-200 text-green-700 bg-green-50' 
                                    : item.detourRatio && item.detourRatio < 1.5 
                                      ? 'border-amber-200 text-amber-700 bg-amber-50' 
                                      : 'border-red-200 text-red-700 bg-red-50'
                                }
                              >
                                {item.detourRatio && item.detourRatio < 1.2 
                                  ? 'Excellent' 
                                  : item.detourRatio && item.detourRatio < 1.5 
                                    ? 'Good' 
                                    : 'Fair'
                                }
                              </Badge>
                            </div>
                          ))}
                        
                        {(!optimizeMutation.data.potentialFillVenues ||
                          optimizeMutation.data.potentialFillVenues.filter((item: any) => 
                            item.venue && 
                            !optimizeMutation.data.fixedPoints.some((p: any) => p.id === item.venue.id) &&
                            item.gapFilling
                          ).length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            No venue suggestions available
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}