import React, { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter, Clock, Music, MapPin } from "lucide-react";

export default function Calendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState("month");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  // Event type definition
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
  
  // Create a more comprehensive set of demo events for the current month and a few months around it
  const generateDemoEvents = (): CalendarEvent[] => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Demo event data with a mix of event types spread across several months
    const demoEvents: CalendarEvent[] = [];
    
    // Artists and venues
    const artists = [
      "Fleet Foxes", "Japanese Breakfast", "Tame Impala", "The National", 
      "Glass Animals", "Phoebe Bridgers", "The War on Drugs", "Soccer Mommy",
      "Big Thief", "Lucy Dacus", "Khruangbin", "Kurt Vile"
    ];
    
    const genres = [
      "Rock", "Indie", "Folk", "Electronic", "Hip-Hop", "Jazz", "Pop"
    ];
    
    const otherVenues = [
      "The Fillmore", "9:30 Club", "First Avenue", "Bowery Ballroom", 
      "The Troubadour", "The Wiltern", "Brooklyn Steel", "The Independent"
    ];
    
    // Generate events for the current month plus/minus 2 months
    for (let monthOffset = -2; monthOffset <= 2; monthOffset++) {
      const month = new Date(currentYear, currentMonth + monthOffset, 1);
      const monthName = month.toLocaleString('default', { month: 'long' });
      const daysInMonth = new Date(currentYear, currentMonth + monthOffset + 1, 0).getDate();
      
      // Number of events to create per month
      const eventsPerMonth = 4 + Math.floor(Math.random() * 6); // 4-9 events
      
      for (let i = 0; i < eventsPerMonth; i++) {
        // Random day within the month
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        const date = new Date(currentYear, currentMonth + monthOffset, day);
        
        // Avoid dates in the past if current month
        if (monthOffset === 0 && day < today.getDate()) {
          continue;
        }
        
        // Generate random start time - hours between 18 and 22 (6 PM to 10 PM)
        const hours = 18 + Math.floor(Math.random() * 4);
        const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        const startTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
        
        // Event duration - 1 to 3 hours
        const durationHours = 1 + Math.floor(Math.random() * 3);
        const endHours = hours + durationHours;
        const endTime = `${endHours}:${minutes.toString().padStart(2, '0')}`;
        
        // Event properties
        const artist = artists[Math.floor(Math.random() * artists.length)];
        const genre = genres[Math.floor(Math.random() * genres.length)];
        const otherVenue = otherVenues[Math.floor(Math.random() * otherVenues.length)];
        
        // Decide event type based on date (more opportunities in the future, more confirmed in the near future)
        let type: 'confirmed' | 'opportunity' | 'network' | 'hold' | 'inquiry';
        
        if (monthOffset < 0) {
          // Past months: mostly confirmed or network events
          type = Math.random() > 0.3 ? 'confirmed' : 'network';
        } else if (monthOffset === 0) {
          // Current month: mix of confirmed, holds, and opportunities
          const typeRand = Math.random();
          if (typeRand < 0.4) type = 'confirmed';
          else if (typeRand < 0.7) type = 'hold';
          else type = 'opportunity';
        } else {
          // Future months: more opportunities and inquiries
          const typeRand = Math.random();
          if (typeRand < 0.2) type = 'confirmed';
          else if (typeRand < 0.4) type = 'hold';
          else if (typeRand < 0.7) type = 'opportunity';
          else type = 'inquiry';
        }
        
        // Network events are at other venues
        const venue = type === 'network' ? otherVenue : 'Your Venue';
        
        // Create the event
        const event: CalendarEvent = {
          id: demoEvents.length + 1,
          title: artist,
          date,
          startTime,
          endTime,
          type,
          genre,
          artist,
          venue
        };
        
        // Add confidence score for opportunities
        if (type === 'opportunity' || type === 'inquiry') {
          event.confidence = 70 + Math.floor(Math.random() * 25); // 70-94%
        }
        
        // Add ticket URL for confirmed events
        if (type === 'confirmed') {
          event.ticketUrl = "https://example.com/tickets";
        }
        
        // Add description
        event.description = `${artist} ${type === 'confirmed' ? 'performing' : 'potentially performing'} at ${venue}. Genre: ${genre}.`;
        
        demoEvents.push(event);
      }
    }
    
    return demoEvents;
  };
  
  const events = generateDemoEvents();

  // Filter events by the selected type
  const filteredEvents = filter === "all" 
    ? events 
    : events.filter(event => event.type === filter);
  
  // Filter events for the current month view
  const currentMonthEvents = filteredEvents.filter(event => {
    if (!date) return false;
    return event.date.getMonth() === date.getMonth() && 
           event.date.getFullYear() === date.getFullYear();
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Get the start and end of the current week for weekly view
  const getWeekBounds = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
  };
  
  // Filter events for the current week
  const currentWeekEvents = filteredEvents.filter(event => {
    if (!date) return false;
    const { monday, sunday } = getWeekBounds(new Date(date));
    return event.date >= monday && event.date <= sunday;
  }).sort((a, b) => {
    // Sort by date first
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // If same date, sort by start time
    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });
  
  // Filter events for the current day
  const currentDayEvents = filteredEvents.filter(event => {
    if (!date) return false;
    return event.date.getDate() === date.getDate() &&
           event.date.getMonth() === date.getMonth() &&
           event.date.getFullYear() === date.getFullYear();
  }).sort((a, b) => {
    // Sort by start time
    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });
  
  // Weekly navigation
  const goToPreviousWeek = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 7);
    setDate(newDate);
  };
  
  const goToNextWeek = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 7);
    setDate(newDate);
  };
  
  // Daily navigation
  const goToPreviousDay = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };
  
  const goToNextDay = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };

  const goToPreviousMonth = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() - 1);
    setDate(newDate);
  };

  const goToNextMonth = () => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    setDate(newDate);
  };

  const handleAddEvent = () => {
    toast({
      title: "Add Event",
      description: "Event creation would be implemented here"
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Determine the toast message based on event type
    let description = '';
    
    switch(event.type) {
      case 'confirmed':
        description = `Confirmed show: ${event.title} at ${event.venue} on ${event.date.toLocaleDateString()}`;
        break;
      case 'hold':
        description = `Hold: ${event.title} at ${event.venue} on ${event.date.toLocaleDateString()}`;
        break;
      case 'opportunity':
        description = `Opportunity: ${event.title} with ${event.confidence}% confidence`;
        break;
      case 'inquiry':
        description = `Inquiry: ${event.title} with ${event.confidence}% confidence`;
        break;
      case 'network':
        description = `Network event at ${event.venue}: ${event.title}`;
        break;
    }
    
    toast({
      title: "Event Details",
      description: description,
      // Make toast stay longer for better readability
      duration: 5000
    });
    
    // In a real app, this would navigate to the event details page
    console.log('Event clicked:', event);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-semibold text-gray-900">Calendar</h1>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleAddEvent}>
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Filter Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="hold">Holds</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
                <SelectItem value="inquiry">Inquiries</SelectItem>
                <SelectItem value="network">Network Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="month" value={view} onValueChange={setView}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-medium">
                  {date?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="month">
              <Card>
                <CardContent className="p-4">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                    modifiers={{
                      event: filteredEvents.map(event => event.date)
                    }}
                    modifiersStyles={{
                      event: {
                        fontWeight: 'bold',
                        backgroundColor: 'var(--primary-50)',
                        color: 'var(--primary-800)',
                        border: '1px solid var(--primary-200)'
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="week">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous Week
                    </Button>
                    <h3 className="text-lg font-medium text-center">
                      {date && getWeekBounds(new Date(date)).monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {date && getWeekBounds(new Date(date)).sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <Button variant="outline" size="sm" onClick={goToNextWeek}>
                      Next Week
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-7 gap-1 mb-2 text-center text-sm font-medium">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-2 border-b">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 min-h-[500px]">
                    {/* Generate date cells for the week */}
                    {date && (() => {
                      const { monday } = getWeekBounds(new Date(date));
                      return Array.from({ length: 7 }, (_, i) => {
                        const cellDate = new Date(monday);
                        cellDate.setDate(monday.getDate() + i);
                        
                        // Get events for this day
                        const dayEvents = filteredEvents.filter(event => 
                          event.date.getDate() === cellDate.getDate() &&
                          event.date.getMonth() === cellDate.getMonth() &&
                          event.date.getFullYear() === cellDate.getFullYear()
                        );
                        
                        const isToday = new Date().toDateString() === cellDate.toDateString();
                        const isSelected = date?.toDateString() === cellDate.toDateString();
                        
                        return (
                          <div 
                            key={i} 
                            className={`border p-1 h-full overflow-auto ${isToday ? 'bg-primary-50' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => setDate(new Date(cellDate))}
                          >
                            <div className="text-right text-sm mb-1 sticky top-0 bg-white/90">
                              {cellDate.getDate()}
                            </div>
                            <div className="space-y-1 text-xs">
                              {dayEvents.map(event => (
                                <div 
                                  key={event.id} 
                                  className={`p-1 rounded truncate cursor-pointer ${
                                    event.type === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    event.type === 'hold' ? 'bg-amber-100 text-amber-800' :
                                    event.type === 'opportunity' ? 'bg-blue-100 text-blue-800' :
                                    event.type === 'inquiry' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  {event.startTime && <span className="font-mono mr-1">{event.startTime}</span>}
                                  {event.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="day">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous Day
                    </Button>
                    <h3 className="text-lg font-medium">
                      {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <Button variant="outline" size="sm" onClick={goToNextDay}>
                      Next Day
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-6">
                  {currentDayEvents.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">No events scheduled for this day</div>
                  ) : (
                    <div className="space-y-6">
                      {currentDayEvents.map(event => (
                        <div key={event.id} className="flex border rounded-md overflow-hidden">
                          <div 
                            className={`w-2 flex-shrink-0 ${
                              event.type === 'confirmed' ? 'bg-green-500' :
                              event.type === 'hold' ? 'bg-amber-500' :
                              event.type === 'opportunity' ? 'bg-blue-500' :
                              event.type === 'inquiry' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}
                          />
                          <div className="flex-grow p-4 cursor-pointer hover:bg-gray-50" onClick={() => handleEventClick(event)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  {event.startTime && (
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1" />
                                      {event.startTime} - {event.endTime}
                                    </div>
                                  )}
                                  {event.genre && (
                                    <div className="flex items-center">
                                      <Music className="h-4 w-4 mr-1" />
                                      {event.genre}
                                    </div>
                                  )}
                                  {event.venue && (
                                    <div className="flex items-center">
                                      <MapPin className="h-4 w-4 mr-1" />
                                      {event.venue}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge className={`
                                ${event.type === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  event.type === 'hold' ? 'bg-amber-100 text-amber-800' :
                                  event.type === 'opportunity' ? 'bg-blue-100 text-blue-800' :
                                  event.type === 'inquiry' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'}
                              `}>
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                {event.confidence && event.type === 'opportunity' && ` (${event.confidence}%)`}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm">{event.description}</p>
                            )}
                            {event.type === 'confirmed' && event.ticketUrl && (
                              <div className="mt-4">
                                <Button size="sm" variant="outline" asChild>
                                  <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                                    Ticket Information
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Events for {date?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                </CardHeader>
                <CardContent className="p-6">
                  {currentMonthEvents.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No events for this month</p>
                  ) : (
                    <div className="space-y-4">
                      {currentMonthEvents.map(event => (
                        <div 
                          key={event.id}
                          className="p-4 border rounded-md flex justify-between items-center cursor-pointer hover:bg-gray-50"
                          onClick={() => handleEventClick(event)}
                        >
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{event.date.toLocaleDateString()}</span>
                              {event.startTime && <span>• {event.startTime}</span>}
                              {event.venue && <span>• {event.venue}</span>}
                            </div>
                          </div>
                          <div>
                            <Badge className={`
                              ${event.type === 'confirmed' ? 'bg-green-100 text-green-800' :
                                event.type === 'hold' ? 'bg-amber-100 text-amber-800' :
                                event.type === 'opportunity' ? 'bg-blue-100 text-blue-800' :
                                event.type === 'inquiry' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'}
                            `}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && ` (${event.confidence}%)`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
