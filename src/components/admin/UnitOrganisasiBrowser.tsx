"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type OrgUnit = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  type: string;
  eselonId: string | null;
  statusUnor: string | null;
  perangkatDaerahId: string | null;
  perangkatDaerahNama: string | null;
  pimpinanName: string | null;
  pegawaiCount: number;
};

type TreeNode = OrgUnit & { children: TreeNode[] };

const typeLabel: Record<string, string> = {
  kantor: "Kantor",
  bidang: "Bidang",
  sub_bidang: "Sub Bidang",
};

function buildForest(units: OrgUnit[]): TreeNode[] {
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

  return [...groups.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "id"))
    .map(([id, group]) => ({
      id: `pd:${id}`,
      name: group.label,
      parentId: null,
      parentName: null,
      type: "kantor",
      eselonId: null,
      statusUnor: null,
      perangkatDaerahId: id,
      perangkatDaerahNama: group.label,
      pimpinanName: null,
      pegawaiCount: 0,
      children: group.children,
    }));
}

function nodeMatches(node: TreeNode, query: string): boolean {
  if (!query) return true;
  if (node.name.toLowerCase().includes(query)) return true;
  return node.children.some((child) => nodeMatches(child, query));
}

function UnitNode({
  node,
  query,
  forceShow = false,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  query: string;
  forceShow?: boolean;
  selectedId: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const selfMatches = !query || node.name.toLowerCase().includes(query);
  if (query && !forceShow && !nodeMatches(node, query)) return null;
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
            "min-w-0 flex-1 rounded-lg border px-3 py-2 text-left text-xs md:text-sm",
            selected
              ? "border-primary-container bg-secondary-container text-on-secondary-container"
              : "border-surface-container-highest bg-surface-container-low text-on-surface",
            !selectable && "cursor-default font-medium",
          )}
        >
          <span className="block truncate">{node.name}</span>
          {selectable ? (
            <span className={cn("block text-xs", selected ? "text-on-secondary-container/80" : "text-on-surface-variant")}>
              {typeLabel[node.type] || node.type}
              {node.pegawaiCount > 0 ? ` · ${node.pegawaiCount} pegawai` : ""}
            </span>
          ) : null}
        </button>
      </div>
      {hasChildren && open ? (
        <div className="ml-4 mt-1 space-y-1 border-l border-outline-variant pl-2">
          {node.children.map((child) => (
            <UnitNode
              key={child.id}
              node={child}
              query={query}
              forceShow={forceShow || selfMatches}
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value || "-"}</p>
    </div>
  );
}

export function UnitOrganisasiBrowser({ units }: { units: OrgUnit[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState(false);
  const forest = useMemo(() => buildForest(units), [units]);
  const foldedQuery = query.trim().toLowerCase();
  const selected = units.find((unit) => unit.id === selectedId) ?? null;
  const childCount = selected ? units.filter((unit) => unit.parentId === selected.id).length : 0;
  const perangkatDaerahCount = new Set(
    units.map((unit) => unit.perangkatDaerahId).filter((id): id is string => Boolean(id)),
  ).size;

  async function pullFromSimpeg() {
    setSyncing(true);
    setSyncError(false);
    setSyncMessage("");
    const res = await fetch("/api/admin/unit/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setSyncError(true);
      setSyncMessage(data.error || "Gagal menarik data dari Simpeg PB");
      return;
    }
    setSyncMessage(`Berhasil menarik ${data.unitCount ?? 0} unit organisasi dari Simpeg PB.`);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Unit organisasi"
        subtitle="Kelola seluruh unit organisasi di semua perangkat daerah."
        action={
          <Button type="button" onClick={() => void pullFromSimpeg()} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Menarik data..." : "Tarik dari Simpeg PB"}
          </Button>
        }
      />
      {syncMessage ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            syncError
              ? "bg-error-container text-error"
              : "bg-secondary-container text-on-secondary-container",
          )}
        >
          {syncMessage}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Seluruh unit ({units.length}
            {perangkatDaerahCount > 0 ? ` · ${perangkatDaerahCount} perangkat daerah` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama unit atau perangkat daerah"
            aria-label="Cari unit organisasi"
          />
          {selected ? (
            <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 sm:grid-cols-2">
              <DetailField label="Nama" value={selected.name} />
              <DetailField label="Jenis" value={typeLabel[selected.type] || selected.type} />
              <DetailField label="Induk" value={selected.parentName || "-"} />
              <DetailField label="Perangkat daerah" value={selected.perangkatDaerahNama || "-"} />
              <DetailField label="Eselon" value={selected.eselonId || "-"} />
              <DetailField label="Status" value={selected.statusUnor || "-"} />
              <DetailField label="Pimpinan" value={selected.pimpinanName || "-"} />
              <DetailField
                label="Anggota"
                value={`${selected.pegawaiCount} pegawai · ${childCount} unit di bawahnya`}
              />
            </div>
          ) : (
            <p className="text-on-surface-variant">Pilih satu unit untuk melihat detailnya.</p>
          )}
          {units.length === 0 ? (
            <p className="text-on-surface-variant">Belum ada unit organisasi.</p>
          ) : (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
              {forest.map((node) => (
                <UnitNode
                  key={node.id}
                  node={node}
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
                  onSelect={(node) => setSelectedId(node.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
