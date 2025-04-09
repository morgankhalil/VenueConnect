import React from 'react';

const CalendarLegend: React.FC = () => {
  const legendItems = [
    { label: 'Confirmed', color: 'bg-green-500', bgColor: 'bg-green-100' },
    { label: 'Hold', color: 'bg-amber-500', bgColor: 'bg-amber-100' },
    { label: 'Opportunity', color: 'bg-blue-500', bgColor: 'bg-blue-100' },
    { label: 'Inquiry', color: 'bg-purple-500', bgColor: 'bg-purple-100' },
    { label: 'Network', color: 'bg-gray-500', bgColor: 'bg-gray-100' },
  ];

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-gray-50">
          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
          <span className="text-xs font-medium text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CalendarLegend;