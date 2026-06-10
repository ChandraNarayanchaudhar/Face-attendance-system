"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, ...props }, ref) => {
    return (
      <label className={cn("inline-flex cursor-pointer items-center", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          {...props}
        />
        <span className="relative h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary">
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
    );
  },
);
Switch.displayName = "Switch";

