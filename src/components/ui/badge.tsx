import { cn } from "@/lib/utils";

const variants = {
  default: "bg-surface-container text-on-surface",
  delegasi: "bg-secondary-container text-on-secondary-container",
  mandiri: "bg-secondary-container text-on-secondary-container",
  rendah: "bg-surface-container-high text-tertiary",
  sedang: "bg-secondary-container text-on-secondary-container",
  tinggi: "border-error bg-error-container text-error",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  tersedia: "bg-secondary-container text-on-secondary-container",
  dikerjakan: "border-sky-200 bg-sky-100 text-sky-700",
  menunggu_approval: "bg-secondary-container text-on-secondary-container",
  disetujui: "bg-emerald-50 text-emerald-700",
  ditolak: "border-error bg-error-container text-error",
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
        "inline-flex items-center rounded-md border border-outline px-2 py-0.5 text-[11px] font-medium",
        variants[variant as BadgeVariant] ?? variants.default,
        className
      )}
      {...props}
    />
  );
}
