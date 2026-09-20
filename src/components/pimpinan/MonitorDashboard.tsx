"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Inbox,
  Star,
  UserMinus,
  Users,
} from "lucide-react";
import { TaskReportList } from "@/components/report/TaskReportList";
import { Badge } from "@/components/ui/badge";
import { Collapse } from "@/components/ui/collapse";
import {
  MONITOR_FOCUS_LABEL,
  MONITOR_IDLE_DAYS,
  MONITOR_REVIEW_SLA_HOURS,
  MONITOR_UNIT_TYPE_LABEL,
  monitorHref,
  personMatchesFocus,
  tasksForFocus,
  unitMatchesFocus,
  type MonitorBoard,
  type MonitorFocus,
  type MonitorPerson,
  type MonitorUnitHeat,
} from "@/lib/monitor-types";
import { cn, formatRelativeTime } from "@/lib/utils";

const FOCUS_CHIPS: Array<{
  id: MonitorFocus;
  icon: typeof AlertTriangle;
}> = [
  { id: "overdue", icon: AlertTriangle },
  { id: "idle", icon: UserMinus },
  { id: "review", icon: Clock3 },
  { id: "rejected", icon: Inbox },
  { id: "low_score", icon: Star },
  { id: "overload", icon: Users },
  { id: "pool", icon: ClipboardList },
];

export function MonitorDashboard({
  board,
  focus,
  unitId,
  date,
  month,
  year,
}: {
  board: MonitorBoard;
  focus: MonitorFocus;
  unitId: string | null;
  date: string;
  month: number;
  year: number;
}) {
  const query = { date, month, year, unit: unitId };
  const flagged = board.people.filter((person) => personMatchesFocus(person, focus));
  const [openId, setOpenId] = useState<string | null>(flagged[0]?.id ?? null);
  const visiblePool =
    focus === "pool" || focus === "all"
      ? board.poolTasks
      : focus === "overdue"
        ? board.poolTasks.filter((task) => task.kinds.includes("overdue"))
        : [];

  function href(next: { focus?: MonitorFocus; unit?: string | null }) {
    return monitorHref({
      ...query,
      focus: next.focus ?? focus,
      unit: next.unit === undefined ? unitId : next.unit,
    });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-accent bg-primary p-3 text-white md:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">Papan pemantauan</p>
        <h3 className="mt-0.5 text-lg font-bold leading-6 tracking-tight md:text-xl">{board.unitName}</h3>
        <p className="mt-1.5 text-sm text-white/90">{board.insight}</p>
      </section>

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

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FocusChip href={href({ focus: "all" })} active={focus === "all"} label="Semua" count={exceptionCount(board)} />
        {FOCUS_CHIPS.map(({ id, icon: Icon }) => {
          const count = summaryCount(board, id);
          if (id !== "pool" && id !== focus && count === 0) return null;
          if (id === "pool" && count === 0 && focus !== "pool") return null;
          return (
            <FocusChip
              key={id}
              href={href({ focus: id })}
              active={focus === id}
              label={MONITOR_FOCUS_LABEL[id]}
              count={count}
              icon={<Icon className="h-3 w-3" />}
            />
          );
        })}
      </div>

      {board.childUnits.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Unit di bawah Anda</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {board.childUnits.map((unit) => (
              <UnitHeatCard key={unit.id} unit={unit} href={href({ unit: unit.id, focus })} />
            ))}
          </div>
        </section>
      ) : null}

      {visiblePool.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Kolam belum diambil
          </h3>
          <TaskReportList tasks={visiblePool} emptyText="Tidak ada tugas kolam." />
        </section>
      ) : null}

      {focus !== "pool" ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {focus === "all" ? "Bawahan langsung" : MONITOR_FOCUS_LABEL[focus]}
          </h3>
          {flagged.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
              {focus === "all"
                ? board.childUnits.length > 0
                  ? "Isu ada di kartu unit. Bawahan langsung Anda tidak perlu tindakan personal."
                  : "Tidak ada bawahan langsung yang perlu tindakan saat ini."
                : `Tidak ada isu ${MONITOR_FOCUS_LABEL[focus].toLowerCase()}.`}
            </p>
          ) : (
            flagged.map((person) => (
              <PersonMonitorCard
                key={person.id}
                person={person}
                focus={focus}
                open={openId === person.id}
                onToggle={() => setOpenId(openId === person.id ? null : person.id)}
              />
            ))
          )}
        </section>
      ) : null}

      {focus === "all" && board.people.length > 0 ? <WorkloadChart people={board.people} /> : null}
    </div>
  );
}

function sharePercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function WorkloadChart({ people }: { people: MonitorPerson[] }) {
  const ranked = [...people].sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    if (b.stackedOpenCount !== a.stackedOpenCount) return b.stackedOpenCount - a.stackedOpenCount;
    return a.name.localeCompare(b.name, "id");
  });
  const openTotal = ranked.reduce((sum, person) => sum + person.stackedOpenCount, 0);
  const completedTotal = ranked.reduce((sum, person) => sum + person.completedCount, 0);
  const taskTotal = openTotal + completedTotal;
  const barMax = Math.max(...ranked.map((person) => person.completedCount + person.stackedOpenCount), 0);

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Beban kerja</h3>
          <p className="mt-0.5 text-sm text-on-surface">
            {completedTotal} selesai · {openTotal} terbuka
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Selesai
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-600" />
            Terbuka
          </span>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-outline bg-surface-container-lowest">
        {ranked.map((person, index) => {
          const personTasks = person.completedCount + person.stackedOpenCount;
          const doneWidth = barMax > 0 ? `${(person.completedCount / barMax) * 100}%` : "0%";
          const openWidth = barMax > 0 ? `${(person.stackedOpenCount / barMax) * 100}%` : "0%";
          return (
            <div
              key={person.id}
              className={cn("px-3 py-2.5", index !== ranked.length - 1 && "border-b border-outline-variant")}
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-on-surface">{person.name}</p>
                <span className="shrink-0 text-sm font-bold tabular-nums text-on-surface">
                  {sharePercent(personTasks, taskTotal)}%
                </span>
                {person.isIdle ? (
                  <span className="shrink-0 rounded-md bg-error-container px-1.5 py-0.5 text-[10px] font-semibold text-error">
                    Idle
                  </span>
                ) : null}
              </div>
              <div
                className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-surface-container-high"
                role="img"
                aria-label={`${person.name}, selesai ${person.completedCount}, terbuka ${person.stackedOpenCount}, ${person.workloadScore}`}
              >
                {person.completedCount > 0 ? (
                  <span className="h-full bg-primary" style={{ width: doneWidth }} />
                ) : null}
                {person.stackedOpenCount > 0 ? (
                  <span className="h-full bg-amber-600" style={{ width: openWidth }} />
                ) : null}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <div className="flex flex-wrap gap-3 text-[11px] text-on-surface-variant">
                  <span>
                    Selesai <span className="font-semibold tabular-nums text-on-surface">{person.completedCount}</span>
                  </span>
                  <span>
                    Terbuka <span className="font-semibold tabular-nums text-on-surface">{person.stackedOpenCount}</span>
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold tabular-nums text-on-surface">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                  {person.workloadScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function exceptionCount(board: MonitorBoard) {
  return (
    board.people.filter((person) => personMatchesFocus(person, "all")).length +
    board.childUnits.filter((unit) => unitMatchesFocus(unit, "all")).length
  );
}

function summaryCount(board: MonitorBoard, focus: MonitorFocus) {
  if (focus === "overdue") return board.summary.overdue;
  if (focus === "idle") return board.summary.idle;
  if (focus === "review") return board.summary.reviewStale;
  if (focus === "rejected") return board.summary.rejected;
  if (focus === "low_score") return board.summary.lowScore;
  if (focus === "overload") return board.summary.overload;
  if (focus === "pool") return board.summary.pool;
  return exceptionCount(board);
}

function FocusChip({
  href,
  active,
  label,
  count,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
        active
          ? "border-accent bg-primary text-white"
          : "border-outline bg-surface-container-lowest text-on-surface hover:border-primary",
      )}
    >
      {icon}
      {label}
      <span className={cn("tabular-nums", active ? "text-white/80" : "text-tertiary")}>{count}</span>
    </Link>
  );
}

function UnitHeatCard({ unit, href }: { unit: MonitorUnitHeat; href: string }) {
  const reviewSlow =
    unit.reviewQueue > 0 || (unit.reviewSlaHours != null && unit.reviewSlaHours >= MONITOR_REVIEW_SLA_HOURS);

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border p-3 transition hover:shadow-md",
        unit.tone === "alert" && "border-error/40 bg-error-container/40",
        unit.tone === "watch" && "border-amber-200 bg-amber-50",
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
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            unit.tone === "alert" && "bg-error-container text-error",
            unit.tone === "watch" && "bg-amber-100 text-amber-800",
            unit.tone === "good" && "bg-emerald-50 text-emerald-700",
          )}
        >
          {unit.tone === "alert" ? "Perlu tindakan" : unit.tone === "watch" ? "Waspada" : "Lancar"}
        </span>
      </div>
      <p className="mt-2 text-xs text-on-surface">{unit.insight}</p>
      {reviewSlow ? (
        <span className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          Review lambat
        </span>
      ) : null}
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <HeatStat label="Terlambat" value={unit.overdue} warn={unit.overdue > 0} />
        <HeatStat label="Antrian" value={unit.reviewQueue} warn={unit.reviewQueue > 0} />
        <HeatStat
          label="Beban"
          value={unit.workloadLabel === "timpang" ? "Timpang" : "Seimbang"}
          warn={unit.workloadLabel === "timpang"}
        />
      </div>
    </Link>
  );
}

function HeatStat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div>
      <p className={cn("text-sm font-bold tabular-nums", warn ? "text-error" : "text-on-surface")}>{value}</p>
      <p className="text-[10px] text-on-surface-variant">{label}</p>
    </div>
  );
}

function PersonMonitorCard({
  person,
  focus,
  open,
  onToggle,
}: {
  person: MonitorPerson;
  focus: MonitorFocus;
  open: boolean;
  onToggle: () => void;
}) {
  const tasks = tasksForFocus(person, focus);
  const tone = person.overdueCount || person.rejectedCount || person.isIdle ? "alert" : "watch";

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest card-shadow">
      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-start gap-3 py-3 pl-5 pr-3 text-left"
        aria-expanded={open}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1.5", tone === "alert" ? "bg-error" : "bg-amber-400")} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-xs font-bold text-on-secondary-container">
          {initials(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-on-surface">{person.name}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                tone === "alert" ? "bg-error-container text-error" : "bg-amber-50 text-amber-800",
              )}
            >
              {personLeadLabel(person)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-on-surface-variant">
            {person.jabatanLabel || "Pegawai"}
            {person.unitName ? ` · ${person.unitName}` : ""}
          </p>
          <p className="mt-1 text-xs text-on-surface">{personInsight(person)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {person.overdueCount > 0 ? <Badge variant="tinggi">{person.overdueCount} terlambat</Badge> : null}
            {person.rejectedCount > 0 ? <Badge variant="ditolak">{person.rejectedCount} ditolak</Badge> : null}
            {person.reviewStaleCount > 0 ? (
              <Badge variant="menunggu_approval">{person.reviewStaleCount} review</Badge>
            ) : null}
            {person.lowScoreCount > 0 ? <Badge variant="warning">{person.lowScoreCount} nilai rendah</Badge> : null}
            {person.isOverloaded ? <Badge variant="warning">Beban tinggi</Badge> : null}
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-outline transition-transform duration-300 ease-out motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      <Collapse open={open}>
        <div className="space-y-2 border-t border-outline-variant p-3">
          {person.reviewStaleCount > 0 && person.canReview ? (
            <Link href="/pimpinan/persetujuan" className="text-xs font-semibold text-secondary hover:underline">
              Buka antrian persetujuan
            </Link>
          ) : null}
          <TaskReportList
            tasks={tasks}
            showAssignee={false}
            emptyText={
              person.isIdle
                ? `Tidak ada tugas berjalan. Idle ${person.idleDays ?? MONITOR_IDLE_DAYS} hari.`
                : "Tidak ada tugas pada filter ini."
            }
          />
        </div>
      </Collapse>
    </div>
  );
}

function personLeadLabel(person: MonitorPerson) {
  if (person.overdueCount > 0) return "Terlambat";
  if (person.rejectedCount > 0) return "Ditolak";
  if (person.isIdle) return "Idle";
  if (person.reviewStaleCount > 0) return "Review";
  if (person.lowScoreCount > 0) return "Nilai rendah";
  if (person.isOverloaded) return "Beban tinggi";
  return "Perlu perhatian";
}

function personInsight(person: MonitorPerson) {
  const parts = [
    person.overdueCount ? `${person.overdueCount} terlambat` : null,
    person.rejectedCount ? `${person.rejectedCount} ditolak` : null,
    person.reviewStaleCount ? `${person.reviewStaleCount} menunggu review` : null,
    person.lowScoreCount ? `${person.lowScoreCount} di bawah ekspektasi` : null,
    person.isIdle
      ? person.lastCompletedAt
        ? `Idle sejak ${formatRelativeTime(person.lastCompletedAt)}`
        : "Belum ada tugas selesai"
      : null,
    person.isOverloaded ? `${person.openCount} tugas terbuka` : null,
  ].filter(Boolean);
  return parts.join(" · ") || `${person.openCount} tugas terbuka`;
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
