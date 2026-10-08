import { Loader2 } from "lucide-react";

export function AppLoader({ label = "Memuat" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b2156]/50 print:hidden"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-lowest px-8 py-6 shadow-[0_8px_24px_rgba(27,33,86,0.18)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-on-surface">{label}</p>
      </div>
    </div>
  );
}
