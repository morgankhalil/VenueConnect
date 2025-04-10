import { Badge } from "@/components/ui/badge";
import { getStatusInfo } from "@/lib/tour-status";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VenueStatusBadgeProps {
  status: string;
  showTooltip?: boolean;
  className?: string;
}

/**
 * A reusable badge component that displays a venue's status with the appropriate colors
 * and optional tooltip containing a description of the status.
 */
export function VenueStatusBadge({ 
  status, 
  showTooltip = true, 
  className 
}: VenueStatusBadgeProps) {
  const statusInfo = getStatusInfo(status);
  
  const badge = (
    <Badge 
      variant="outline"
      className={cn(
        "transition-all",
        statusInfo.cssClass,
        className
      )}
    >
      {statusInfo.displayName}
    </Badge>
  );
  
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusInfo.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badge;
}