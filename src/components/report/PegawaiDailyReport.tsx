"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DailyDateNav } from "@/components/report/DailyDateNav";
import { TaskReportList } from "@/components/report/TaskReportList";
import { Collapse } from "@/components/ui/collapse";
import { groupKinerjaHarian, type EvaluatedPegawai, type KinerjaEval, type KinerjaLevel } from "@/lib/kinerja";
import type { PegawaiReportRow } from "@/lib/report-types";
import { cn, formatLongDate } from "@/lib/utils";

const LEVEL_BAR: Record<KinerjaLevel | "kolam", string> = {
  perlu_perhatian: "bg-error",
  lancar: "bg-emerald-600",
  tidak_aktif: "bg-tertiary-container",
  kolam: "bg-white/80",
};

const LEVEL_CHIP: Record<KinerjaLevel | "kolam", string> = {
  perlu_perhatian: "bg-error-container text-error",
  lancar: "bg-emerald-50 text-emerald-700",
  tidak_aktif: "bg-surface-container-high text-tertiary",
  kolam: "bg-white/20 text-on-primary-container",
};

const CARD_BG: Record<KinerjaLevel | "kolam", string> = {
  perlu_perhatian: "border-outline-variant bg-surface-container-lowest",
  lancar: "border-outline-variant bg-surface-container-lowest",
  tidak_aktif: "border-outline-variant bg-surface-container-lowest",
  kolam: "border-accent bg-primary text-white",
};

const LEVEL_TRACK: Record<KinerjaLevel | "kolam", string> = {
  perlu_perhatian: "bg-error",
  lancar: "bg-emerald-600",
  tidak_aktif: "bg-tertiary-container",
  kolam: "bg-white",
};

export function PegawaiDailyReport({
  date,
  month,
  year,
  people,
}: {
  date: string;
  month: number;
  year: number;
  people: PegawaiReportRow[];
}) {
  const grouped = groupKinerjaHarian(people, date);
  const staffCount = grouped.perhatian.length + grouped.lancar.length + grouped.idle.length;
  const defaultOpen = grouped.perhatian.length === 1 ? grouped.perhatian[0].person.id : null;
  const [openId, setOpenId] = useState<string | null>(defaultOpen);
  const [openSections, setOpenSections] = useState({
    pool: true,
    perhatian: true,
    lancar: true,
    idle: false,
  });

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="space-y-4">
      <DailyDateNav basePath="/pimpinan" date={date} month={month} year={year} />
      <p className="text-sm font-medium text-on-surface-variant">{formatLongDate(date)}</p>

      <div className="grid grid-cols-3 gap-2">
        <PulseCard
          count={grouped.perhatian.length}
          label="Perlu perhatian"
          tone="danger"
        />
        <PulseCard count={grouped.lancar.length} label="Lancar" tone="good" />
        <PulseCard count={grouped.idle.length} label="Tidak aktif" tone="idle" />
      </div>

      {grouped.pool && grouped.pool.tasks.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle
            tone="kolam"
            label="Kolam belum diambil"
            count={grouped.pool.tasks.length}
            open={openSections.pool}
            onToggle={() => toggleSection("pool")}
          />
          {openSections.pool ? (
            <PersonRow
              name={grouped.pool.name}
              meta="Tugas kolam unit"
              eval={grouped.poolEval!}
              tone="kolam"
              open={openId === grouped.pool.id}
              onToggle={() => {
                const id = grouped.pool?.id;
                if (!id) return;
                setOpenId(openId === id ? null : id);
              }}
              tasks={grouped.pool.tasks}
            />
          ) : null}
        </section>
      ) : null}

      {grouped.perhatian.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle
            tone="perlu_perhatian"
            label="Perlu perhatian"
            count={grouped.perhatian.length}
            open={openSections.perhatian}
            onToggle={() => toggleSection("perhatian")}
          />
          {openSections.perhatian
            ? grouped.perhatian.map((item) => (
                <EvaluatedRow
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                />
              ))
            : null}
        </section>
      ) : null}

      {grouped.lancar.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle
            tone="lancar"
            label="Berkinerja lancar"
            count={grouped.lancar.length}
            open={openSections.lancar}
            onToggle={() => toggleSection("lancar")}
          />
          {openSections.lancar
            ? grouped.lancar.map((item) => (
                <EvaluatedRow
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                />
              ))
            : null}
        </section>
      ) : null}

      {grouped.idle.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle
            tone="tidak_aktif"
            label="Belum ada tugas"
            count={grouped.idle.length}
            open={openSections.idle}
            onToggle={() => toggleSection("idle")}
          />
          {openSections.idle
            ? grouped.idle.map((item) => (
                <EvaluatedRow
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                />
              ))
            : null}
        </section>
      ) : null}

      {staffCount === 0 && !grouped.pool ? (
        <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Tidak ada pegawai pada unit ini.
        </p>
      ) : null}
    </div>
  );
}

function PulseCard({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "danger" | "good" | "idle";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        tone === "danger" && "border-error/40 bg-error-container text-error",
        tone === "good" && "border-green-300 bg-emerald-50 text-emerald-700",
        tone === "idle" && "border-outline bg-surface-container text-tertiary"
      )}
    >
      <p className="text-2xl font-bold leading-none">{count}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight">{label}</p>
    </div>
  );
}

function SectionTitle({
  tone,
  label,
  count,
  open,
  onToggle,
}: {
  tone: KinerjaLevel | "kolam";
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 rounded-lg px-0.5 py-1 text-left transition hover:bg-surface-container"
    >
      <span className={cn("h-2 w-2 rounded-full", LEVEL_BAR[tone])} />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</h3>
      <span className="text-xs text-tertiary">{count}</span>
      <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-outline transition", open && "rotate-180")} />
    </button>
  );
}

function EvaluatedRow({
  item,
  open,
  onToggle,
}: {
  item: EvaluatedPegawai;
  open: boolean;
  onToggle: () => void;
}) {
  const roleLabel = item.person.jabatanLabel || "Pegawai";
  return (
    <PersonRow
      name={item.person.name}
      meta={`${roleLabel}${item.person.unitName ? ` · ${item.person.unitName}` : ""}`}
      eval={item.eval}
      tone={item.eval.level}
      open={open}
      onToggle={onToggle}
      tasks={item.person.tasks}
    />
  );
}

function PersonRow({
  name,
  meta,
  eval: kinerja,
  tone,
  open,
  onToggle,
  tasks,
}: {
  name: string;
  meta: string;
  eval: KinerjaEval;
  tone: KinerjaLevel | "kolam";
  open: boolean;
  onToggle: () => void;
  tasks: PegawaiReportRow["tasks"];
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border card-shadow", CARD_BG[tone])}>
      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-start gap-3 py-3 pl-5 pr-3 text-left"
        aria-expanded={open}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", LEVEL_BAR[tone])} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-xs font-bold text-on-secondary-container">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("truncate font-semibold", tone === "kolam" ? "text-on-primary-container" : "text-on-surface")}>
              {name}
            </p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", LEVEL_CHIP[tone])}>
              {kinerja.label}
            </span>
          </div>
          <p className={cn("mt-0.5 truncate text-xs", tone === "kolam" ? "text-on-primary-container/80" : "text-on-surface-variant")}>
            {meta}
          </p>
          <p className={cn("mt-1 text-xs", tone === "kolam" ? "text-on-primary-container/90" : "text-on-surface")}>
            {kinerja.insight}
          </p>
          {kinerja.total > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div className={cn("h-1.5 min-w-0 flex-1 overflow-hidden rounded-full", tone === "kolam" ? "bg-white/50" : "bg-surface-container")}>
                <div
                  className={cn("h-full rounded-full", LEVEL_TRACK[tone])}
                  style={{ width: `${kinerja.completionRate}%` }}
                />
              </div>
              <span
                className={cn(
                  "shrink-0 text-[11px] font-medium tabular-nums",
                  tone === "kolam" ? "text-on-primary-container/80" : "text-tertiary"
                )}
              >
                {kinerja.completed}/{kinerja.total}
              </span>
            </div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none",
            tone === "kolam" ? "text-on-primary-container/70" : "text-outline",
            open && "rotate-180"
          )}
        />
      </button>
      <Collapse open={open}>
        <div className={cn("border-t p-3", tone === "kolam" ? "border-on-primary-container/15" : "border-outline-variant")}>
          <TaskReportList tasks={tasks} showAssignee={false} emptyText="Tidak ada tugas pada hari ini." />
        </div>
      </Collapse>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
