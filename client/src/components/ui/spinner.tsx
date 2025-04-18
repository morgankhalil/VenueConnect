import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full", className)}
      {...props}
    />
  );
}