"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ActivityCalendar } from "@/components/report/ActivityCalendar";
import { PrintReportButton } from "@/components/report/PrintReportButton";
import { ReportMonthNav } from "@/components/report/ReportMonthNav";
import { TaskReportList } from "@/components/report/TaskReportList";
import {
  groupKinerja,
  monthAsOfDate,
  recapDaysForTasks,
  type EvaluatedPegawai,
  type KinerjaEval,
  type KinerjaLevel,
} from "@/lib/kinerja";
import type { DayRecap, LaporanBy, PegawaiReportRow, ReportSummary } from "@/lib/report-types";
import { cn, formatLongDate, getMonthYearLabel } from "@/lib/utils";

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
  kolam: "border-transparent bg-primary-container text-on-primary-container",
};

const LEVEL_TRACK: Record<KinerjaLevel | "kolam", string> = {
  perlu_perhatian: "bg-error",
  lancar: "bg-emerald-600",
  tidak_aktif: "bg-tertiary-container",
  kolam: "bg-white",
};

export function PegawaiMonthlyReport({
  by,
  date,
  month,
  year,
  people,
  days,
  summary,
  unitName,
  instansiName,
  pimpinanName,
}: {
  by: LaporanBy;
  date: string;
  month: number;
  year: number;
  people: PegawaiReportRow[];
  days: DayRecap[];
  summary: ReportSummary;
  unitName: string;
  instansiName: string;
  pimpinanName?: string;
}) {
  const grouped = groupKinerja(people, monthAsOfDate(month, year), "bulanan");
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
      <div className="no-print space-y-3">
        <ReportMonthNav by={by} month={month} year={year} date={date} />
        <PrintReportButton />
      </div>

      <div className="no-print grid grid-cols-3 gap-2">
        <PulseCard count={grouped.perhatian.length} label="Perlu perhatian" tone="danger" />
        <PulseCard count={grouped.lancar.length} label="Lancar" tone="good" />
        <PulseCard count={grouped.idle.length} label="Tidak aktif" tone="idle" />
      </div>

      <div className="no-print space-y-2">
        <SectionTitle tone="lancar" label="Kalender unit" count={days.filter((day) => day.posted + day.completed > 0).length} />
        <ActivityCalendar by={by} month={month} year={year} days={days} />
      </div>

      {grouped.pool && grouped.pool.tasks.length > 0 ? (
        <section className="no-print space-y-2">
          <SectionTitle
            tone="kolam"
            label="Kolam belum diambil"
            count={grouped.pool.tasks.length}
            open={openSections.pool}
            onToggle={() => toggleSection("pool")}
          />
          {openSections.pool ? (
            <PersonCard
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
              person={grouped.pool}
              month={month}
              year={year}
              by={by}
            />
          ) : null}
        </section>
      ) : null}

      {grouped.perhatian.length > 0 ? (
        <section className="no-print space-y-2">
          <SectionTitle
            tone="perlu_perhatian"
            label="Perlu perhatian"
            count={grouped.perhatian.length}
            open={openSections.perhatian}
            onToggle={() => toggleSection("perhatian")}
          />
          {openSections.perhatian
            ? grouped.perhatian.map((item) => (
                <EvaluatedCard
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                  month={month}
                  year={year}
                  by={by}
                />
              ))
            : null}
        </section>
      ) : null}

      {grouped.lancar.length > 0 ? (
        <section className="no-print space-y-2">
          <SectionTitle
            tone="lancar"
            label="Berkinerja lancar"
            count={grouped.lancar.length}
            open={openSections.lancar}
            onToggle={() => toggleSection("lancar")}
          />
          {openSections.lancar
            ? grouped.lancar.map((item) => (
                <EvaluatedCard
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                  month={month}
                  year={year}
                  by={by}
                />
              ))
            : null}
        </section>
      ) : null}

      {grouped.idle.length > 0 ? (
        <section className="no-print space-y-2">
          <SectionTitle
            tone="tidak_aktif"
            label="Belum ada tugas"
            count={grouped.idle.length}
            open={openSections.idle}
            onToggle={() => toggleSection("idle")}
          />
          {openSections.idle
            ? grouped.idle.map((item) => (
                <EvaluatedCard
                  key={item.person.id}
                  item={item}
                  open={openId === item.person.id}
                  onToggle={() => setOpenId(openId === item.person.id ? null : item.person.id)}
                  month={month}
                  year={year}
                  by={by}
                />
              ))
            : null}
        </section>
      ) : null}

      {staffCount === 0 && !grouped.pool ? (
        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          Tidak ada pegawai pada unit ini.
        </p>
      ) : null}

      <div className="hidden print:block print-report">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">{instansiName}</h2>
          <p className="text-sm">{unitName}</p>
          <p className="text-sm">Laporan Pegawai — {getMonthYearLabel(month, year)}</p>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Diposting</p>
            <p className="text-xl font-bold">{summary.posted}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Selesai</p>
            <p className="text-xl font-bold">{summary.completed}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Rata bintang</p>
            <p className="text-xl font-bold">{summary.averageScore ? `${summary.averageScore}/3` : "-"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Tepat waktu</p>
            <p className="text-xl font-bold">{summary.onTimePercent}%</p>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-slate-500">
              <th className="py-2 pr-3">Pegawai</th>
              <th className="py-2 pr-3">Kinerja</th>
              <th className="py-2 pr-3">Selesai</th>
              <th className="py-2 pr-3">Rata nilai</th>
              <th className="py-2">Tepat waktu</th>
            </tr>
          </thead>
          <tbody>
            {[...grouped.perhatian, ...grouped.lancar, ...grouped.idle].length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Tidak ada pegawai pada periode ini.
                </td>
              </tr>
            ) : (
              [...grouped.perhatian, ...grouped.lancar, ...grouped.idle].map((item) => (
                <tr key={item.person.id} className="border-b border-slate-200">
                  <td className="py-2 pr-3 font-medium">{item.person.name}</td>
                  <td className="py-2 pr-3">{item.eval.label}</td>
                  <td className="py-2 pr-3">
                    {item.eval.completed}/{item.eval.total}
                  </td>
                  <td className="py-2 pr-3">
                    {item.person.summary.averageScore ? `${item.person.summary.averageScore}/3` : "-"}
                  </td>
                  <td className="py-2">{item.person.summary.onTimePercent}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-10 text-sm">
          <p>Dicetak pada: {formatLongDate(new Date())}</p>
          {pimpinanName ? <p className="mt-8">Pimpinan Unit: {pimpinanName}</p> : null}
          <p className="mt-12">_________________________</p>
        </div>
      </div>
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
        "rounded-xl px-3 py-3",
        tone === "danger" && "bg-error-container text-error",
        tone === "good" && "bg-emerald-50 text-emerald-700",
        tone === "idle" && "bg-surface-container text-tertiary"
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
  open?: boolean;
  onToggle?: () => void;
}) {
  const inner = (
    <>
      <span className={cn("h-2 w-2 rounded-full", LEVEL_BAR[tone])} />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</h3>
      <span className="text-xs text-tertiary">{count}</span>
      {onToggle ? (
        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-outline transition", open && "rotate-180")} />
      ) : null}
    </>
  );

  if (!onToggle) {
    return <div className="flex items-center gap-2 px-0.5">{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 rounded-lg px-0.5 py-1 text-left transition hover:bg-surface-container"
    >
      {inner}
    </button>
  );
}

function EvaluatedCard({
  item,
  open,
  onToggle,
  month,
  year,
  by,
}: {
  item: EvaluatedPegawai;
  open: boolean;
  onToggle: () => void;
  month: number;
  year: number;
  by: LaporanBy;
}) {
  const roleLabel = item.person.jabatanLabel || "Pegawai";
  return (
    <PersonCard
      name={item.person.name}
      meta={`${roleLabel}${item.person.unitName ? ` · ${item.person.unitName}` : ""}`}
      eval={item.eval}
      tone={item.eval.level}
      open={open}
      onToggle={onToggle}
      person={item.person}
      month={month}
      year={year}
      by={by}
      showScore
    />
  );
}

function PersonCard({
  name,
  meta,
  eval: kinerja,
  tone,
  open,
  onToggle,
  person,
  month,
  year,
  by,
  showScore = false,
}: {
  name: string;
  meta: string;
  eval: KinerjaEval;
  tone: KinerjaLevel | "kolam";
  open: boolean;
  onToggle: () => void;
  person: PegawaiReportRow;
  month: number;
  year: number;
  by: LaporanBy;
  showScore?: boolean;
}) {
  const personDays = recapDaysForTasks(person.tasks, month, year);
  const hasMonthActivity = personDays.some((day) => day.posted > 0 || day.completed > 0);

  return (
    <div className={cn("overflow-hidden rounded-xl border card-shadow", CARD_BG[tone])}>
      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-start gap-3 py-3 pl-5 pr-3 text-left"
        aria-expanded={open}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", LEVEL_BAR[tone])} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-navy text-xs font-bold text-on-secondary">
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
          {showScore && kinerja.completed > 0 ? (
            <div
              className={cn(
                "mt-1.5 flex flex-wrap gap-2 text-[11px]",
                tone === "kolam" ? "text-on-primary-container/80" : "text-tertiary"
              )}
            >
              <span>Bintang {person.summary.averageScore ? `${person.summary.averageScore}/3` : "-"}</span>
              <span>·</span>
              <span>{person.summary.onTimePercent}% tepat waktu</span>
            </div>
          ) : null}
          {kinerja.total > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div
                className={cn(
                  "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full",
                  tone === "kolam" ? "bg-white/50" : "bg-surface-container"
                )}
              >
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
            "mt-1 h-4 w-4 shrink-0 transition",
            tone === "kolam" ? "text-on-primary-container/70" : "text-outline",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className={cn("space-y-3 border-t p-3", tone === "kolam" ? "border-on-primary-container/15" : "border-outline-variant")}>
          {hasMonthActivity ? (
            <ActivityCalendar by={by} month={month} year={year} days={personDays} compact />
          ) : null}
          <TaskReportList tasks={person.tasks} emptyText="Tidak ada tugas pada bulan ini." />
        </div>
      ) : null}
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
