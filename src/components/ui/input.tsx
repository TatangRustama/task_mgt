import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "box-border flex h-9 w-full min-w-0 max-w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm text-on-surface ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-on-surface-variant/70 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
