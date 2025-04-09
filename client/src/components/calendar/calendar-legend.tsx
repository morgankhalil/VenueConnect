import React from 'react';

const CalendarLegend: React.FC = () => {
  const legendItems = [
    { label: 'Confirmed', color: 'bg-green-500' },
    { label: 'Hold', color: 'bg-amber-500' },
    { label: 'Opportunity', color: 'bg-blue-500' },
    { label: 'Inquiry', color: 'bg-purple-500' },
    { label: 'Network', color: 'bg-gray-500' },
  ];

  return (
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${item.color}`}></div>
          <span className="text-xs">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CalendarLegend;