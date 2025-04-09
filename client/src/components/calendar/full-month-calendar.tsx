import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalendarEvent {
  id: number;
  date: Date;
  title: string;
  type: 'confirmed' | 'opportunity' | 'network' | 'hold' | 'inquiry';
  startTime?: string;
  endTime?: string;
  venue?: string;
  description?: string;
  confidence?: number;
  genre?: string;
  artist?: string;
  ticketUrl?: string;
}

interface FullMonthCalendarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  isToday: boolean;
  isSelected: boolean;
}

const FullMonthCalendar: React.FC<FullMonthCalendarProps> = ({
  events,
  selectedDate,
  onDateChange,
  onEventClick
}) => {
  const isMobile = useIsMobile();
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  
  // Generate days for month view
  useEffect(() => {
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    
    // Get day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayIndex = firstDayOfMonth.getDay();
    // Adjust to make Monday first day (0 = Monday, 6 = Sunday)
    const adjustedFirstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    
    const days: CalendarDay[] = [];
    
    // Add days from previous month
    const prevMonthDays = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0
    ).getDate();
    
    for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        prevMonthDays - i
      );
      
      days.push({
        date,
        isCurrentMonth: false,
        events: filterEventsForDate(events, date),
        isToday: isSameDate(date, new Date()),
        isSelected: isSameDate(date, selectedDate)
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      
      days.push({
        date,
        isCurrentMonth: true,
        events: filterEventsForDate(events, date),
        isToday: isSameDate(date, new Date()),
        isSelected: isSameDate(date, selectedDate)
      });
    }
    
    // Fill until we have 6 complete rows (42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        i
      );
      
      days.push({
        date,
        isCurrentMonth: false,
        events: filterEventsForDate(events, date),
        isToday: isSameDate(date, new Date()),
        isSelected: isSameDate(date, selectedDate)
      });
    }
    
    setCalendarDays(days);
  }, [currentMonth, events, selectedDate]);
  
  function filterEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
    return events.filter(event => isSameDate(event.date, date));
  }
  
  function isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
  
  function previousMonth() {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
    
    // Also update the selectedDate to the 1st of the previous month
    const newSelectedDate = new Date(selectedDate);
    newSelectedDate.setMonth(newSelectedDate.getMonth() - 1);
    // Keep the same day if possible, unless it exceeds days in month
    const daysInNewMonth = new Date(
      newSelectedDate.getFullYear(), 
      newSelectedDate.getMonth() + 1, 
      0
    ).getDate();
    if (newSelectedDate.getDate() > daysInNewMonth) {
      newSelectedDate.setDate(daysInNewMonth);
    }
    onDateChange(newSelectedDate);
  }
  
  function nextMonth() {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
    
    // Also update the selectedDate to the 1st of the next month
    const newSelectedDate = new Date(selectedDate);
    newSelectedDate.setMonth(newSelectedDate.getMonth() + 1);
    // Keep the same day if possible, unless it exceeds days in month
    const daysInNewMonth = new Date(
      newSelectedDate.getFullYear(), 
      newSelectedDate.getMonth() + 1, 
      0
    ).getDate();
    if (newSelectedDate.getDate() > daysInNewMonth) {
      newSelectedDate.setDate(daysInNewMonth);
    }
    onDateChange(newSelectedDate);
  }
  
  function handleDayClick(day: CalendarDay) {
    onDateChange(day.date);
  }
  
  function getEventStyles(type: string): string {
    switch (type) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'hold':
        return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'opportunity':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'inquiry':
        return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'network':
        return 'bg-gray-100 text-gray-800 border border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  }
  
  function getDotColor(type: string): string {
    switch (type) {
      case 'confirmed':
        return 'bg-green-500';
      case 'hold':
        return 'bg-amber-500';
      case 'opportunity':
        return 'bg-blue-500';
      case 'inquiry':
        return 'bg-purple-500';
      case 'network':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  }
  
  const getDayClass = (day: CalendarDay) => {
    return cn(
      "relative h-28 sm:h-36 p-1.5 sm:p-2.5 border border-gray-200 bg-white",
      "transition-all duration-200 ease-in-out",
      "first:rounded-tl-lg last:rounded-tr-lg",
      "[&:nth-child(n+36)]:rounded-b-lg", 
      !day.isCurrentMonth && "bg-gray-50/50 text-gray-400",
      day.isToday && "bg-blue-50/20 font-medium",
      day.isSelected && "ring-2 ring-primary ring-inset",
      "hover:bg-gray-50/80 cursor-pointer"
    );
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" onClick={previousMonth} className="rounded-full px-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <h2 className="text-xl font-semibold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="outline" size="sm" onClick={nextMonth} className="rounded-full px-4">
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
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={getDayClass(day)}
            onClick={() => handleDayClick(day)}
          >
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-white/95 pb-1 border-b">
              <span className={cn(
                "font-medium text-sm sm:text-base",
                !day.isCurrentMonth && "text-gray-400",
                day.isToday && "text-primary"
              )}>
                {day.date.getDate()}
              </span>
              {day.isToday && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
            
            <div className="space-y-1 sm:space-y-1.5 overflow-y-auto max-h-20 sm:max-h-28">
              {day.events.slice(0, isMobile ? 2 : 3).map(event => (
                <div
                  key={event.id}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all",
                    "hover:shadow-sm",
                    getEventStyles(event.type)
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(event.type)}`}></div>
                    <span className="truncate">{event.title}</span>
                  </div>
                </div>
              ))}
              {day.events.length > 3 && (
                <div className="text-xs text-center mt-1 font-medium text-primary">
                  +{day.events.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FullMonthCalendar;