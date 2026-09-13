"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UnitRow = {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  perangkatDaerahId: string | null;
  perangkatDaerahNama: string | null;
};

type TreeNode = UnitRow & { children: TreeNode[] };

function buildForest(units: UnitRow[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(units.map((unit) => [unit.id, { ...unit, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const groups = new Map<string, { label: string; children: TreeNode[] }>();
  for (const root of roots) {
    const key = root.perangkatDaerahId || root.id;
    const label = root.perangkatDaerahNama || root.name;
    const group = groups.get(key) ?? { label, children: [] };
    group.children.push(root);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([id, group]) => ({
    id: `pd:${id}`,
    name: group.label,
    parentId: null,
    type: "kantor",
    perangkatDaerahId: id.startsWith("pd:") ? null : id,
    perangkatDaerahNama: group.label,
    children: group.children,
  }));
}

function nodeMatches(node: TreeNode, query: string): boolean {
  if (!query) return true;
  if (node.name.toLowerCase().includes(query)) return true;
  return node.children.some((child) => nodeMatches(child, query));
}

function UnorNode({
  node,
  depth,
  query,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  query: string;
  selectedId: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
}) {
  if (query && !nodeMatches(node, query)) return null;
  const hasChildren = node.children.length > 0;
  const open = Boolean(query) || expanded.has(node.id);
  const selectable = !node.id.startsWith("pd:");
  const selected = selectable && selectedId === node.id;

  return (
    <div>
      <div className="flex items-stretch gap-1">
        {hasChildren ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container"
            aria-label={open ? "Tutup" : "Buka"}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-9 shrink-0" />
        )}
        <button
          type="button"
          disabled={!selectable}
          onClick={() => selectable && onSelect(node)}
          className={cn(
            "min-w-0 flex-1 rounded-lg border px-3 py-2 text-left text-sm",
            selected
              ? "border-primary-container bg-secondary-container text-on-secondary-container"
              : "border-surface-container-highest bg-surface-container-low text-on-surface",
            !selectable && "cursor-default",
          )}
        >
          {node.name}
        </button>
      </div>
      {hasChildren && open ? (
        <div className="ml-4 mt-1 space-y-1 border-l border-outline-variant pl-2">
          {node.children.map((child) => (
            <UnorNode
              key={child.id}
              node={child}
              depth={depth + 1}
              query={query}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PindahUnorPage({ pegawaiId }: { pegawaiId: string }) {
  const router = useRouter();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [pegawaiName, setPegawaiName] = useState("");
  const [currentUnorId, setCurrentUnorId] = useState<string | null>(null);
  const [currentUnorNama, setCurrentUnorNama] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/pegawai/${pegawaiId}`).then((res) => res.json()),
      fetch("/api/admin/pegawai/tree").then((res) => res.json()),
    ])
      .then(([pegawaiRes, treeRes]) => {
        if (cancelled) return;
        if (pegawaiRes.pegawai) {
          setPegawaiName(pegawaiRes.pegawai.name);
          setCurrentUnorId(pegawaiRes.pegawai.unorId);
          setCurrentUnorNama(pegawaiRes.pegawai.unorNama);
          setSelectedId(pegawaiRes.pegawai.unorId || "");
          setSelectedName(pegawaiRes.pegawai.unorNama || "");
        }
        setUnits(treeRes.units ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat data unit organisasi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pegawaiId]);

  const forest = useMemo(() => buildForest(units), [units]);
  const foldedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!currentUnorId || units.length === 0) return;
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    const next = new Set<string>();
    let cursor: UnitRow | undefined = byId.get(currentUnorId);
    while (cursor) {
      next.add(cursor.id);
      const pdKey = cursor.perangkatDaerahId ? `pd:${cursor.perangkatDaerahId}` : "";
      if (pdKey) next.add(pdKey);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    setExpanded((current) => {
      const merged = new Set(current);
      for (const id of next) merged.add(id);
      return merged;
    });
  }, [currentUnorId, units]);

  async function pilihUnor() {
    if (!selectedId || selectedId.startsWith("pd:")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/pegawai/${pegawaiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unorId: selectedId }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal memindahkan unit organisasi");
      return;
    }
    router.push("/admin/pegawai");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pindah UNOR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium text-on-surface">{pegawaiName || "Memuat pegawai..."}</p>
          <p className="text-on-surface-variant">UNOR saat ini: {currentUnorNama || "-"}</p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama unit organisasi"
        />
        {error ? <p className="text-error">{error}</p> : null}
        {loading ? (
          <p className="text-on-surface-variant">Memuat treeview unit organisasi...</p>
        ) : (
          <div className="max-h-[55vh] space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
            {forest.map((node) => (
              <UnorNode
                key={node.id}
                node={node}
                depth={0}
                query={foldedQuery}
                selectedId={selectedId}
                expanded={expanded}
                onToggle={(id) => {
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onSelect={(node) => {
                  setSelectedId(node.id);
                  setSelectedName(node.name);
                }}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-on-surface-variant">Terpilih: {selectedName || "-"}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/pegawai")}>
              Batal
            </Button>
            <Button type="button" disabled={saving || !selectedId || selectedId.startsWith("pd:")} onClick={() => void pilihUnor()}>
              {saving ? "Menyimpan..." : "Pilih"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
