"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAR_MAX, starLabel, starLabels } from "@/lib/rating";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  size = "md",
}: {
  value: number | null;
  onChange?: (stars: number) => void;
  readOnly?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const interactive = Boolean(onChange) && !readOnly && !disabled;
  const iconClass = size === "sm" ? "h-4 w-4" : "h-7 w-7";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1" role={interactive ? "radiogroup" : "img"} aria-label="Penilaian 3 bintang">
        {Array.from({ length: STAR_MAX }, (_, index) => {
          const stars = index + 1;
          const filled = (value ?? 0) >= stars;
          const className = cn(
            "rounded-full p-0.5 transition",
            filled ? "text-yellow-400" : "text-outline-variant",
            interactive && "hover:scale-110 hover:text-yellow-400 active:scale-95",
            disabled && "opacity-60",
          );

          if (!interactive) {
            return (
              <span key={stars} className={className} aria-hidden="true">
                <Star className={iconClass} fill={filled ? "currentColor" : "none"} />
              </span>
            );
          }

          return (
            <button
              key={stars}
              type="button"
              role="radio"
              aria-checked={value === stars}
              aria-label={`${stars} bintang${starLabel(stars) ? `, ${starLabel(stars)}` : ""}`}
              disabled={disabled}
              onClick={() => onChange?.(stars)}
              className={className}
            >
              <Star className={iconClass} fill={filled ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
      {interactive ? (
        <ul className="mt-1 space-y-0.5 text-xs text-on-surface-variant">
          {starLabels.map((label, index) => {
            const stars = index + 1;
            return (
              <li
                key={label}
                className={cn(value === stars && "font-semibold text-on-surface")}
              >
                {stars} bintang: {label}
              </li>
            );
          })}
        </ul>
      ) : value && size !== "sm" ? (
        <p className="text-xs font-medium text-on-surface-variant">{starLabel(value)}</p>
      ) : null}
    </div>
  );
}
