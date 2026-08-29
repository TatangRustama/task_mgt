import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
} from "lucide-react";
import { formatLongDate } from "@/lib/utils";

type PerformanceBannerProps = {
  firstName: string;
  unitName: string | null;
  completedWeek: number;
  pending: number;
  completedTotal: number;
  overdue: number;
  dueToday: number;
  awaitingReview: number;
};

function greetingByHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function insightText({
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

function CapaianRing({ percent }: { percent: number }) {
  const size = 108;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative h-[108px] w-[108px] shrink-0 text-white"
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
        <span className="text-[22px] font-bold leading-none tracking-tight text-white">{percent}%</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          Capaian
        </span>
      </div>
    </div>
  );
}

export function PerformanceBanner({
  firstName,
  unitName,
  completedWeek,
  pending,
  completedTotal,
  overdue,
  dueToday,
  awaitingReview,
}: PerformanceBannerProps) {
  const activeTotal = completedTotal + pending;
  const percent = activeTotal === 0 ? 0 : Math.round((completedTotal / activeTotal) * 100);
  const doneShare = activeTotal === 0 ? 0 : (completedTotal / activeTotal) * 100;
  const today = new Date();

  const stats = [
    { label: "Minggu ini", value: completedWeek, icon: CalendarDays },
    { label: "Pending", value: pending, icon: Clock3 },
    { label: "Selesai", value: completedTotal, icon: CheckCircle2 },
  ];

  const chips = [
    dueToday > 0 && {
      icon: CalendarClock,
      label: `${dueToday} tempo hari ini`,
    },
    awaitingReview > 0 && {
      icon: ClipboardCheck,
      label: `${awaitingReview} review`,
    },
  ].filter(Boolean) as { icon: typeof CalendarClock; label: string }[];

  return (
    <section className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-[#c17a42] via-[#9a5524] to-[#5c3214] p-5 text-white shadow-md md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-8 h-52 w-52 rounded-full bg-secondary-navy/35 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-8 h-28 w-28 rounded-full border border-white/20" />
      <div className="pointer-events-none absolute right-24 top-20 h-16 w-16 rounded-full border border-white/12" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 md:text-xs">
            {formatLongDate(today)}
          </p>
          <h2 className="mt-1 text-[26px] font-bold leading-8 tracking-tight text-white md:text-[32px] md:leading-10">
            Halo, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-white/85 md:text-base">
            {greetingByHour(today)} · Ringkasan kinerja hari ini
          </p>
          {unitName ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/25">
                {unitName}
              </span>
            </div>
          ) : null}
        </div>
        <CapaianRing percent={percent} />
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 md:gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg bg-white/12 px-2.5 py-3 ring-1 ring-white/25 backdrop-blur-[2px] md:px-3"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-white/80">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider md:text-[11px]">
                {label}
              </p>
            </div>
            <p className="text-[26px] font-bold leading-7 tracking-tight text-white md:text-[30px] md:leading-8">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-3">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/20">
          <span className="h-full rounded-full bg-white" style={{ width: `${doneShare}%` }} />
        </div>
        <p className="mt-2 text-[12px] leading-5 text-white/85">
          {insightText({ overdue, dueToday, awaitingReview, pending })}
        </p>
      </div>

      <div className="relative z-10 mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25"
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        ) : null}
        <Link
          href="/board"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#6b3818] shadow-sm transition hover:bg-white/90 active:scale-95 sm:ml-auto sm:self-auto"
        >
          Lihat detail tugas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
