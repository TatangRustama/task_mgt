"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type UnitRow = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  eselonId: string | null;
  statusUnor: string | null;
  perangkatDaerahId: string | null;
  perangkatDaerahNama: string | null;
  parent: { id: string; name: string } | null;
};

type UnitNode = UnitRow & { children: UnitNode[] };

const typeLabel: Record<string, string> = {
  kantor: "Kantor",
  bidang: "Bidang",
  sub_bidang: "Sub Bidang",
};

function buildForest(units: UnitRow[]): UnitNode[] {
  const nodes = new Map<string, UnitNode>(
    units.map((unit) => [unit.id, { ...unit, children: [] }]),
  );
  const roots: UnitNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function UnitTree({ nodes, depth = 0 }: { nodes: UnitNode[]; depth?: number }) {
  if (nodes.length === 0) return null;
  return (
    <div className={depth === 0 ? "space-y-2" : "mt-2 space-y-2 border-l border-outline-variant pl-3"}>
      {nodes.map((unit) => (
        <div key={unit.id}>
          <div className="rounded-xl border border-surface-container-highest bg-surface-container-low p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-on-surface">{unit.name}</p>
              <Badge variant="mandiri">{typeLabel[unit.type] || unit.type}</Badge>
            </div>
            {unit.parent?.name ? (
              <p className="text-sm text-on-surface-variant">Induk: {unit.parent.name}</p>
            ) : null}
            <p className="text-xs text-tertiary">
              {unit.statusUnor || "Status tidak diketahui"}
              {unit.eselonId ? ` · Eselon ${unit.eselonId}` : ""}
            </p>
          </div>
          <UnitTree nodes={unit.children} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function StrukturOrganisasi() {
  const [input, setInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = input.trim();
    if (!q) {
      window.alert("Masukkan nama unit atau perangkat daerah");
      return;
    }

    setLoading(true);
    setSearched(true);
    setAppliedQuery(q);
    const res = await fetch(`/api/units?q=${encodeURIComponent(q)}`);
    const data = res.ok ? await res.json() : [];
    setUnits(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const groups = useMemo(() => {
    const map = new Map<string, UnitRow[]>();
    for (const unit of units) {
      const key = unit.perangkatDaerahNama || "Tanpa perangkat daerah";
      const list = map.get(key) ?? [];
      list.push(unit);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([group, items]) => [group, buildForest(items)] as const);
  }, [units]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {searched ? `Hasil pencarian (${units.length})` : "Cari struktur organisasi"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={search} className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Cari unit atau perangkat daerah"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Mencari..." : "Cari"}
          </Button>
        </form>

        {!searched ? (
          <p className="text-sm text-on-surface-variant">
            Masukkan nama unit atau perangkat daerah, lalu klik Cari.
          </p>
        ) : loading ? (
          <p className="text-sm text-on-surface-variant">Mencari struktur...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Tidak ada unit yang cocok dengan “{appliedQuery}”.
          </p>
        ) : (
          groups.map(([group, forest]) => (
            <div key={group} className="space-y-2">
              <p className="text-sm font-semibold text-on-surface">{group}</p>
              <UnitTree nodes={forest} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
