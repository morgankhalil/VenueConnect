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
      <CardContent className="px-2 sm:px-4">
        <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 snap-x">
          <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200 min-w-[100px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-center">
            <div className="text-2xl font-bold text-green-700">
              {events.filter(e => e.type === 'confirmed').length}
            </div>
            <div className="text-sm text-green-800">Confirms</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-200 min-w-[100px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-center">
            <div className="text-2xl font-bold text-amber-700">
              {events.filter(e => e.type === 'hold').length}
            </div>
            <div className="text-sm text-amber-800">Holds</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200 min-w-[100px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-center">
            <div className="text-2xl font-bold text-blue-700">
              {events.filter(e => e.type === 'opportunity').length}
            </div>
            <div className="text-sm text-blue-800">Opportunities</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-200 min-w-[100px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-center">
            <div className="text-2xl font-bold text-purple-700">
              {events.filter(e => e.type === 'inquiry').length}
            </div>
            <div className="text-sm text-purple-800">Inquiries</div>
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}