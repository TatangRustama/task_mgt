import { cn } from "@/lib/utils";

const variants = {
  default: "bg-surface-container text-on-surface",
  delegasi: "bg-secondary-container text-on-secondary-container",
  mandiri: "bg-primary-container text-on-primary-container",
  rendah: "bg-surface-container-high text-tertiary",
  sedang: "bg-primary-container text-on-primary-container",
  tinggi: "bg-error-container text-error",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-primary-container text-on-primary-container",
  tersedia: "bg-secondary-container text-on-secondary-container",
  dikerjakan: "bg-[#F6AB57] text-white",
  menunggu_approval: "bg-secondary-container text-on-secondary-container",
  disetujui: "bg-emerald-50 text-emerald-700",
  ditolak: "bg-error-container text-error",
  dibatalkan: "bg-surface-container-high text-tertiary",
  kolam: "bg-secondary-container text-on-secondary-container",
  ditunjuk: "bg-surface-container-high text-secondary",
};

export type BadgeVariant = keyof typeof variants;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variants[variant as BadgeVariant] ?? variants.default,
        className
      )}
      {...props}
    />
  );
}
