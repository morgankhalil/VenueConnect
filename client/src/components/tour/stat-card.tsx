import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  improvement?: number;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  improvement, 
  className 
}: StatCardProps) {
  const showImprovement = improvement !== undefined;
  const isPositive = improvement && improvement > 0;
  const isNegative = improvement && improvement < 0;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline">
              <h3 className="text-2xl font-bold">{value}</h3>
              
              {showImprovement && (
                <div 
                  className={cn(
                    "flex items-center ml-2 text-sm font-medium",
                    isPositive && "text-green-600",
                    isNegative && "text-red-600",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {isPositive && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                  {isNegative && <ArrowDownIcon className="h-3 w-3 mr-1" />}
                  <span>{Math.abs(improvement)}%</span>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {icon && (
            <div className="bg-primary/10 p-2 rounded-full">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}