import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 min-h-9 px-3 py-1.5 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-white border border-accent hover:bg-accent",
        secondary: "bg-secondary-container text-on-secondary-container border border-[#c5d0f5] hover:bg-secondary-container/80",
        outline: "border border-outline bg-surface-container-lowest text-secondary-navy hover:bg-surface-container-low",
        ghost: "text-secondary hover:bg-surface-container-high",
        destructive: "bg-error text-on-error border border-[#be123c] hover:opacity-90",
        success: "bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700",
      },
      size: {
        default: "h-9 px-3 py-1.5",
        xs: "h-6 min-h-6 rounded-md px-1.5 py-0 text-xs font-medium gap-1",
        sm: "h-8 min-h-8 rounded-md px-2.5",
        lg: "h-10 rounded-lg px-4 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
