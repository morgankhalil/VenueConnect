import React, { useState } from "react";
import { useLocation } from "wouter";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import FullMonthCalendar from "@/components/calendar/full-month-calendar";
import CalendarLegend from "@/components/calendar/calendar-legend";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter, 
  Clock, 
  Music, 
  MapPin 
} from "lucide-react";

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

  const [, setLocation] = useLocation();
  
  const handleEventClick = (event: CalendarEvent) => {
    // Navigate to event details page instead of showing modal
    setLocation(`/event/${event.id}`);
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
            <div className="flex justify-end mb-4">
              <TabsList className="rounded-full">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="month">
              <div className="space-y-6">
                <Card className="w-full">
                  <CardContent className="p-4">
                    <FullMonthCalendar 
                      events={filteredEvents}
                      selectedDate={date || new Date()}
                      onDateChange={setDate}
                      onEventClick={handleEventClick}
                    />
                    
                    {/* Calendar Legend */}
                    <CalendarLegend />
                  </CardContent>
                </Card>

                {/* Selected Day Events */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">
                      Events for {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {currentDayEvents.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No events for this day</p>
                    ) : (
                      <div className="space-y-4">
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
                                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                                  {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && ` (${event.confidence}%)`}
                                </Badge>
                              </div>
                              {event.description && (
                                <p className="mt-2 text-sm">{event.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">
                      Monthly Summary
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                        <div className="text-3xl font-bold text-green-700">
                          {currentMonthEvents.filter(e => e.type === 'confirmed').length}
                        </div>
                        <div className="text-sm text-green-800">Confirmed Shows</div>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg text-center border border-amber-200">
                        <div className="text-3xl font-bold text-amber-700">
                          {currentMonthEvents.filter(e => e.type === 'hold').length}
                        </div>
                        <div className="text-sm text-amber-800">Holds</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                        <div className="text-3xl font-bold text-blue-700">
                          {currentMonthEvents.filter(e => e.type === 'opportunity').length}
                        </div>
                        <div className="text-sm text-blue-800">Opportunities</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                        <div className="text-3xl font-bold text-purple-700">
                          {currentMonthEvents.filter(e => e.type === 'inquiry').length}
                        </div>
                        <div className="text-sm text-purple-800">Inquiries</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
                        <div className="text-3xl font-bold text-gray-700">
                          {currentMonthEvents.filter(e => e.type === 'network').length}
                        </div>
                        <div className="text-sm text-gray-800">Network Events</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="week">
              <div className="space-y-6">
                <Card className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="rounded-full px-4">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <h3 className="text-xl font-semibold text-center">
                        {date && getWeekBounds(new Date(date)).monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {date && getWeekBounds(new Date(date)).sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <Button variant="outline" size="sm" onClick={goToNextWeek} className="rounded-full px-4">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="mb-2 grid grid-cols-7 text-center rounded-t-lg overflow-hidden">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div 
                          key={day} 
                          className="font-medium text-xs sm:text-sm py-3 bg-gray-100 border-b border-gray-200"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden shadow-sm">
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
                              className={cn(
                                "relative h-28 sm:h-80 p-2 border border-gray-200 bg-white",
                                "transition-all duration-200 ease-in-out",
                                isToday && "bg-blue-50/20 font-medium",
                                isSelected && "ring-2 ring-primary ring-inset",
                                "hover:bg-gray-50 cursor-pointer"
                              )}
                              onClick={() => setDate(new Date(cellDate))}
                            >
                              <div className="text-right font-medium text-xs sm:text-sm mb-1 sticky top-0 bg-white/90">
                                {cellDate.getDate()}
                              </div>
                              <div className="space-y-1 overflow-y-auto max-h-20 sm:max-h-72">
                                {dayEvents.map(event => (
                                  <div 
                                    key={event.id} 
                                    className={cn(
                                      "text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all",
                                      "hover:shadow-sm",
                                      event.type === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-300' :
                                      event.type === 'hold' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                      event.type === 'opportunity' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                      event.type === 'inquiry' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                      'bg-gray-100 text-gray-800 border border-gray-300'
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        event.type === 'confirmed' ? 'bg-green-500' :
                                        event.type === 'hold' ? 'bg-amber-500' :
                                        event.type === 'opportunity' ? 'bg-blue-500' :
                                        event.type === 'inquiry' ? 'bg-purple-500' :
                                        'bg-gray-500'
                                      }`}></div>
                                      {event.startTime && <span className="font-mono">{event.startTime}</span>}
                                    </div>
                                    <div className="font-medium mt-1">{event.title}</div>
                                    {event.venue && event.venue !== 'Your Venue' && <div className="text-[10px] opacity-80 mt-1">{event.venue}</div>}
                                  </div>
                                ))}
                                {dayEvents.length > 6 && (
                                  <div className="text-xs text-center mt-1 font-medium text-primary">
                                    +{dayEvents.length - 6} more
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Calendar Legend */}
                    <CalendarLegend />
                  </CardContent>
                </Card>
                
                {/* Weekly Events List */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">All Events This Week</h3>
                  </CardHeader>
                  <CardContent>
                    {currentWeekEvents.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">No events this week</p>
                    ) : (
                      <div className="space-y-4">
                        {currentWeekEvents.map(event => (
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
                                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                      <CalendarIcon className="h-4 w-4 mr-1" />
                                      {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </div>
                                    {event.startTime && (
                                      <div className="flex items-center">
                                        <Clock className="h-4 w-4 mr-1" />
                                        {event.startTime}
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
                                  {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && ` (${event.confidence}%)`}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Weekly Stats Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">Weekly Summary</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 mr-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                            <div className="w-6 h-6 rounded-full bg-green-500"></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{currentWeekEvents.filter(e => e.type === 'confirmed' || e.type === 'hold').length}</div>
                          <div className="text-sm text-gray-600">Scheduled Shows</div>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 mr-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                            <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{currentWeekEvents.filter(e => e.type === 'opportunity' || e.type === 'inquiry').length}</div>
                          <div className="text-sm text-gray-600">Potential Shows</div>
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 mr-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100">
                            <div className="w-6 h-6 rounded-full bg-purple-500"></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{currentWeekEvents.filter(e => e.type === 'network').length}</div>
                          <div className="text-sm text-gray-600">Network Events</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="day">
              <div className="space-y-6">
                <Card className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-6">
                      <Button variant="outline" size="sm" onClick={goToPreviousDay} className="rounded-full px-4">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <h3 className="text-xl font-semibold">
                        {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <Button variant="outline" size="sm" onClick={goToNextDay} className="rounded-full px-4">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <div className="py-3 px-4 bg-gray-100 border-b border-gray-200 font-medium text-base">
                        Schedule for {date?.toLocaleDateString('en-US', { weekday: 'long' })}
                      </div>
                      
                      <div className="divide-y">
                        {currentDayEvents.length === 0 ? (
                          <div className="text-center py-20 text-muted-foreground">No events scheduled for this day</div>
                        ) : (
                          currentDayEvents.map(event => (
                            <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleEventClick(event)}>
                              <div className="flex items-start gap-3">
                                <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                                  event.type === 'confirmed' ? 'bg-green-500' :
                                  event.type === 'hold' ? 'bg-amber-500' :
                                  event.type === 'opportunity' ? 'bg-blue-500' :
                                  event.type === 'inquiry' ? 'bg-purple-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-grow">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h3 className="font-semibold text-lg">{event.title}</h3>
                                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                                    <Badge className={cn(
                                      "rounded-full px-3",
                                      event.type === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' :
                                      event.type === 'hold' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                      event.type === 'opportunity' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                      event.type === 'inquiry' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                      'bg-gray-100 text-gray-800 border-gray-300'
                                    )}>
                                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                      {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && ` (${event.confidence}%)`}
                                    </Badge>
                                  </div>
                                  {event.description && (
                                    <p className="mt-2 text-sm text-gray-600">{event.description}</p>
                                  )}
                                  {event.type === 'confirmed' && event.ticketUrl && (
                                    <div className="mt-3">
                                      <Button size="sm" variant="outline" className="rounded-full" asChild>
                                        <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                                          Ticket Information
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {/* Calendar Legend */}
                    <CalendarLegend />
                  </CardContent>
                </Card>
                
                {/* Timeline View */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">Daily Schedule</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="relative min-h-[300px] pl-16">
                      {/* Time markers */}
                      <div className="absolute left-0 top-0 h-full w-16 border-r pr-2">
                        {Array.from({ length: 7 }, (_, i) => {
                          const hour = 16 + i; // Starting from 4pm to 10pm
                          return (
                            <div key={hour} className="absolute text-xs text-gray-500 font-mono" style={{ top: `${i * 14.28}%` }}>
                              {hour}:00
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Events on timeline */}
                      {currentDayEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No scheduled events
                        </div>
                      ) : (
                        <div className="relative h-full py-2">
                          {currentDayEvents.filter(e => e.startTime).map(event => {
                            // Parse hours and calculate position
                            const timeMatch = event.startTime?.match(/(\d+):(\d+)/);
                            if (!timeMatch) return null;
                            
                            const hour = parseInt(timeMatch[1], 10);
                            const minute = parseInt(timeMatch[2], 10);
                            
                            // Only show events between 16:00 and 23:00
                            if (hour < 16 || hour > 23) return null;
                            
                            // Calculate position (percentage from top)
                            const position = ((hour - 16) + (minute / 60)) * (100 / 7);
                            
                            // Calculate height based on duration
                            let height = 10; // default height
                            if (event.endTime) {
                              const endMatch = event.endTime.match(/(\d+):(\d+)/);
                              if (endMatch) {
                                const endHour = parseInt(endMatch[1], 10);
                                const endMinute = parseInt(endMatch[2], 10);
                                const durationHours = (endHour - hour) + ((endMinute - minute) / 60);
                                height = durationHours * (100 / 7);
                              }
                            }
                            
                            return (
                              <div 
                                key={event.id}
                                className={`absolute left-0 right-0 px-2 rounded overflow-hidden ${
                                  event.type === 'confirmed' ? 'bg-green-100 border-l-4 border-green-500' :
                                  event.type === 'hold' ? 'bg-amber-100 border-l-4 border-amber-500' :
                                  event.type === 'opportunity' ? 'bg-blue-100 border-l-4 border-blue-500' :
                                  event.type === 'inquiry' ? 'bg-purple-100 border-l-4 border-purple-500' :
                                  'bg-gray-100 border-l-4 border-gray-500'
                                }`}
                                style={{ 
                                  top: `${position}%`,
                                  height: `${Math.max(height, 10)}%`,
                                  minHeight: '30px'
                                }}
                                onClick={() => handleEventClick(event)}
                              >
                                <div className="text-xs font-semibold truncate pt-1">
                                  {event.startTime} - {event.title}
                                </div>
                                {height >= 15 && event.venue && (
                                  <div className="text-xs opacity-75 truncate">{event.venue}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Other Events Today */}
                {currentDayEvents.filter(e => !e.startTime).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="text-lg font-medium">Other Events Today</h3>
                      <p className="text-sm text-muted-foreground">Events without a specific time</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentDayEvents.filter(e => !e.startTime).map(event => (
                          <div 
                            key={event.id}
                            className={`p-3 rounded-md border-l-4 cursor-pointer ${
                              event.type === 'confirmed' ? 'border-green-500 bg-green-50' :
                              event.type === 'hold' ? 'border-amber-500 bg-amber-50' :
                              event.type === 'opportunity' ? 'border-blue-500 bg-blue-50' :
                              event.type === 'inquiry' ? 'border-purple-500 bg-purple-50' :
                              'border-gray-500 bg-gray-50'
                            }`}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {event.description || `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} at ${event.venue || 'your venue'}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <Card className="w-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="rounded-full px-4">
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <h3 className="text-xl font-semibold">
                      Events for {date?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <Button variant="outline" size="sm" onClick={goToNextMonth} className="rounded-full px-4">
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <div className="py-3 px-4 bg-gray-100 border-b border-gray-200 font-medium">
                      {currentMonthEvents.length} events in {date?.toLocaleDateString('en-US', { month: 'long' })}
                    </div>
                    
                    <div className="divide-y">
                      {currentMonthEvents.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No events for this month</div>
                      ) : (
                        currentMonthEvents.map(event => (
                          <div 
                            key={event.id}
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                                event.type === 'confirmed' ? 'bg-green-500' :
                                event.type === 'hold' ? 'bg-amber-500' :
                                event.type === 'opportunity' ? 'bg-blue-500' :
                                event.type === 'inquiry' ? 'bg-purple-500' :
                                'bg-gray-500'
                              }`} />
                              <div>
                                <h4 className="font-semibold text-base">{event.title}</h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </div>
                                  {event.startTime && (
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1" />
                                      {event.startTime}
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
                            </div>
                            <Badge className={cn(
                              "rounded-full px-3",
                              event.type === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' :
                              event.type === 'hold' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              event.type === 'opportunity' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              event.type === 'inquiry' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            )}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              {event.confidence && (event.type === 'opportunity' || event.type === 'inquiry') && ` (${event.confidence}%)`}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Calendar Legend */}
                  <CalendarLegend />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
