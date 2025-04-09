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
    <div className="flex flex-wrap gap-4 justify-center mt-6 pt-4 border-t">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${item.color} ring-2 ring-white ring-offset-1`}></div>
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CalendarLegend;