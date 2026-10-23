"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  label: string;
  surat: string | null;
};

type UnitOption = {
  id: string;
  name: string;
  pimpinanId: string | null;
};

export function PenugasanPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [jenis, setJenis] = useState<"plt" | "plh">("plt");
  const [surat, setSurat] = useState("");
  const [levels, setLevels] = useState<UnitOption[][]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const levelRequest = useRef(0);

  async function load() {
    const res = await fetch(`/api/admin/penugasan?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/penugasan?userId=${encodeURIComponent(userId)}`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setSelected([]);
    setLevels([]);
    levelRequest.current += 1;
    fetch("/api/admin/pegawai/unor")
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setLevels([data.items ?? []]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function fetchChildren(parentId: string) {
    const params = new URLSearchParams({ parentId });
    const res = await fetch(`/api/admin/pegawai/unor?${params.toString()}`);
    const data = res.ok ? await res.json() : { items: [] };
    return (data.items ?? []) as UnitOption[];
  }

  function onUnitLevel(level: number, value: string) {
    const request = ++levelRequest.current;
    setSelected((current) => {
      const next = current.slice(0, level);
      if (value) next[level] = value;
      return next;
    });
    setLevels((current) => current.slice(0, level + 1));
    if (!value) return;
    void fetchChildren(value).then((items) => {
      if (request !== levelRequest.current || items.length === 0) return;
      setLevels((current) => {
        const next = current.slice(0, level + 1);
        next[level + 1] = items;
        return next;
      });
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/penugasan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, unitId, jenis, surat }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan penugasan");
      return;
    }
    setSurat("");
    setSelected([]);
    levelRequest.current += 1;
    setLevels((current) => current.slice(0, 1));
    await load();
  }

  const unitId = [...selected].reverse().find((id) => id) || "";

  async function endAssignment(id: string) {
    setError("");
    const res = await fetch(`/api/admin/penugasan/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal mengakhiri penugasan");
      return;
    }
    await load();
  }

  const fieldClassName =
    "h-8 border-emerald-200 bg-white py-1 text-sm text-emerald-950 placeholder:text-emerald-700/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500";

  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div>
        <p className="text-sm font-semibold text-emerald-950">Pelaksana tugas</p>
        <p className="mt-1 text-xs text-emerald-800">
          Jabatan definitif tetap. Plt atau Plh hanya untuk mendelegasikan tugas dan menilai bawahan di unit yang kosong.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-emerald-800">Tidak ada penugasan berjalan.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-950">{item.label}</p>
                {item.surat ? <p className="text-xs text-emerald-800">{item.surat}</p> : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                onClick={() => endAssignment(item.id)}
              >
                <CircleX className="h-3.5 w-3.5" />
                Akhiri
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="penugasan-jenis" className="text-xs text-emerald-900">
              Jenis
            </Label>
            <select
              id="penugasan-jenis"
              className={`flex w-full rounded-lg border px-3 focus-visible:outline-none focus-visible:ring-1 ${fieldClassName}`}
              value={jenis}
              onChange={(event) => setJenis(event.target.value === "plh" ? "plh" : "plt")}
            >
              <option value="plt">Plt</option>
              <option value="plh">Plh</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="penugasan-surat" className="text-xs text-emerald-900">
              Surat tugas
            </Label>
            <Input id="penugasan-surat" className={fieldClassName} value={surat} onChange={(event) => setSurat(event.target.value)} />
          </div>
        </div>
        {levels.map((items, index) =>
          items.length > 0 && (index === 0 || selected[index - 1]) ? (
            <div key={`penugasan-unit-${index}`} className="space-y-1">
              <Label htmlFor={`penugasan-unit-${index}`} className="text-xs text-emerald-900">
                {index === 0 ? "Unit kosong" : `Unit tingkat ${index + 1}`}
              </Label>
              <select
                id={`penugasan-unit-${index}`}
                className={`flex w-full rounded-lg border px-3 focus-visible:outline-none focus-visible:ring-1 ${fieldClassName}`}
                value={selected[index] ?? ""}
                onChange={(event) => onUnitLevel(index, event.target.value)}
              >
                <option value="">Pilih unit</option>
                {items.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                    {unit.pimpinanId ? " · ada pejabat" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null,
        )}
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button
          type="submit"
          variant="success"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={saving || !unitId}
        >
          {saving ? "Menyimpan..." : "Simpan penugasan"}
        </Button>
      </form>
    </div>
  );
}
