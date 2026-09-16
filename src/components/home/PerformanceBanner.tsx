import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Inbox,
} from "lucide-react";
import { formatLongDate } from "@/lib/utils";

type PerformanceBannerProps = {
  firstName: string;
  unitName: string | null;
  isLeader?: boolean;
  completedWeek: number;
  pending: number;
  completedTotal: number;
  overdue: number;
  dueToday: number;
  awaitingReview: number;
  awaitingMyReview?: number;
  staleReview?: number;
  unpickedPool?: number;
  reportOverdue?: number;
};

function greetingByHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function staffInsight({
  overdue,
  dueToday,
  awaitingReview,
  pending,
}: Pick<PerformanceBannerProps, "overdue" | "dueToday" | "awaitingReview" | "pending">) {
  if (overdue > 0) return `${overdue} tugas melewati tenggat — prioritas hari ini.`;
  if (dueToday > 0) return `${dueToday} tugas jatuh tempo hari ini.`;
  if (awaitingReview > 0) return `${awaitingReview} tugas menunggu persetujuan.`;
  if (pending > 0) return `${pending} tugas masih berjalan. Tetap konsisten.`;
  return "Semua tugas terkelola dengan baik. Pertahankan ritme ini.";
}

function leaderInsight({
  awaitingMyReview,
  staleReview,
  reportOverdue,
  unpickedPool,
}: {
  awaitingMyReview: number;
  staleReview: number;
  reportOverdue: number;
  unpickedPool: number;
}) {
  const parts = [
    awaitingMyReview ? `${awaitingMyReview} menunggu persetujuan` : null,
    staleReview ? `${staleReview} review >24 jam` : null,
    reportOverdue ? `${reportOverdue} terlambat di bawahan` : null,
    unpickedPool ? `${unpickedPool} kolam belum diambil` : null,
  ].filter(Boolean);
  if (parts.length === 0) return "Antrian Anda kosong. Unit berjalan lancar.";
  return parts.join(" · ");
}

function CapaianRing({ percent }: { percent: number }) {
  const size = 80;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative h-20 w-20 shrink-0 text-white"
      aria-label={`Capaian ${percent} persen`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold leading-none tracking-tight text-white">{percent}%</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80">
          Capaian
        </span>
      </div>
    </div>
  );
}

export function PerformanceBanner({
  firstName,
  unitName,
  isLeader = false,
  completedWeek,
  pending,
  completedTotal,
  overdue,
  dueToday,
  awaitingReview,
  awaitingMyReview = 0,
  staleReview = 0,
  unpickedPool = 0,
  reportOverdue = 0,
}: PerformanceBannerProps) {
  const activeTotal = completedTotal + pending;
  const percent = activeTotal === 0 ? 0 : Math.round((completedTotal / activeTotal) * 100);
  const doneShare = activeTotal === 0 ? 0 : (completedTotal / activeTotal) * 100;
  const today = new Date();
  const leaderQueue = awaitingMyReview + staleReview + reportOverdue + unpickedPool;

  const staffStats = [
    { label: "Minggu ini", value: completedWeek, icon: CalendarDays },
    { label: "Pending", value: pending, icon: Clock3 },
    { label: "Selesai", value: completedTotal, icon: CheckCircle2 },
  ];
  const leaderStats = [
    { label: "Persetujuan", value: awaitingMyReview, icon: ClipboardCheck },
    { label: "Terlambat", value: reportOverdue, icon: CalendarClock },
    { label: "Kolam", value: unpickedPool, icon: Inbox },
  ];
  const stats = isLeader ? leaderStats : staffStats;

  const chips = isLeader
    ? ([
        staleReview > 0 && { icon: Clock3, label: `${staleReview} review lambat` },
        awaitingMyReview > 0 && { icon: ClipboardCheck, label: `${awaitingMyReview} antrian` },
      ].filter(Boolean) as { icon: typeof CalendarClock; label: string }[])
    : ([
        dueToday > 0 && { icon: CalendarClock, label: `${dueToday} tempo hari ini` },
        awaitingReview > 0 && { icon: ClipboardCheck, label: `${awaitingReview} review` },
      ].filter(Boolean) as { icon: typeof CalendarClock; label: string }[]);

  const ctaHref = isLeader ? (awaitingMyReview > 0 ? "/pimpinan/persetujuan" : "/pimpinan") : "/board";
  const ctaLabel = isLeader ? (awaitingMyReview > 0 ? "Buka persetujuan" : "Buka unit") : "Lihat detail tugas";

  return (
    <section className="relative mb-3 overflow-hidden rounded-lg border border-accent bg-primary p-3 text-white md:p-4">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 md:text-[11px]">
            {formatLongDate(today)}
          </p>
          <h2 className="mt-0.5 text-xl font-bold leading-6 tracking-tight text-white md:text-2xl md:leading-7">
            Halo, {firstName}!
          </h2>
          <p className="mt-0.5 text-xs text-white/85 md:text-sm">
            {greetingByHour(today)} · {isLeader ? "Antrian pimpinan hari ini" : "Ringkasan kinerja hari ini"}
          </p>
          {unitName ? (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="rounded-md border border-white/40 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                {unitName}
              </span>
            </div>
          ) : null}
        </div>
        {isLeader ? (
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-white/30 text-center">
            <span className="text-lg font-bold leading-none tracking-tight text-white">{leaderQueue}</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80">Antrian</span>
          </div>
        ) : (
          <CapaianRing percent={percent} />
        )}
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-1.5">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-md border border-white/35 bg-white/10 px-2 py-2 md:px-2.5"
          >
            <div className="mb-1 flex items-center gap-1 text-white/80">
              <Icon className="h-3 w-3 shrink-0" />
              <p className="truncate text-[9px] font-semibold uppercase tracking-wider md:text-[10px]">
                {label}
              </p>
            </div>
            <p className="text-xl font-bold leading-6 tracking-tight text-white md:text-2xl">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-2">
        {isLeader ? null : (
          <div className="flex h-1 overflow-hidden rounded-full bg-white/20">
            <span className="h-full rounded-full bg-white" style={{ width: `${doneShare}%` }} />
          </div>
        )}
        <p className={isLeader ? "text-[11px] leading-4 text-white/85" : "mt-1.5 text-[11px] leading-4 text-white/85"}>
          {isLeader
            ? leaderInsight({ awaitingMyReview, staleReview, reportOverdue, unpickedPool })
            : staffInsight({ overdue, dueToday, awaitingReview, pending })}
        </p>
      </div>

      <div className="relative z-10 mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {chips.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md border border-white/40 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        ) : null}
        <Link
          href={ctaHref}
          className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-white bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-white/90 active:scale-95 sm:ml-auto sm:self-auto"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
