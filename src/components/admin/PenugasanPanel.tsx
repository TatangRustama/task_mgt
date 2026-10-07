"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  label: string;
  surat: string | null;
};

type UnitHit = {
  id: string;
  name: string;
  pimpinanId: string | null;
};

export function PenugasanPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [jenis, setJenis] = useState<"plt" | "plh">("plt");
  const [surat, setSurat] = useState("");
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState<UnitHit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    const term = query.trim();
    if (term.length < 2) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/admin/penugasan?q=${encodeURIComponent(term)}`)
        .then(async (res) => {
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (!cancelled) setUnits(data.units ?? []);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

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
    setQuery("");
    setUnitId("");
    setUnits([]);
    await load();
  }

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

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant p-3">
      <div>
        <p className="text-sm font-semibold text-on-surface">Pelaksana tugas</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Jabatan definitif tetap. Plt atau Plh hanya untuk mendelegasikan tugas dan menilai bawahan di unit yang kosong.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Tidak ada penugasan berjalan.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface">{item.label}</p>
                {item.surat ? <p className="text-xs text-on-surface-variant">{item.surat}</p> : null}
              </div>
              <Button type="button" variant="outline" className="shrink-0" onClick={() => endAssignment(item.id)}>
                Akhiri
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="penugasan-jenis">Jenis</Label>
            <select
              id="penugasan-jenis"
              className="flex h-11 w-full rounded-lg border border-outline-variant px-3 text-sm"
              value={jenis}
              onChange={(event) => setJenis(event.target.value === "plh" ? "plh" : "plt")}
            >
              <option value="plt">Plt</option>
              <option value="plh">Plh</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="penugasan-surat">Surat tugas</Label>
            <Input id="penugasan-surat" value={surat} onChange={(event) => setSurat(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="penugasan-unit">Unit kosong</Label>
          <Input
            id="penugasan-unit"
            value={query}
            placeholder="Cari nama unit"
            onChange={(event) => {
              setQuery(event.target.value);
              setUnitId("");
            }}
          />
          {units.length > 0 ? (
            <ul className="max-h-36 overflow-y-auto rounded-lg border border-outline-variant">
              {units.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm ${unitId === unit.id ? "bg-secondary-container" : "hover:bg-surface-container"}`}
                    onClick={() => {
                      setUnitId(unit.id);
                      setQuery(unit.name);
                      setUnits([]);
                    }}
                  >
                    {unit.name}
                    {unit.pimpinanId ? " · ada pejabat" : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button type="submit" disabled={saving || !unitId}>
          {saving ? "Menyimpan..." : "Simpan penugasan"}
        </Button>
      </form>
    </div>
  );
}
