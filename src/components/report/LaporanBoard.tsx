"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ActivityCalendar } from "@/components/report/ActivityCalendar";
import { DailyDateNav } from "@/components/report/DailyDateNav";
import { ReportActionButtons } from "@/components/report/ReportActionButtons";
import { ReportMonthNav } from "@/components/report/ReportMonthNav";
import { PersonMonthTasks } from "@/components/report/PersonMonthTasks";
import { TaskReportList } from "@/components/report/TaskReportList";
import { Badge } from "@/components/ui/badge";
import { Collapse } from "@/components/ui/collapse";
import { reportHref, type ReportBasePath } from "@/lib/laporan-url";
import {
  laporanPersonLabel,
  type LaporanBoard,
  type LaporanPerson,
  type LaporanTone,
  type LaporanUnit,
} from "@/lib/laporan-board-types";
import { MONITOR_UNIT_TYPE_LABEL } from "@/lib/monitor-types";
import type { LaporanView } from "@/lib/report-types";
import { cn } from "@/lib/utils";

const TONE_BAR: Record<LaporanTone, string> = {
  alert: "bg-error",
  watch: "bg-amber-400",
  idle: "bg-tertiary-container",
  good: "bg-emerald-600",
};

const TONE_CHIP: Record<LaporanTone, string> = {
  alert: "bg-error-container text-error",
  watch: "bg-amber-50 text-amber-800",
  idle: "bg-surface-container-high text-tertiary",
  good: "bg-emerald-50 text-emerald-700",
};

export function LaporanBoardView({
  board,
  view,
  date,
  month,
  year,
  unitId,
  basePath = "/laporan",
  peopleHeading,
  ownPerson = null,
  ownHeading = "Individu",
  ownDefaultOpen = false,
  showActions = true,
}: {
  board: LaporanBoard;
  view: LaporanView;
  date: string;
  month: number;
  year: number;
  unitId: string | null;
  basePath?: ReportBasePath;
  peopleHeading?: string;
  ownPerson?: LaporanPerson | null;
  ownHeading?: string;
  ownDefaultOpen?: boolean;
  showActions?: boolean;
}) {
  const query = { view, date, month, year, unit: unitId };
  const defaultOpen =
    ownDefaultOpen && ownPerson
      ? ownPerson.id
      : board.people.find((person) => person.tone === "alert")?.id ??
        board.people.find((person) => person.completed > 0)?.id ??
        board.people[0]?.id ??
        null;
  const [openId, setOpenId] = useState<string | null>(defaultOpen);

  function togglePerson(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  function href(next: { unit?: string | null; view?: LaporanView }) {
    return reportHref(basePath, {
      ...query,
      view: next.view ?? view,
      unit: next.unit === undefined ? unitId : next.unit,
    });
  }

  return (
    <div className="no-print space-y-4">
      <div className="no-print space-y-3">
        {view === "harian" ? (
          <DailyDateNav basePath={basePath} date={date} month={month} year={year} />
        ) : (
          <ReportMonthNav basePath={basePath} month={month} year={year} date={date} />
        )}
        {showActions ? (
          <ReportActionButtons by="pegawai" view={view} date={date} month={month} year={year} unit={unitId} />
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-accent bg-primary p-3 text-white md:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
          {view === "harian" ? "Recap harian" : "Rapor bulanan"}
        </p>
        <h3 className="mt-0.5 text-lg font-bold leading-6 tracking-tight md:text-xl">{board.unitName}</h3>
        <p className="mt-1.5 text-sm text-white/90">{board.insight}</p>
      </section>

      <div className={cn("grid gap-2", board.isLeader ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        <Stat label="Disetujui" value={board.summary.completed} />
        <Stat label="Ditolak" value={board.summary.rejected} warn={board.summary.rejected > 0} />
        <Stat label="Nilai" value={board.summary.averageScore ? `${board.summary.averageScore}/3` : "-"} />
        {board.isLeader ? (
          <Stat label="Tepat waktu" value={board.summary.completed ? `${board.summary.onTimePercent}%` : "-"} />
        ) : null}
      </div>

      {board.trail.length > 1 ? (
        <nav className="flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
          {board.trail.map((item, index) => {
            const isLast = index === board.trail.length - 1;
            const target = index === 0 ? (board.rootUnitId === item.id ? null : item.id) : item.id;
            return (
              <span key={item.id} className="inline-flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                {isLast ? (
                  <span className="font-semibold text-on-surface">{item.name}</span>
                ) : (
                  <Link href={href({ unit: target })} className="hover:text-primary hover:underline">
                    {item.name}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}

      {view === "bulanan" && board.days.some((day) => day.completed + day.posted > 0) ? (
        <ActivityCalendar basePath={basePath} month={month} year={year} days={board.days} />
      ) : null}

      {board.childUnits.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Unit di bawah Anda
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {board.childUnits.map((unit) => (
              <UnitCard key={unit.id} unit={unit} href={href({ unit: unit.id })} />
            ))}
          </div>
        </section>
      ) : null}

      {ownPerson ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{ownHeading}</h3>
          <PersonCard
            person={ownPerson}
            open={openId === ownPerson.id}
            onToggle={() => togglePerson(ownPerson.id)}
            month={month}
            year={year}
            showCalendar={view === "bulanan"}
          />
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {peopleHeading ?? (board.isLeader ? "Bawahan langsung" : "Kinerja Anda")}
        </h3>
        {board.people.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            {board.childUnits.length
              ? "Lihat kartu unit untuk hasil kasubbid. Tidak ada bawahan langsung di unit ini."
              : view === "harian"
                ? "Tidak ada kerja dinilai hari ini."
                : "Tidak ada pegawai yang dinilai pada periode ini."}
          </p>
        ) : (
          board.people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              open={openId === person.id}
              onToggle={() => togglePerson(person.id)}
              month={month}
              year={year}
              showCalendar={view === "bulanan"}
            />
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-outline bg-surface-container-lowest px-3 py-3">
      <p className={cn("text-2xl font-bold leading-none tabular-nums", warn ? "text-error" : "text-on-surface")}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-on-surface-variant">{label}</p>
    </div>
  );
}

function UnitCard({ unit, href }: { unit: LaporanUnit; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border p-3 transition hover:shadow-md",
        unit.tone === "alert" && "border-error/40 bg-error-container/40",
        unit.tone === "watch" && "border-amber-200 bg-amber-50",
        unit.tone === "idle" && "border-outline bg-surface-container",
        unit.tone === "good" && "border-outline bg-surface-container-lowest",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{unit.name}</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            {unit.leaderName || MONITOR_UNIT_TYPE_LABEL[unit.type]} · {unit.staffCount} pegawai
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE_CHIP[unit.tone])}>
          {unit.tone === "alert" ? "Perlu perhatian" : unit.tone === "watch" ? "Waspada" : unit.tone === "idle" ? "Tidak aktif" : "Lancar"}
        </span>
      </div>
      <p className="mt-2 text-xs text-on-surface">{unit.insight}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Selesai" value={unit.completed} />
        <MiniStat label="Nilai" value={unit.averageScore ? `${unit.averageScore}/3` : "-"} />
        <MiniStat label="Review" value={unit.reviewSlaHours != null ? `${Math.round(unit.reviewSlaHours)}j` : "-"} />
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums text-on-surface">{value}</p>
      <p className="text-[10px] text-on-surface-variant">{label}</p>
    </div>
  );
}

function PersonCard({
  person,
  open,
  onToggle,
  month,
  year,
  showCalendar,
}: {
  person: LaporanPerson;
  open: boolean;
  onToggle: () => void;
  month: number;
  year: number;
  showCalendar: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest card-shadow">
      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-start gap-3 py-3 pl-5 pr-3 text-left"
        aria-expanded={open}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", TONE_BAR[person.tone])} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-xs font-bold text-on-secondary-container">
          {initials(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-on-surface">{person.name}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE_CHIP[person.tone])}>
              {laporanPersonLabel(person)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-on-surface-variant">
            {person.jabatanLabel || "Pegawai"}
            {person.unitName ? ` · ${person.unitName}` : ""}
          </p>
          {person.insight ? <p className="mt-1 text-xs text-on-surface">{person.insight}</p> : null}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {person.completed > 0 ? <Badge variant="disetujui">{person.completed} disetujui</Badge> : null}
            {person.rejected > 0 ? <Badge variant="ditolak">{person.rejected} ditolak</Badge> : null}
            {person.stars1 > 0 ? <Badge variant="warning">{person.stars1} di bawah ekspektasi</Badge> : null}
            {person.waiting > 0 ? <Badge variant="menunggu_approval">{person.waiting} menunggu</Badge> : null}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-outline transition-transform duration-300 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <Collapse open={open}>
        <div className="space-y-3 border-t border-outline-variant p-3">
          {showCalendar ? (
            <PersonMonthTasks
              tasks={person.tasks}
              month={month}
              year={year}
              resetKey={`${person.id}-${month}-${year}`}
              emptyText="Tidak ada kerja dinilai bulan ini."
            />
          ) : (
            <TaskReportList
              tasks={person.tasks}
              showAssignee={false}
              emptyText="Tidak ada kerja dinilai hari ini."
            />
          )}
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
