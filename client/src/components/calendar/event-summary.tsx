import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Define the interface for CalendarEvent
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

interface EventSummaryProps {
  events: CalendarEvent[];
  title?: string;
}

export default function EventSummary({ events, title = "Monthly Summary" }: EventSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-lg font-medium">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
            <div className="text-3xl font-bold text-green-700">
              {events.filter(e => e.type === 'confirmed').length}
            </div>
            <div className="text-sm text-green-800">Confirmed Shows</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg text-center border border-amber-200">
            <div className="text-3xl font-bold text-amber-700">
              {events.filter(e => e.type === 'hold').length}
            </div>
            <div className="text-sm text-amber-800">Holds</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-700">
              {events.filter(e => e.type === 'opportunity').length}
            </div>
            <div className="text-sm text-blue-800">Opportunities</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
            <div className="text-3xl font-bold text-purple-700">
              {events.filter(e => e.type === 'inquiry').length}
            </div>
            <div className="text-sm text-purple-800">Inquiries</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
            <div className="text-3xl font-bold text-gray-700">
              {events.filter(e => e.type === 'network').length}
            </div>
            <div className="text-sm text-gray-800">Network Events</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}