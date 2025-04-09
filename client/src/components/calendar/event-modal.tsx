import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Calendar, 
  Music, 
  MapPin, 
  ExternalLink, 
  X, 
  Users, 
  DollarSign, 
  Check, 
  FileText, 
  Mail, 
  Phone, 
  BarChart, 
  AlertCircle,
  Workflow,
  Route,
  Share2,
  Building,
  PieChart
} from 'lucide-react';

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: 'confirmed' | 'opportunity' | 'network' | 'hold' | 'inquiry';
  confidence?: number;
  ticketUrl?: string;
  venue?: string;
  description?: string;
  artist?: string;
  genre?: string;
}

interface EventModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, open, onOpenChange }) => {
  if (!event) return null;

  const typeColors = {
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    hold: 'bg-amber-100 text-amber-800 border-amber-200',
    opportunity: 'bg-blue-100 text-blue-800 border-blue-200',
    inquiry: 'bg-purple-100 text-purple-800 border-purple-200',
    network: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const typeBgColors = {
    confirmed: 'bg-green-500',
    hold: 'bg-amber-500',
    opportunity: 'bg-blue-500',
    inquiry: 'bg-purple-500',
    network: 'bg-gray-500'
  };

  const typeLabels = {
    confirmed: 'Confirmed',
    hold: 'Hold',
    opportunity: 'Opportunity',
    inquiry: 'Inquiry',
    network: 'Network Event'
  };

  const typeDescriptions = {
    confirmed: 'This event is confirmed and finalized. Contracts have been signed and the event is officially scheduled.',
    hold: 'This date is currently on hold for this artist. A tentative booking has been made but contracts are not finalized.',
    opportunity: 'A potential show based on artist routing and touring patterns. No contact has been made yet.',
    inquiry: 'An active conversation about a potential booking. Initial contact has been made.',
    network: 'An event at a partner venue that may be relevant for your booking and routing strategy.'
  };

  // Calculate a projected revenue if it's an opportunity
  const getProjectedRevenue = () => {
    // This would normally be calculated based on venue capacity, ticket prices, etc.
    if (event.type === 'opportunity' || event.type === 'inquiry') {
      return '$3,500 - $4,800'; 
    }
    if (event.type === 'confirmed' || event.type === 'hold') {
      return '$4,200'; 
    }
    return 'N/A';
  };

  const getCapacity = () => {
    return '350 / 400'; // This would come from venue data
  };

  const getStatusDetails = () => {
    switch (event.type) {
      case 'confirmed':
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center">
                <Check className="h-6 w-6 text-green-600 mr-3" />
                <h4 className="font-semibold text-xl text-green-800">Event Confirmed</h4>
              </div>
              <p className="mt-2 text-base text-green-700">
                This event is confirmed and tickets are on sale. All contracts have been signed and finalized.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Ticket Sales</div>
                <div className="flex justify-between items-end">
                  <div className="text-3xl font-bold">275</div>
                  <div className="text-green-600 text-sm">+28 today</div>
                </div>
                <Progress className="h-2 mt-3" value={78} />
                <div className="mt-2 text-xs text-gray-500">78% sold (350 capacity)</div>
              </div>
              
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Revenue</div>
                <div className="text-3xl font-bold">{getProjectedRevenue()}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Based on current ticket sales
                </div>
                <div className="mt-3 text-sm text-green-600">On track to exceed projections</div>
              </div>
              
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Event Status</div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <div className="text-sm font-semibold">All Systems Go</div>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Contracts:</span>
                    <span className="text-green-600">Signed ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payments:</span>
                    <span className="text-green-600">Deposit Received ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marketing:</span>
                    <span className="text-green-600">Active ✓</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-2">
              <Button className="flex-1" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Contract
              </Button>
              
              <Button className="flex-1" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Guest List
              </Button>
              
              <Button className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ticket Dashboard
              </Button>
            </div>
          </div>
        );
        
      case 'hold':
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 text-amber-600 mr-3" />
                <h4 className="font-semibold text-xl text-amber-800">Date On Hold</h4>
              </div>
              <p className="mt-2 text-base text-amber-700">
                This date is currently on hold for this artist. The hold expires in 5 days if not confirmed.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Hold Status</div>
                <div className="text-3xl font-bold">First Hold</div>
                <div className="mt-2 text-sm text-amber-600 font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 inline" />
                  5 days remaining
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Expires: {new Date(event.date.getTime() - 7*24*60*60*1000).toLocaleDateString()}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Contract Status</div>
                <div className="flex items-center mt-1">
                  <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                  <div className="text-base font-medium">Draft Sent</div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Initial Terms:</span>
                    <span className="text-green-600">Agreed ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contract:</span>
                    <span className="text-amber-600">Pending Signature</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit:</span>
                    <span className="text-amber-600">Not Received</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Projected Revenue</div>
                <div className="text-3xl font-bold">{getProjectedRevenue()}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Based on similar events
                </div>
                <div className="mt-3 text-sm text-amber-600">Pre-sale options available</div>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-2">
              <Button className="flex-1" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
              
              <Button className="flex-1" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              
              <Button className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Confirm Hold
              </Button>
            </div>
          </div>
        );
        
      case 'opportunity':
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center">
                <Route className="h-6 w-6 text-blue-600 mr-3" />
                <h4 className="font-semibold text-xl text-blue-800">Opportunity Details</h4>
              </div>
              <p className="mt-2 text-base text-blue-700">
                This artist will be touring in your region around this date. There's a {event.confidence}% match with your venue's booking profile.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 p-5 border rounded-lg shadow-sm">
                <div className="text-base font-medium mb-4">Match Confidence Analysis</div>
                <Progress className="h-3" value={event.confidence} />
                <div className="flex justify-between mt-2 mb-4">
                  <span className="text-sm text-gray-500">Based on genre, popularity, and routing</span>
                  <span className="text-blue-600 font-semibold">{event.confidence}%</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-sm">Genre Match: 92%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm">Audience Match: 87%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-sm">Venue Size: 95%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-sm">Routing: High</span>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-gray-500 mb-1">Similar Artist Performance</div>
                  <div className="text-3xl font-bold text-green-600">85%</div>
                  <div className="mt-2 text-sm">
                    Average capacity for similar artists
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Based on 12 similar artists at your venue
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-gray-500 mb-1">Routing Fit</div>
                  <div className="text-3xl font-bold text-blue-600">High</div>
                  <div className="mt-2 text-sm">
                    Artist has shows in nearby cities
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Portland (2 days before), Seattle (2 days after)
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-gray-500 mb-1">Estimated Revenue</div>
                  <div className="text-3xl font-bold">{getProjectedRevenue()}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Based on projected attendance and ticket prices
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 border rounded-lg shadow-sm">
                <div className="text-base font-medium mb-4">Artist Momentum</div>
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Spotify Monthly</div>
                    <div className="text-xl font-semibold">1.2M</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Social Growth</div>
                    <div className="text-xl font-semibold text-green-600">+12%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Last Release</div>
                    <div className="text-xl font-semibold">2 weeks ago</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Tour Status</div>
                    <div className="text-xl font-semibold text-blue-600">Active</div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Growth Trend (6 months)</div>
                  <div className="h-10 bg-gray-100 rounded-md relative">
                    <div className="absolute inset-0 flex items-end">
                      <div className="h-40% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                      <div className="h-45% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                      <div className="h-55% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                      <div className="h-60% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                      <div className="h-75% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                      <div className="h-85% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border rounded-lg shadow-sm">
                <div className="text-base font-medium mb-4">Similar Artists Performance</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Artist A</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2 text-green-600">98% capacity</span>
                      <Progress className="h-2 w-24" value={98} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Artist B</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2 text-green-600">92% capacity</span>
                      <Progress className="h-2 w-24" value={92} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Artist C</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2 text-amber-600">78% capacity</span>
                      <Progress className="h-2 w-24" value={78} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Artist D</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2 text-amber-600">72% capacity</span>
                      <Progress className="h-2 w-24" value={72} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-2">
              <Button className="flex-1" variant="outline">
                <PieChart className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              
              <Button className="flex-1" variant="outline">
                <Route className="h-4 w-4 mr-2" />
                View Tour Dates
              </Button>
              
              <Button className="flex-1" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Check Venue Availability
              </Button>
              
              <Button className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Send Inquiry
              </Button>
            </div>
          </div>
        );
        
      case 'inquiry':
        return (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-800">Inquiry Status</h4>
              </div>
              <p className="mt-1 text-sm text-purple-700">
                Initial contact has been made. Waiting for response from the artist's agent.
              </p>
            </div>
            
            <div className="border rounded-md p-3">
              <div className="text-sm font-medium mb-2">Inquiry Timeline</div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="bg-purple-200 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 mr-3">
                    <Mail className="h-3 w-3 text-purple-700" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Inquiry Sent</div>
                    <div className="text-xs text-gray-500">3 days ago</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-gray-200 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 mr-3">
                    <Phone className="h-3 w-3 text-gray-700" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Waiting for Response</div>
                    <div className="text-xs text-gray-500">Follow-up scheduled for tomorrow</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium text-gray-500">Match Confidence</div>
                <div className="mt-1 text-xl font-bold">{event.confidence}%</div>
                <div className="mt-1 text-xs text-gray-500">
                  Based on venue fit and artist routing
                </div>
              </div>
              
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium text-gray-500">Projected Revenue</div>
                <div className="text-xl font-bold">{getProjectedRevenue()}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Estimated range
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button className="flex-1" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </Button>
              
              <Button className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Send Follow-up
              </Button>
            </div>
          </div>
        );
        
      case 'network':
        return (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
              <div className="flex items-center">
                <Share2 className="h-5 w-5 text-gray-600 mr-2" />
                <h4 className="font-semibold text-gray-800">Network Event</h4>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                This event is happening at a partner venue. It may present collaboration or routing opportunities.
              </p>
            </div>
            
            <div className="p-3 border rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <Building className="h-5 w-5 text-gray-500" />
                <div className="text-sm font-medium">{event.venue}</div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Capacity</div>
                  <div className="text-xs text-gray-500">400 people</div>
                </div>
              </div>
            </div>
            
            <div className="p-3 border rounded-md">
              <div className="text-sm font-medium mb-2">Collaboration Opportunities</div>
              <div className="text-sm">
                <p>This artist will be in your region. Consider these options:</p>
                <ul className="list-disc pl-5 mt-1 text-sm">
                  <li>After-party event</li>
                  <li>Joint ticketing promotions</li>
                  <li>Artist accommodation sharing</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button className="flex-1" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Contact Partner Venue
              </Button>
              
              <Button className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                View Routing Options
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%] max-h-[90vh] p-0">
        <div className={`h-3 w-full ${typeBgColors[event.type]}`} />
        
        <DialogHeader className="px-8 pt-8 pb-2">
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
            <Badge className={`${typeColors[event.type]} border text-sm px-3 py-1`}>
              {typeLabels[event.type]}
              {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && 
                ` (${event.confidence}%)`}
            </Badge>
          </div>
          <DialogDescription className="text-lg pt-2">
            {event.description || `${event.type === 'confirmed' ? 'Performance' : 'Potential performance'} at ${event.venue || 'venue'}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          <div className="text-sm text-muted-foreground mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {typeDescriptions[event.type]}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 mb-6">
            <div className="flex items-center col-span-2">
              <Calendar className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
              <span>{event.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}</span>
            </div>
            
            {event.startTime && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center col-span-2">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            
            {event.genre && (
              <div className="flex items-center">
                <Music className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                <span>{event.genre}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
              <span>Capacity: {getCapacity()}</span>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
              <span>Projected Revenue: {getProjectedRevenue()}</span>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {getStatusDetails()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;