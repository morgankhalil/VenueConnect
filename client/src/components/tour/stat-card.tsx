import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  className
}: StatCardProps) {
  // Determine color based on trend
  const trendColor = trend === 'up' 
    ? 'text-green-500' 
    : trend === 'down' 
      ? 'text-red-500' 
      : 'text-slate-500';
  
  // For optimization metrics, "down" is often good (reduced distance/time)
  // but for other metrics like revenue, "up" is good
  const showTrendIcon = trend !== 'neutral';
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              
              {/* Trend indicator */}
              {showTrendIcon && (
                <div className={cn("flex items-center ml-2", trendColor)}>
                  {trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {trendLabel && <span className="text-xs">{trendLabel}</span>}
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          {/* Optional icon */}
          {icon && (
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}