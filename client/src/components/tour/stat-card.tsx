import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  comparison?: string | number;
  improvement?: number;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  comparison, 
  improvement, 
  className 
}: StatCardProps) {
  // Determine status color based on improvement
  let statusColor = '';
  let statusIcon = null as React.ReactNode;
  
  if (improvement !== undefined) {
    if (improvement > 0) {
      statusColor = 'text-green-600';
      statusIcon = <ArrowUp className="h-3 w-3 mr-1" />;
    } else if (improvement < 0) {
      statusColor = 'text-red-600';
      statusIcon = <ArrowDown className="h-3 w-3 mr-1" />;
    } else {
      statusColor = 'text-amber-600';
      statusIcon = <ArrowRight className="h-3 w-3 mr-1" />;
    }
  }
  
  return (
    <div className={cn("bg-muted/50 p-4 rounded-lg", className)}>
      <h4 className="font-medium text-sm mb-2 text-muted-foreground">{title}</h4>
      <p className="font-medium text-xl">
        {value}
      </p>
      {(comparison || improvement !== undefined) && (
        <p className="text-sm text-muted-foreground mt-1">
          {improvement !== undefined ? (
            <span className={cn("flex items-center", statusColor)}>
              {statusIcon}
              {improvement === 0 ? 'No change' : `${Math.abs(improvement)}% ${improvement > 0 ? 'better' : 'worse'}`}
            </span>
          ) : comparison ? (
            <span>{comparison}</span>
          ) : null}
        </p>
      )}
    </div>
  );
}