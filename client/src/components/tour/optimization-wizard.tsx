import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { optimizeTourRoute } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Clock, 
  ArrowRight,
  Sparkles,
  Lightbulb,
  Settings,
  FileText,
  Route,
  Building,
  Truck,
  Brain,
  Compass,
  Wand2
} from 'lucide-react';

// Types
interface OptimizationPreferences {
  optimizationGoal: 'distance' | 'time' | 'balance';
  preferredRegions: string[];
  minDaysBetweenShows: number;
  maxDaysBetweenShows: number;
  maxTravelDistancePerDay: number;
  requiredDaysOff: string[];
  avoidCities: string[];
  focusOnArtistFanbase: boolean;
  prioritizeVenueSize: 'small' | 'medium' | 'large' | 'any';
}

// Wizard Step Components
interface StepProps {
  onNext: () => void;
  onBack?: () => void;
  tourId: number;
  preferences: OptimizationPreferences;
  setPreferences: (prefs: OptimizationPreferences) => void;
  optimizationResult: any;
  isLoading: boolean;
}

interface WizardProps {
  tourId: number;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

// Step 1: Welcome & Goals
function WelcomeStep({ onNext, preferences, setPreferences }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Sparkles className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">AI-Powered Route Optimization</h2>
        <p className="text-muted-foreground">
          Let's optimize your tour route to save time, reduce costs, and find the best venue opportunities.
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">What's your main optimization goal?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${preferences.optimizationGoal === 'distance' ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setPreferences({ ...preferences, optimizationGoal: 'distance' })}
            >
              <CardHeader className="pb-2">
                <Truck className="h-8 w-8 text-primary/80" />
                <CardTitle className="text-base">Minimize Distance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Optimize for the shortest possible travel distance between venues
                </p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${preferences.optimizationGoal === 'time' ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setPreferences({ ...preferences, optimizationGoal: 'time' })}
            >
              <CardHeader className="pb-2">
                <Clock className="h-8 w-8 text-primary/80" />
                <CardTitle className="text-base">Optimize Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Balance travel time with strategic gaps for rest and promotion
                </p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${preferences.optimizationGoal === 'balance' ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setPreferences({ ...preferences, optimizationGoal: 'balance' })}
            >
              <CardHeader className="pb-2">
                <Brain className="h-8 w-8 text-primary/80" />
                <CardTitle className="text-base">Balanced Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Find the optimal mix of travel efficiency, venue quality and audience reach
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Key benefits of AI optimization:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Save travel costs</h4>
                <p className="text-sm text-muted-foreground">Reduce unnecessary detours and optimize the route</p>
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
                <h4 className="font-medium">Intelligent venue matching</h4>
                <p className="text-sm text-muted-foreground">Find venues that match your artist's audience and genre</p>
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
                <h4 className="font-medium">Balanced routing</h4>
                <p className="text-sm text-muted-foreground">Distribute travel time evenly to prevent burnout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-6 flex justify-end">
        <Button onClick={onNext} disabled={!preferences.optimizationGoal}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Preferences & Constraints
function PreferencesStep({ onNext, onBack, preferences, setPreferences }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tour Preferences</h2>
        <p className="text-muted-foreground">
          Tell us your requirements to generate a tailored optimization strategy
        </p>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
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
            
            <Separator />
            
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
            
            <div className="space-y-4">
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
            
            <Separator />
            
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
            
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm font-medium">
                  Advanced Settings
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
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
          </div>
        </div>
      </ScrollArea>
      
      <div className="pt-4 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext}>
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Processing / Running the optimization
function ProcessingStep({ optimizationResult, isLoading, tourId }: StepProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  
  // Simulate progressive updates for better UX
  useEffect(() => {
    if (isLoading && !optimizationResult) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          
          const step = Math.floor(Math.random() * 10) + 1;
          const newProgress = Math.min(prev + step, 95);
          
          // Update status message based on progress
          if (newProgress > 90) {
            setStatus('Finalizing optimization...');
          } else if (newProgress > 75) {
            setStatus('Calculating venue scores...');
          } else if (newProgress > 60) {
            setStatus('Preserving confirmed venues...');
          } else if (newProgress > 40) {
            setStatus('Analyzing route options...');
          } else if (newProgress > 20) {
            setStatus('Identifying venue opportunities...');
          } else if (newProgress > 10) {
            setStatus('Processing tour constraints...');
          }
          
          return newProgress;
        });
      }, 600);
      
      return () => clearInterval(interval);
    }
    
    if (optimizationResult) {
      setProgress(100);
      setStatus('Optimization complete!');
    }
  }, [isLoading, optimizationResult]);
  
  return (
    <div className="space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Optimizing Your Tour</h2>
        <p className="text-muted-foreground">
          Our AI is analyzing venues and calculating the optimal route
        </p>
      </div>
      
      <div className="space-y-6 py-8">
        <div className="flex justify-center">
          {isLoading ? (
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
          ) : (
            <div className="h-32 w-32 rounded-full flex items-center justify-center bg-primary/10">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-center font-medium">{status}</div>
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
      </div>
    </div>
  );
}

// Step 4: Results and recommendations
function ResultsStep({ onNext, tourId, optimizationResult }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Optimization Complete!</h2>
        <p className="text-muted-foreground">
          We've analyzed your tour and identified opportunities for improvement
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Optimization Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-3xl font-bold">
                  {optimizationResult?.optimizationScore || 0}/100
                </div>
                {optimizationResult?.optimizationScore > 80 ? (
                  <Badge className="ml-2 bg-green-500">Excellent</Badge>
                ) : optimizationResult?.optimizationScore > 60 ? (
                  <Badge className="ml-2 bg-amber-500">Good</Badge>
                ) : (
                  <Badge className="ml-2 bg-red-500">Needs Work</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {optimizationResult?.optimizationScore > 80 
                  ? 'Your tour has excellent routing efficiency'
                  : optimizationResult?.optimizationScore > 60
                    ? 'Good route with some optimizations suggested'
                    : 'Several opportunities to improve this tour'
                }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distance Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {optimizationResult?.totalDistance 
                  ? `${Math.round(optimizationResult.totalDistance)} km`
                  : 'N/A'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {optimizationResult?.totalDistance && optimizationResult.originalDistance && (
                  <span className="text-green-500 flex items-center">
                    <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                    {Math.round((1 - optimizationResult.totalDistance / optimizationResult.originalDistance) * 100)}% reduction
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Venue Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {optimizationResult?.potentialFillVenues?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                New venues that fit well with your tour schedule
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Key Insights</h3>
          
          <div className="space-y-3">
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
                  <strong>Gap Analysis:</strong> We've identified {optimizationResult?.gaps?.length || 0} scheduling gaps where additional venues 
                  could be added to maximize efficiency and revenue opportunities.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm">
                  <strong>Venue Suggestions:</strong> Based on your preferences, we've identified {optimizationResult?.potentialFillVenues?.length || 0} high-potential 
                  venues that fit well with your tour routing and artist profile.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm">
                  <strong>Confirmed Venues:</strong> We've preserved all your confirmed venues and tour dates while optimizing the routing 
                  for other venues and suggesting potential new stops.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Lightbulb className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm">
                  <strong>Travel Optimization:</strong> The suggested routing reduces overall travel distance by up to 
                  {optimizationResult?.totalDistance && optimizationResult.originalDistance 
                    ? Math.round((1 - optimizationResult.totalDistance / optimizationResult.originalDistance) * 100)
                    : 0}%, which can significantly lower transportation costs.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 flex justify-end">
          <Button onClick={onNext}>
            Apply Optimization <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Wizard Component
export function OptimizationWizard({ tourId, onComplete, onCancel }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
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
  
  const { toast } = useToast();
  
  const steps = [
    { name: 'Welcome', component: WelcomeStep },
    { name: 'Preferences', component: PreferencesStep },
    { name: 'Processing', component: ProcessingStep },
    { name: 'Results', component: ResultsStep }
  ];
  
  // Optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: () => optimizeTourRoute(tourId, preferences),
    onSuccess: (data) => {
      toast({
        title: 'Tour Optimized',
        description: `Tour route optimized with score: ${data.optimizationScore.toFixed(2)}`,
      });
      
      // If we're on the processing step, go to results
      if (currentStep === 2) {
        setTimeout(() => {
          setCurrentStep(3);
        }, 1000); // Short delay for better UX
      }
    },
    onError: () => {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize tour route. Please ensure you have at least 2 venues with dates.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle step navigation
  const handleNext = () => {
    // If moving to the processing step, start the optimization
    if (currentStep === 1) {
      optimizeMutation.mutate();
    }
    
    // If we're on the final step, complete the wizard
    if (currentStep === steps.length - 1) {
      onComplete(optimizeMutation.data);
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };
  
  // Get the current step component
  const StepComponent = steps[currentStep].component;
  
  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col items-center ${
                index <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
              style={{ width: `${100 / steps.length}%` }}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  index < currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentStep 
                    ? 'border-2 border-primary' 
                    : 'bg-muted'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-xs">{step.name}</span>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div 
                  className={`h-[2px] absolute top-4 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                  style={{ 
                    width: `calc(${100 / steps.length}% - 2rem)`,
                    left: `calc(${(index * 100) / steps.length}% + 1.5rem)`
                  }}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Current step */}
      <StepComponent
        onNext={handleNext}
        onBack={handleBack}
        tourId={tourId}
        preferences={preferences}
        setPreferences={setPreferences}
        optimizationResult={optimizeMutation.data}
        isLoading={optimizeMutation.isPending}
      />
    </div>
  );
}

// Dialog wrapper for the wizard
export function OptimizationWizardDialog({ 
  tourId, 
  onComplete,
  disabled = false
}: { 
  tourId: number,
  onComplete: (result: any) => void,
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        <Button size="lg" variant="outline" className="border-primary/50 bg-primary/5 hover:bg-primary/10 w-full md:w-auto" disabled={disabled}>
          <Wand2 className="mr-2 h-5 w-5" />
          AI Optimization Wizard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <OptimizationWizard 
          tourId={tourId} 
          onComplete={(result) => {
            onComplete(result);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}