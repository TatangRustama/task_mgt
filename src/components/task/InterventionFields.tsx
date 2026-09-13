"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SATUAN_OPTIONS } from "@/lib/satuan";

const selectClassName =
  "box-border flex h-9 w-full min-w-0 max-w-full rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary";

export function InterventionFields({
  jumlah,
  satuan,
  onJumlahChange,
  onSatuanChange,
  required = false,
}: {
  jumlah: string;
  satuan: string;
  onJumlahChange: (value: string) => void;
  onSatuanChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-on-surface">
        Komponen diintervensi
        {required ? null : (
          <span className="font-normal text-on-surface-variant"> (opsional)</span>
        )}
      </p>
      <div className="grid min-w-0 grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="jumlahIntervensi">Jumlah</Label>
          <Input
            id="jumlahIntervensi"
            name="jumlahIntervensi"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={jumlah}
            onChange={(event) => onJumlahChange(event.target.value)}
            required={required}
            placeholder="10"
          />
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="satuan">Satuan</Label>
          <select
            id="satuan"
            name="satuan"
            className={selectClassName}
            value={satuan}
            onChange={(event) => onSatuanChange(event.target.value)}
            required={required}
          >
            <option value="">Pilih satuan</option>
            {SATUAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
