import React, { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Clock, 
  Calendar, 
  Music, 
  MapPin, 
  ExternalLink, 
  Users, 
  DollarSign, 
  Check, 
  FileText, 
  Mail, 
  Phone, 
  BarChart, 
  AlertCircle,
  Route as RouteIcon,
  Share2,
  Building,
  PieChart,
  ArrowLeft,
  CircleCheck,
  CircleAlert,
  CircleDot,
  LayoutGrid
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

// Mock data for demonstration - Let's generate a lot more to ensure all possible IDs are covered
const generateMockEvents = (): Record<string, CalendarEvent> => {
  const events: Record<string, CalendarEvent> = {};
  const artists = [
    "Luna Eclipse", "Cosmic Drift", "Rhythm Collective", "Synthwave Pioneers", 
    "Ember & Oak", "Fleet Foxes", "Japanese Breakfast", "Tame Impala", 
    "The National", "Glass Animals", "Phoebe Bridgers", "The War on Drugs", 
    "Soccer Mommy", "Big Thief", "Lucy Dacus", "Khruangbin", "Kurt Vile"
  ];

  const venues = [
    "The Paramount Theatre", "City Arts Center", "The Fillmore", "9:30 Club", 
    "First Avenue", "Bowery Ballroom", "The Troubadour", "The Wiltern", 
    "Brooklyn Steel", "The Independent"
  ];

  const genres = [
    "Indie Rock", "Electronic", "Jazz Fusion", "Synthwave", "Folk", 
    "Rock", "Indie", "Pop", "Hip-Hop", "Jazz", "Alternative"
  ];

  const descriptions = [
    "Sold out show for album tour",
    "Tentative date on hold for upcoming tour",
    "Potential booking opportunity based on artist routing",
    "Initial inquiry sent for potential booking",
    "Partner venue event with touring artist",
    "Special acoustic performance",
    "Album release celebration",
    "Festival preview show",
    "Intimate venue performance",
    "Tour kickoff event"
  ];

  // Predefined events 1-5 for backwards compatibility
  events['1'] = {
    id: 1,
    title: 'Midnight Visions Tour',
    date: new Date(2025, 3, 15),
    startTime: '8:00 PM',
    endTime: '11:00 PM',
    type: 'confirmed',
    venue: 'The Paramount Theatre',
    description: 'Sold out show for the Midnight Visions album tour',
    artist: 'Luna Eclipse',
    genre: 'Indie Rock',
    ticketUrl: 'https://example.com/tickets'
  };

  events['2'] = {
    id: 2,
    title: 'Echoes of Tomorrow',
    date: new Date(2025, 3, 22),
    startTime: '7:30 PM',
    endTime: '10:30 PM',
    type: 'hold',
    venue: 'The Paramount Theatre',
    description: 'Tentative date on hold for the Echoes of Tomorrow tour',
    artist: 'Cosmic Drift',
    genre: 'Electronic'
  };

  events['3'] = {
    id: 3,
    title: 'Harmonic Fusion Tour',
    date: new Date(2025, 4, 5),
    startTime: '8:00 PM',
    endTime: '11:00 PM',
    type: 'opportunity',
    confidence: 87,
    venue: 'The Paramount Theatre',
    description: 'Potential booking opportunity based on artist routing',
    artist: 'Rhythm Collective',
    genre: 'Jazz Fusion'
  };

  events['4'] = {
    id: 4,
    title: 'Neon Dreams',
    date: new Date(2025, 4, 12),
    startTime: '9:00 PM',
    endTime: '11:30 PM',
    type: 'inquiry',
    confidence: 72,
    venue: 'The Paramount Theatre',
    description: 'Initial inquiry sent for potential booking',
    artist: 'Synthwave Pioneers',
    genre: 'Synthwave'
  };

  events['5'] = {
    id: 5,
    title: 'Acoustic Journeys',
    date: new Date(2025, 4, 20),
    startTime: '7:00 PM',
    endTime: '10:00 PM',
    type: 'network',
    venue: 'City Arts Center',
    description: 'Partner venue event with touring artist',
    artist: 'Ember & Oak',
    genre: 'Folk'
  };

  // Generate 45 more random events (total 50) to cover all possible IDs
  for (let i = 6; i <= 50; i++) {
    const today = new Date();
    const randomMonthOffset = -2 + Math.floor(Math.random() * 5); // -2 to +2 months
    const randomDay = 1 + Math.floor(Math.random() * 28);
    const date = new Date(today.getFullYear(), today.getMonth() + randomMonthOffset, randomDay);

    const hours = 18 + Math.floor(Math.random() * 4);
    const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const startTime = `${hours}:${minutes.toString().padStart(2, '0')} PM`;

    const durationHours = 1 + Math.floor(Math.random() * 3);
    const endHours = hours + durationHours > 12 ? hours + durationHours - 12 : hours + durationHours;
    const endTime = `${endHours}:${minutes.toString().padStart(2, '0')} PM`;

    const artist = artists[Math.floor(Math.random() * artists.length)];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    const genre = genres[Math.floor(Math.random() * genres.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)] + ` featuring ${artist}`;

    // Determine event type
    const typeRand = Math.random();
    let type: 'confirmed' | 'opportunity' | 'network' | 'hold' | 'inquiry';

    if (typeRand < 0.2) type = 'confirmed';
    else if (typeRand < 0.4) type = 'hold';
    else if (typeRand < 0.6) type = 'opportunity';
    else if (typeRand < 0.8) type = 'inquiry';
    else type = 'network';

    const event: CalendarEvent = {
      id: i,
      title: `${artist} - ${venue} Show`,
      date,
      startTime,
      endTime,
      type,
      venue,
      description,
      artist,
      genre
    };

    // Add confidence score for opportunities and inquiries
    if (type === 'opportunity' || type === 'inquiry') {
      event.confidence = 70 + Math.floor(Math.random() * 25); // 70-94%
    }

    // Add ticket URL for confirmed events
    if (type === 'confirmed') {
      event.ticketUrl = "https://example.com/tickets";
    }

    events[i.toString()] = event;
  }

  return events;
};

const mockEvents = generateMockEvents();

export default function EventDetails() {
  const [, params] = useRoute('/event/:id');
  const [, setLocation] = useLocation();
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    // In a real app, you would fetch this data from an API
    if (params && params.id) {
      const eventData = mockEvents[params.id];
      if (eventData) {
        setEvent(eventData);
      }
    }
  }, [params]);

  if (!event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Event not found</h2>
          <p className="mt-2">The event you're looking for doesn't exist or has been removed.</p>
          <Button 
            className="mt-4" 
            onClick={() => setLocation('/calendar')}
          >
            Back to Calendar
          </Button>
        </div>
      </div>
    );
  }

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

  const typeIcons = {
    confirmed: <CircleCheck className="w-6 h-6 text-green-600" />,
    hold: <CircleAlert className="w-6 h-6 text-amber-600" />,
    opportunity: <RouteIcon className="w-6 h-6 text-blue-600" />,
    inquiry: <Mail className="w-6 h-6 text-purple-600" />,
    network: <Share2 className="w-6 h-6 text-gray-600" />
  };

  // Calculate a projected revenue
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

  // Render different details sections based on event type
  const renderDetailsSection = () => {
    switch (event.type) {
      case 'confirmed':
        return renderConfirmedDetails();
      case 'hold':
        return renderHoldDetails();
      case 'opportunity':
        return renderOpportunityDetails();
      case 'inquiry':
        return renderInquiryDetails();
      case 'network':
        return renderNetworkDetails();
      default:
        return null;
    }
  };

  const renderConfirmedDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <div className="flex items-center">
              <Check className="h-6 w-6 text-green-600 mr-3" />
              <CardTitle>Event Confirmed</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              This event is confirmed and tickets are on sale. All contracts have been signed and finalized.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-1">Ticket Sales</div>
                <div className="mt-1 flex justify-between items-end">
                  <div className="text-3xl font-bold">275</div>
                  <div className="text-green-600 text-sm">+28 today</div>
                </div>
                <Progress className="h-2 mt-3" value={78} />
                <div className="mt-1 text-xs text-gray-500">78% sold (350 capacity)</div>
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
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-4">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View Contract
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Guest List
            </Button>
            <Button>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ticket Dashboard
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Statistics</CardTitle>
            <CardDescription>Ticket sales and promotional data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Online Sales</span>
                  <span className="font-medium">245 tickets</span>
                </div>
                <Progress value={70} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Box Office</span>
                  <span className="font-medium">30 tickets</span>
                </div>
                <Progress value={8} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Promotion Codes</span>
                  <span className="font-medium">42 used</span>
                </div>
                <Progress value={12} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>VIP Packages</span>
                  <span className="font-medium">18 sold</span>
                </div>
                <Progress value={90} className="h-2" />
                <div className="text-xs text-amber-600 mt-1">VIP almost sold out!</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Schedule</CardTitle>
            <CardDescription>Timeline for the day of show</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Clock className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">2:00 PM</div>
                  <div className="text-sm text-gray-500">Load-in / Sound Check</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Clock className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">7:00 PM</div>
                  <div className="text-sm text-gray-500">Doors Open</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Clock className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">8:00 PM</div>
                  <div className="text-sm text-gray-500">Opening Act</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-green-200 flex items-center justify-center mr-3 mt-0.5">
                  <Clock className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">9:00 PM</div>
                  <div className="text-sm text-gray-500">Main Performance</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Clock className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">11:00 PM</div>
                  <div className="text-sm text-gray-500">Event End</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Revenue and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm text-gray-500">Gross Revenue</div>
                  <div className="text-xl font-bold">$15,750</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Artist Guarantee</div>
                  <div className="text-xl font-bold">$8,000</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm text-gray-500">Production Costs</div>
                  <div className="text-lg">$2,400</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Marketing</div>
                  <div className="text-lg">$1,150</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm text-gray-500">Staff</div>
                  <div className="text-lg">$1,600</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Miscellaneous</div>
                  <div className="text-lg">$400</div>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-500">Net Profit</div>
                <div className="text-2xl font-bold text-green-600">$2,200</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderHoldDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="bg-amber-50 border-b border-amber-200">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-amber-600 mr-3" />
              <CardTitle>Date On Hold</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              This date is currently on hold for this artist. The hold expires in 5 days if not confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-4">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Edit Contract
            </Button>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button>
              <Check className="h-4 w-4 mr-2" />
              Confirm Hold
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communications History</CardTitle>
            <CardDescription>Messages and conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Mail className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">Initial Inquiry</div>
                  <div className="text-xs text-gray-500">10 days ago</div>
                  <div className="text-sm mt-1">Requested availability for tour routing</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                  <Mail className="h-3 w-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">Offer Sent</div>
                  <div className="text-xs text-gray-500">7 days ago</div>
                  <div className="text-sm mt-1">Sent offer with proposed terms</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-amber-200 flex items-center justify-center mr-3 mt-0.5">
                  <Phone className="h-3 w-3 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">Call with Agent</div>
                  <div className="text-xs text-gray-500">5 days ago</div>
                  <div className="text-sm mt-1">Discussed guarantee and production needs</div>
                </div>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-amber-200 flex items-center justify-center mr-3 mt-0.5">
                  <Mail className="h-3 w-3 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium">Contract Draft</div>
                  <div className="text-xs text-gray-500">3 days ago</div>
                  <div className="text-sm mt-1">Sent contract draft for review</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Similar Events</CardTitle>
            <CardDescription>Past performances by similar artists</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">Artist A</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>January 10, 2025</span>
                  <span className="text-green-600">92% capacity</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">$4,350 profit</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">Artist B</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>December 5, 2024</span>
                  <span className="text-green-600">88% capacity</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">$3,820 profit</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">Artist C</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>November 18, 2024</span>
                  <span className="text-amber-600">72% capacity</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">$2,450 profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hold Timeline</CardTitle>
            <CardDescription>Key dates and deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 pb-3">
              <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-200"></div>
              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute -left-[23px] w-5 h-5 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <div>
                    <div className="font-medium">Hold Placed</div>
                    <div className="text-xs text-gray-500">{new Date(event.date.getTime() - 10*24*60*60*1000).toLocaleDateString()}</div>
                    <div className="text-sm mt-1">First hold secured on calendar</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] w-5 h-5 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <div>
                    <div className="font-medium">Contract Sent</div>
                    <div className="text-xs text-gray-500">{new Date(event.date.getTime() - 3*24*60*60*1000).toLocaleDateString()}</div>
                    <div className="text-sm mt-1">Sent contract draft to agent</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  </div>
                  <div>
                    <div className="font-medium">Hold Expiration</div>
                    <div className="text-xs text-gray-500">{new Date(event.date.getTime() - 2*24*60*60*1000).toLocaleDateString()}</div>
                    <div className="text-sm mt-1 text-amber-600">Decision required by this date</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] w-5 h-5 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Ticket On-Sale</div>
                    <div className="text-xs text-gray-500">{new Date(event.date.getTime() - 45*24*60*60*1000).toLocaleDateString()}</div>
                    <div className="text-sm mt-1 text-gray-500">Planned ticket sales start (if confirmed)</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderOpportunityDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <div className="flex items-center">
              <RouteIcon className="h-6 w-6 text-blue-600 mr-3" />
              <CardTitle>Booking Opportunity</CardTitle>
            </div>
            <CardDescription className="text-blue-700">
              This artist will be touring in your region around this date. There's a {event.confidence}% match with your venue's booking profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="lg:col-span-2 p-5 border rounded-lg shadow-sm">
                <div className="text-base font-medium mb-4">Match Confidence Analysis</div>
                <Progress className="h-3" value={event.confidence || 0} />
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

              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-4">
            <Button variant="outline">
              <PieChart className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline">
              <RouteIcon className="h-4 w-4 mr-2" />
              View Tour Dates
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Check Availability
            </Button>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Send Inquiry
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Artist Momentum</CardTitle>
            <CardDescription>Popularity metrics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center mb-6">
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Spotify Monthly</div>
                <div className="text-2xl font-semibold">1.2M</div>
                <div className="text-sm text-green-600 mt-1">+15% in 3 months</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Social Growth</div>
                <div className="text-2xl font-semibold text-green-600">+12%</div>
                <div className="text-sm mt-1">Last 30 days</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Last Release</div>
                <div className="text-2xl font-semibold">2 weeks</div>
                <div className="text-sm mt-1">Gaining traction</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Tour Status</div>
                <div className="text-2xl font-semibold text-blue-600">Active</div>
                <div className="text-sm mt-1">15 upcoming shows</div>
              </div>
            </div>

            <div className="p-4 border rounded-lg mb-6">
              <div className="text-sm font-medium mb-3">Growth Trend (6 months)</div>
              <div className="h-24 bg-gray-50 rounded-md relative mb-2">
                <div className="absolute inset-0 flex items-end">
                  <div className="h-40% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                  <div className="h-45% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                  <div className="h-55% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                  <div className="h-60% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                  <div className="h-75% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                  <div className="h-85% w-1/6 bg-blue-400 rounded-sm mx-0.5"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>October</span>
                <span>November</span>
                <span>December</span>
                <span>January</span>
                <span>February</span>
                <span>March</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium mb-3">Similar Artists Performance</div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Artist A</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2 text-green-600">98% capacity</span>
                    <Progress className="h-2 w-32" value={98} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Artist B</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2 text-green-600">92% capacity</span>
                    <Progress className="h-2 w-32" value={92} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Artist C</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2 text-amber-600">78% capacity</span>
                    <Progress className="h-2 w-32" value={78} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Artist D</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2 text-amber-600">72% capacity</span>
                    <Progress className="h-2 w-32" value={72} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tour Routing</CardTitle>
            <CardDescription>Proximity to established tour dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border rounded-md bg-blue-50">
                <div className="text-sm font-medium text-blue-800">Portland</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{new Date(event.date.getTime() - 2*24*60*60*1000).toLocaleDateString()}</span>
                  <span className="text-blue-800">2 days before ✓</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Crystal Ballroom (1,500 capacity)</div>
              </div>
              <div className="p-3 border rounded-md bg-green-50">
                <div className="text-sm font-medium text-green-800">Your Venue</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{event.date.toLocaleDateString()}</span>
                  <span className="text-green-800">Open Date ✓</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">The Paramount (400 capacity)</div>
              </div>
              <div className="p-3 border rounded-md bg-blue-50">
                <div className="text-sm font-medium text-blue-800">Seattle</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{new Date(event.date.getTime() + 2*24*60*60*1000).toLocaleDateString()}</span>
                  <span className="text-blue-800">2 days after ✓</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">The Showbox (1,100 capacity)</div>
              </div>
              <div className="p-3 border rounded-md bg-gray-50">
                <div className="text-sm font-medium text-gray-800">Vancouver</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{new Date(event.date.getTime() + 4*24*60*60*1000).toLocaleDateString()}</span>
                  <span className="text-gray-800">4 days after</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Commodore Ballroom (990 capacity)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Market Analysis</CardTitle>
            <CardDescription>Local demand and demographic fit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-3">Local Audience Size</div>
                <div className="text-3xl font-bold text-blue-600">5,200+</div>
                <div className="text-sm text-gray-500 mt-2">Potential fans in your market area</div>
                <div className="flex items-center mt-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm">Strong local streaming data</span>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-3">Social Media Engagement</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Local Followers</span>
                    <span className="text-xs font-medium">2,800</span>
                  </div>
                  <Progress className="h-2" value={75} />
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Post Engagement</span>
                    <span className="text-xs font-medium">High</span>
                  </div>
                  <Progress className="h-2" value={85} />
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Content Shares</span>
                    <span className="text-xs font-medium">Above Average</span>
                  </div>
                  <Progress className="h-2" value={65} />
                </div>
              </div>
              <div className="p-4 border rounded-lg md:col-span-2">
                <div className="text-sm font-medium mb-3">Recent Artist News</div>
                <div className="space-y-2">
                  <div className="flex">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 mt-1"></div>
                    <div>
                      <div className="text-sm font-medium">New Single Released</div>
                      <div className="text-xs text-gray-500">2 weeks ago - 450k streams in first week</div>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 mt-1"></div>
                    <div>
                      <div className="text-sm font-medium">Featured on Major Playlist</div>
                      <div className="text-xs text-gray-500">1 month ago - 1.2M new listeners</div>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 mt-1"></div>
                    <div>
                      <div className="text-sm font-medium">Tour Announcement</div>
                      <div className="text-xs text-gray-500">3 weeks ago - 15 cities confirmed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInquiryDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="bg-purple-50 border-b border-purple-200">
            <div className="flex items-center">
              <Mail className="h-6 w-6 text-purple-600 mr-3" />
              <CardTitle>Inquiry Status</CardTitle>
            </div>
            <CardDescription className="text-purple-700">
              Initial contact has been made. Waiting for response from the artist's agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-2 p-4 border rounded-lg shadow-sm">
                <div className="text-base font-medium mb-4">Inquiry Timeline</div>
                <div className="relative pl-8 pb-3">
                  <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="absolute -left-5 w-10 h-10 rounded-full bg-purple-100 border-2 border-purple-400 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Inquiry Sent</div>
                        <div className="text-xs text-gray-500">3 days ago</div>
                        <div className="text-sm mt-1">Initial inquiry email sent to artist's booking agent</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-5 w-10 h-10 rounded-full bg-purple-100 border-2 border-purple-400 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">Automated Response</div>
                        <div className="text-xs text-gray-500">3 days ago</div>
                        <div className="text-sm mt-1">Received automated acknowledgment from booking agency</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-5 w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-500">Waiting for Response</div>
                        <div className="text-xs text-gray-500">Follow-up scheduled for tomorrow</div>
                        <div className="text-sm mt-1 text-gray-500">Phone call scheduled with booking agency</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-3">Match Confidence</div>
                <div className="text-3xl font-bold text-purple-600">{event.confidence}%</div>
                <Progress className="h-2.5 mt-2" value={event.confidence || 0} />
                <div className="mt-3 text-xs text-gray-500">
                  Based on venue fit and artist routing
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Genre Match:</span>
                    <span className="text-green-600">High</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Venue Size:</span>
                    <span className="text-green-600">Ideal</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Routing:</span>
                    <span className="text-amber-600">Moderate</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg shadow-sm">
                <div className="text-sm font-medium text-gray-500 mb-3">Projected Revenue</div>
                <div className="text-3xl font-bold">{getProjectedRevenue()}</div>
                <div className="mt-3 text-xs text-gray-500">
                  Estimated range based on projected attendance
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Ticket Price:</span>
                    <span>$25 - $35</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Capacity:</span>
                    <span>400</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Expected Fill:</span>
                    <span className="text-green-600">75-85%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-4">
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Log Call
            </Button>
            <Button variant="outline">
              <PieChart className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Send Follow-up
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inquiry Details</CardTitle>
            <CardDescription>Content of initial inquiry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="text-sm mb-4">
                <p className="mb-2">Dear [Agent Name],</p>
                <p className="mb-2">I'm writing on behalf of The Paramount Theatre to express our interest in booking [Artist Name] for their upcoming tour.</p>
                <p className="mb-2">We're a 400-capacity venue in [City] and have had great success with similar artists in the [Genre] genre. We noticed they'll be in Portland on [Date] and Seattle on [Date] and thought our venue would be a perfect stop on this part of the tour.</p>
                <p className="mb-2">We're available on [Date] and would be interested in discussing terms for a potential show.</p>
                <p className="mb-2">Looking forward to your response.</p>
                <p>Best regards,<br/>Venue Booking Manager</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Sent to:</div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">booking@artistagency.com</span>
              </div>
              <div className="flex items-center mt-1">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">manager@artistname.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
            <CardDescription>All communications related to this inquiry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">Initial Inquiry</div>
                  <div className="text-xs text-gray-500">3 days ago, 10:45 AM</div>
                </div>
                <div className="text-sm">
                  Sent initial email to booking agent and manager inquiring about availability for [date].
                </div>
                <div className="flex justify-end mt-2">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">Sent by You</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">Automated Response</div>
                  <div className="text-xs text-gray-500">3 days ago, 10:47 AM</div>
                </div>
                <div className="text-sm">
                  "Thank you for your inquiry. We have received your message and will respond within 2-3 business days."
                </div>
                <div className="flex justify-end mt-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">Automated</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg border-dashed border-gray-300 bg-gray-50">
                <div className="flex justify-between mb-2">
                  <div className="font-medium text-gray-500">Follow-up Call (Scheduled)</div>
                  <div className="text-xs text-gray-500">Tomorrow, 2:00 PM</div>
                </div>
                <div className="text-sm text-gray-500">
                  Phone call scheduled with booking agency to follow up on inquiry.
                </div>
                <div className="flex justify-end mt-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">Pending</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Offer Draft</CardTitle>
            <CardDescription>Preliminary offer terms to prepare</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">Financial Terms</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Guarantee:</span>
                    <span className="text-sm font-medium">$3,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">vs. Percentage:</span>
                    <span className="text-sm font-medium">80% after expenses</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Ticket Price:</span>
                    <span className="text-sm font-medium">$25 - $35</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Deposit:</span>
                    <span className="text-sm font-medium">$1,500 (50%)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">Production Details</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Sound:</span>
                    <span className="text-sm font-medium">House system + engineer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Lighting:</span>
                    <span className="text-sm font-medium">House system + engineer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Backline:</span>
                    <span className="text-sm font-medium">As per rider (TBD)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Load-in:</span>
                    <span className="text-sm font-medium">3:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">Other Terms</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Hospitality:</span>
                    <span className="text-sm font-medium">Standard + dressing rooms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Merchandise:</span>
                    <span className="text-sm font-medium">85% to artist</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Comp Tickets:</span>
                    <span className="text-sm font-medium">10 tickets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Curfew:</span>
                    <span className="text-sm font-medium">11:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNetworkDetails = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              <Share2 className="h-6 w-6 text-gray-600 mr-3" />
              <CardTitle>Network Event</CardTitle>
            </div>
            <CardDescription>
              This event is happening at a partner venue. It may present collaboration or routing opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Building className="h-6 w-6 text-gray-500" />
                  <div className="text-base font-medium">{event.venue}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity:</span>
                    <span>400 people</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Distance:</span>
                    <span>35 miles</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Relationship:</span>
                    <span className="text-green-600">Partner Venue</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg shadow-sm md:col-span-2">
                <div className="text-base font-medium mb-3">Collaboration Opportunities</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium mb-1">After-party Event</div>
                    <div className="text-xs text-gray-600">
                      Host an exclusive after-party at your venue following the main performance.
                    </div>
                    <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">High Potential</Badge>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium mb-1">Joint Ticketing</div>
                    <div className="text-xs text-gray-600">
                      Offer bundled tickets or discounts for fans attending both venues.
                    </div>
                    <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">High Potential</Badge>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium mb-1">Accommodation Sharing</div>
                    <div className="text-xs text-gray-600">
                      Split costs for artist accommodations across multiple nights.
                    </div>
                    <Badge className="mt-2 bg-amber-100 text-amber-800 border-amber-200">Medium Potential</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end space-x-4">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Contact Partner Venue
            </Button>
            <Button variant="outline">
              <Building className="h-4 w-4 mr-2" />
              View Venue Details
            </Button>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              View Routing Options
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Artist Schedule</CardTitle>
            <CardDescription>Current tour dates and routing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">{new Date(event.date.getTime() - 5*24*60*60*1000).toLocaleDateString()}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>The Fillmore</span>
                  <span>San Francisco, CA</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">80 miles from {event.venue}</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">{new Date(event.date.getTime() - 3*24*60*60*1000).toLocaleDateString()}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>Roseland Theater</span>
                  <span>Portland, OR</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">65 miles from {event.venue}</div>
              </div>
              <div className="p-3 border rounded-md bg-gray-50">
                <div className="text-sm font-medium">{event.date.toLocaleDateString()}</div>
                <div className="flex justify-between text-xs mt-1 font-medium">
                  <span>{event.venue}</span>
                  <span>Current Event</span>
                </div>
                <div className="text-xs text-blue-600 mt-0.5">Network Event</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">{new Date(event.date.getTime() + 2*24*60*60*1000).toLocaleDateString()}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>The Showbox</span>
                  <span>Seattle, WA</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">100 miles from {event.venue}</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm font-medium">{new Date(event.date.getTime() + 4*24*60*60*1000).toLocaleDateString()}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span>Commodore Ballroom</span>
                  <span>Vancouver, BC</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">140 miles from {event.venue}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Opportunities</CardTitle>
            <CardDescription>Potential financial benefits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">After-party Revenue</div>
                <div className="text-2xl font-bold text-green-600">$1,200 - $1,800</div>
                <div className="text-xs text-gray-500 mt-1">
                  Estimated additional revenue from hosting an after-party event
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between text-xs">
                    <span>Cover Charge:</span>
                    <span>$10 per person</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Estimated Attendance:</span>
                    <span>120-180 people</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Bar Revenue:</span>
                    <span>+$2,000 approx.</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">Joint Ticketing</div>
                <div className="text-2xl font-bold text-green-600">$800 - $1,200</div>
                <div className="text-xs text-gray-500 mt-1">
                  Estimated additional revenue from cross-promotion and bundled tickets
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between text-xs">
                    <span>Bundle Discount:</span>
                    <span>15% off both shows</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Estimated Bundles:</span>
                    <span>40-60 packages</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>New Customers:</span>
                    <span>25-30 estimated</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Network Collaboration History</CardTitle>
            <CardDescription>Past and ongoing partnerships with this venue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium mb-3">Collaboration Stats</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Joint Events</span>
                      <span className="font-medium">8 total</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Artist Sharing</span>
                      <span className="font-medium">12 artists</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Revenue Impact</span>
                      <span className="font-medium">+$15,000</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg md:col-span-2">
                <div className="text-sm font-medium mb-3">Recent Collaborations</div>
                <div className="space-y-3">
                  <div className="flex">
                    <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Summer Music Festival</div>
                      <div className="text-xs text-gray-500">2 months ago - Joint promotion</div>
                      <div className="text-xs text-green-600 mt-0.5">+$3,200 additional revenue</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex">
                    <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Indie Band Tour</div>
                      <div className="text-xs text-gray-500">3 months ago - Consecutive nights</div>
                      <div className="text-xs text-green-600 mt-0.5">+$2,800 additional revenue</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex">
                    <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Local Artist Showcase</div>
                      <div className="text-xs text-gray-500">5 months ago - Shared production costs</div>
                      <div className="text-xs text-green-600 mt-0.5">+$1,500 additional revenue</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLocation('/calendar')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <Badge className={`${typeColors[event.type]} border text-sm px-3 py-1`}>
                {typeLabels[event.type]}
                {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && 
                  ` (${event.confidence}%)`}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground mt-1">
              {event.description || `${event.type === 'confirmed' ? 'Performance' : 'Potential performance'} at ${event.venue || 'venue'}`}
            </p>
          </div>

          <div className="flex gap-4">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
            <Button variant="outline">
              <LayoutGrid className="h-4 w-4 mr-2" />
              View in Grid
            </Button>
            {event.ticketUrl && (
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Tickets
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-y-4 gap-x-12">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full flex items-center justify-center mr-3 bg-white border">
              {typeIcons[event.type]}
            </div>
            <div>
              <div className="text-sm text-gray-500">Event Type</div>
              <div className="font-medium">{typeLabels[event.type]}</div>
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="h-6 w-6 mr-3 text-gray-500" />
            <div>
              <div className="text-sm text-gray-500">Date</div>
              <div className="font-medium">{event.date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}</div>
            </div>
          </div>

          {event.startTime && (
            <div className="flex items-center">
              <Clock className="h-6 w-6 mr-3 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Time</div>
                <div className="font-medium">{event.startTime} - {event.endTime}</div>
              </div>
            </div>
          )}

          <div className="flex items-center">
            <MapPin className="h-6 w-6 mr-3 text-gray-500" />
            <div>
              <div className="text-sm text-gray-500">Venue</div>
              <div className="font-medium">{event.venue}</div>
            </div>
          </div>

          {event.genre && (
            <div className="flex items-center">
              <Music className="h-6 w-6 mr-3 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Genre</div>
                <div className="font-medium">{event.genre}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg border">
        <p className="text-sm text-gray-600 mb-2 bg-gray-50 p-4 rounded">
          {typeDescriptions[event.type]}
        </p>
      </div>

      <div className="mt-8">
        {renderDetailsSection()}
      </div>
    </div>
  );
}