"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function PhotoLightbox({
  urls,
  index,
  onClose,
  onIndexChange,
  alt = "Bukti",
}: {
  urls: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  alt?: string;
}) {
  const open = index != null && Boolean(urls[index]);
  const current = open && index != null ? urls[index] : null;
  const hasPrev = index != null && index > 0;
  const hasNext = index != null && index < urls.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        hideClose
        overlayClassName="z-[120] bg-black/90"
        className="z-[130] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 items-center justify-center rounded-none border-0 bg-transparent p-3 shadow-none"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (index == null) return;
          if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            onIndexChange?.(index - 1);
          }
          if (event.key === "ArrowRight" && index < urls.length - 1) {
            event.preventDefault();
            onIndexChange?.(index + 1);
          }
        }}
      >
        <DialogTitle className="sr-only">Foto bukti layar penuh</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-[1] rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        {hasPrev ? (
          <button
            type="button"
            className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:left-4"
            aria-label="Foto sebelumnya"
            onClick={() => onIndexChange?.(index! - 1)}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : null}
        {hasNext ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-4"
            aria-label="Foto berikutnya"
            onClick={() => onIndexChange?.(index! + 1)}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        ) : null}
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={alt} className="max-h-full max-w-full object-contain" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
