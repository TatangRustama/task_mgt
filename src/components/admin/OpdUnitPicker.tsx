"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant px-3 text-[11px] md:text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

type Choice = { id: string; name: string };

async function fetchUnits(parentId: string, perangkatDaerahId: string) {
  const params = new URLSearchParams();
  if (parentId) params.set("parentId", parentId);
  else params.set("perangkatDaerahId", perangkatDaerahId);
  const res = await fetch(`/api/admin/pegawai/unor?${params.toString()}`);
  const data = res.ok ? await res.json().catch(() => ({ items: [] })) : { items: [] };
  return (data.items ?? []) as Choice[];
}

export function OpdUnitPicker({
  perangkatDaerah,
  initialChain,
  onChange,
}: {
  perangkatDaerah: { id: string; name: string };
  initialChain: string[];
  onChange: (unitId: string) => void;
}) {
  const [levels, setLevels] = useState<Choice[][]>([]);
  const [selected, setSelected] = useState<string[]>(initialChain);
  const chainKey = initialChain.join("|");

  useEffect(() => {
    let cancelled = false;
    const chain = initialChain.length > 0 ? initialChain : [perangkatDaerah.id];

    async function load() {
      const roots = await fetchUnits("", perangkatDaerah.id);
      const nextLevels: Choice[][] = [
        [{ id: perangkatDaerah.id, name: `Seluruh ${perangkatDaerah.name}` }, ...roots.filter((item) => item.id !== perangkatDaerah.id)],
      ];
      for (const unitId of chain) {
        if (!unitId || unitId === perangkatDaerah.id) break;
        const children = await fetchUnits(unitId, perangkatDaerah.id);
        if (children.length === 0) break;
        nextLevels.push(children);
      }
      if (cancelled) return;
      setLevels(nextLevels);
      setSelected(chain);
      onChange(chain[chain.length - 1] || perangkatDaerah.id);
    }

    void load();
    return () => {
      cancelled = true;
    };
    // The chain is reset only when the edited user or starting unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perangkatDaerah.id, perangkatDaerah.name, chainKey]);

  async function choose(level: number, value: string) {
    const nextSelected = selected.slice(0, level);
    if (value) nextSelected[level] = value;
    const nextLevels = levels.slice(0, level + 1);
    if (value && value !== perangkatDaerah.id) {
      const children = await fetchUnits(value, perangkatDaerah.id);
      if (children.length > 0) nextLevels.push(children);
    }
    setSelected(nextSelected);
    setLevels(nextLevels);
    const chosen = [...nextSelected].reverse().find((item) => item) || "";
    onChange(chosen);
  }

  return (
    <div className="space-y-3">
      {levels.map((options, level) => (
        <div key={`${level}-${options[0]?.id ?? "empty"}`} className="space-y-2">
          <Label htmlFor={`opd-unit-${level}`} className="text-[11px] md:text-sm">
            {level === 0 ? "Unit yang dikelola" : "Unor di bawahnya"}
          </Label>
          <select
            id={`opd-unit-${level}`}
            className={selectClassName}
            value={selected[level] ?? ""}
            onChange={(event) => void choose(level, event.target.value)}
          >
            {level > 0 ? <option value="">Unit ini dan seluruh unor di bawahnya</option> : null}
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <p className="text-[11px] text-on-surface-variant md:text-xs">
        Admin OPD mengelola unit yang dipilih beserta seluruh unor di bawahnya.
      </p>
    </div>
  );
}
