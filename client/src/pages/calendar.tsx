import React, { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter } from "lucide-react";

export default function Calendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState("month");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  // Mock events - in a real app, these would be fetched from API
  const events = [
    {
      id: 1,
      title: "The Black Keys",
      date: new Date(2023, 1, 18),
      type: "opportunity",
      confidence: 92
    },
    {
      id: 2,
      title: "Glass Animals",
      date: new Date(2023, 1, 22),
      type: "confirmed",
      ticketUrl: "https://example.com/tickets"
    },
    {
      id: 3,
      title: "Tame Impala",
      date: new Date(2023, 2, 8),
      type: "opportunity",
      confidence: 76
    },
    {
      id: 4,
      title: "Japanese Breakfast",
      date: new Date(2023, 3, 15),
      type: "network",
      venue: "The Wiltern"
    }
  ];

  const filteredEvents = filter === "all" ? events : events.filter(event => event.type === filter);
  
  const currentMonthEvents = filteredEvents.filter(event => {
    if (!date) return false;
    return event.date.getMonth() === date.getMonth() && event.date.getFullYear() === date.getFullYear();
  });

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

  const handleEventClick = (event: any) => {
    toast({
      title: "Event Clicked",
      description: `Viewing details for "${event.title}"`
    });
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
                <SelectItem value="opportunity">Opportunities</SelectItem>
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
                <CardContent className="p-6">
                  <p className="text-center py-20 text-muted-foreground">Week view would be implemented here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="day">
              <Card>
                <CardContent className="p-6">
                  <p className="text-center py-20 text-muted-foreground">Day view would be implemented here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Events for {date?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                  
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
                            <p className="text-sm text-muted-foreground">
                              {event.date.toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            {event.type === 'confirmed' && (
                              <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                            )}
                            {event.type === 'opportunity' && (
                              <Badge className="bg-blue-100 text-blue-800">Opportunity</Badge>
                            )}
                            {event.type === 'network' && (
                              <Badge className="bg-purple-100 text-purple-800">Network</Badge>
                            )}
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
