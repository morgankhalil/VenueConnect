import React from "react";
import { cn } from "@/lib/utils";

type StatusType = "online" | "offline" | "away" | "busy" | "new" | "pending" | "completed" | "canceled" | "info" | "warning" | "success" | "error";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  size?: "xs" | "sm" | "md" | "lg";
  withLabel?: boolean;
  withDot?: boolean;
  pulseEffect?: boolean;
  children?: React.ReactNode;
}

export function StatusBadge({
  status,
  size = "md",
  withLabel = true,
  withDot = true,
  pulseEffect = false,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  // Status config (colors and labels)
  const statusConfig = {
    online: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
      label: "Online"
    },
    offline: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
      label: "Offline"
    },
    away: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      label: "Away"
    },
    busy: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
      label: "Busy"
    },
    new: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
      label: "New"
    },
    pending: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      label: "Pending"
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
      label: "Completed"
    },
    canceled: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
      label: "Canceled"
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
      label: "Info"
    },
    warning: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      label: "Warning"
    },
    success: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
      label: "Success"
    },
    error: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
      label: "Error"
    }
  };

  // Size config
  const sizeConfig = {
    xs: {
      badge: "px-1.5 py-0.5 text-xs rounded",
      dot: "w-1.5 h-1.5",
      space: "gap-1"
    },
    sm: {
      badge: "px-2 py-0.5 text-xs rounded",
      dot: "w-2 h-2",
      space: "gap-1.5"
    },
    md: {
      badge: "px-2.5 py-1 text-xs rounded-md",
      dot: "w-2.5 h-2.5",
      space: "gap-1.5"
    },
    lg: {
      badge: "px-3 py-1 text-sm rounded-md",
      dot: "w-3 h-3",
      space: "gap-2"
    }
  };

  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        config.bg,
        config.text,
        sizeStyles.badge,
        sizeStyles.space,
        className
      )}
      {...props}
    >
      {withDot && (
        <span 
          className={cn(
            "rounded-full",
            config.dot,
            sizeStyles.dot,
            pulseEffect && "animate-pulse"
          )}
        />
      )}
      {withLabel && (children || config.label)}
    </span>
  );
}