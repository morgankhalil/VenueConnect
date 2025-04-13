import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, as = "div", children, ...props }, ref) => {
    const Component = as;
    return (
      <Component
        ref={ref}
        className={cn(
          "container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = "Container";