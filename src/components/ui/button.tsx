import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4 py-2 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary-container text-on-primary-container hover:opacity-90 shadow-sm",
        secondary: "bg-secondary-container text-on-secondary-container hover:bg-surface-container-high",
        outline: "border border-outline-variant bg-surface-container-lowest text-secondary-navy hover:bg-surface-container-low",
        ghost: "text-secondary hover:bg-surface-container-high",
        destructive: "bg-error text-on-error hover:opacity-90",
        success: "bg-secondary-navy text-on-secondary hover:opacity-90",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-11 w-11",
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
