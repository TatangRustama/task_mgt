"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type UnorOption = {
  id: string;
  name: string;
  perangkatDaerahNama: string | null;
};

export function unorOptionLabel(unit: Pick<UnorOption, "name" | "perangkatDaerahNama">) {
  const pd = unit.perangkatDaerahNama?.trim() || "-";
  return `${unit.name} — ${pd}`;
}

export function UnorSearchSelect({
  id = "tambah-unor",
  value,
  options,
  loading,
  onChange,
}: {
  id?: string;
  value: string;
  options: UnorOption[];
  loading?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? options.filter((item) => {
          const label = unorOptionLabel(item).toLowerCase();
          return label.includes(q);
        })
      : options;
    return source.slice(0, 80);
  }, [options, query]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Unit organisasi</Label>
      <div className="relative">
        <Input
          id={id}
          value={open ? query : selected ? unorOptionLabel(selected) : ""}
          placeholder={loading ? "Memuat UNOR..." : "Cari UNOR atau perangkat daerah"}
          autoComplete="off"
          disabled={loading}
          className="pr-9"
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value.trim()) onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const first = filtered[0];
              if (first) {
                onChange(first.id);
                setQuery(unorOptionLabel(first));
                setOpen(false);
              }
            }
            if (event.key === "Escape") setOpen(false);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
      </div>
      {open && !loading ? (
        <ul
          role="listbox"
          className="max-h-44 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Tidak ada UNOR yang cocok</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id} role="option" aria-selected={item.id === value}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low",
                    item.id === value && "bg-secondary-container text-on-secondary-container",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(item.id);
                    setQuery(unorOptionLabel(item));
                    setOpen(false);
                  }}
                >
                  {unorOptionLabel(item)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
