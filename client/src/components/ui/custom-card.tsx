import React from "react";
import { cn } from "@/lib/utils";

interface CustomCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "outline";
  hoverEffect?: "none" | "lift" | "border" | "glow";
  as?: React.ElementType;
  children: React.ReactNode;
}

export function CustomCard({
  variant = "default",
  hoverEffect = "none",
  as: Component = "div",
  className,
  children,
  ...props
}: CustomCardProps) {
  return (
    <Component
      className={cn(
        "rounded-lg p-4",
        // Base variant styles
        {
          "bg-white dark:bg-gray-900 shadow-sm": variant === "default",
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50": variant === "glass",
          "bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/10 dark:border-primary/20": variant === "gradient",
          "border border-gray-200 dark:border-gray-800 bg-transparent": variant === "outline",
        },
        // Hover effect styles
        {
          "transition-transform duration-300 hover:-translate-y-1": hoverEffect === "lift",
          "transition-colors duration-300 hover:border-primary/50 dark:hover:border-primary/50": hoverEffect === "border",
          "transition-all duration-300 hover:shadow-md hover:shadow-primary/20 dark:hover:shadow-primary/10": hoverEffect === "glow",
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

interface CustomCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function CustomCardHeader({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: CustomCardHeaderProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between mb-4 gap-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          {title && (
            <h3 className="text-lg font-medium tracking-tight mb-0.5">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

interface CustomCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CustomCardContent({
  className,
  children,
  ...props
}: CustomCardContentProps) {
  return (
    <div 
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CustomCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CustomCardFooter({
  className,
  children,
  ...props
}: CustomCardFooterProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-800/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}