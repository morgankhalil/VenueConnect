import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Ticket, 
  Users, 
  BarChart2,
  TrendingDown
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: {
    value: number;
    increasing: boolean;
  };
  icon: "opportunities" | "bookings" | "network" | "custom";
  customIcon?: React.ReactNode;
}

export function StatsCard({ title, value, change, icon, customIcon }: StatsCardProps) {
  const renderIcon = () => {
    const iconMap = {
      opportunities: <BarChart2 className="text-primary-600" />,
      bookings: <Ticket className="text-green-600" />,
      network: <Users className="text-indigo-600" />,
      custom: customIcon || <BarChart2 className="text-primary-600" />
    };

    return (
      <div className={`flex-shrink-0 rounded-md p-3 ${getIconBackgroundColor()}`}>
        {iconMap[icon]}
      </div>
    );
  };

  const getIconBackgroundColor = () => {
    const colorMap = {
      opportunities: "bg-primary-100",
      bookings: "bg-green-100",
      network: "bg-indigo-100",
      custom: "bg-gray-100"
    };
    return colorMap[icon];
  };

  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          {renderIcon()}
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change.increasing ? "text-green-600" : "text-red-600"
                  }`}>
                    {change.increasing ? (
                      <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                    )}
                    <span className="sr-only">
                      {change.increasing ? "Increased by" : "Decreased by"}
                    </span>
                    {change.value}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
