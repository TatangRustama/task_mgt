"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DashboardMonthPoint,
  type DashboardStatus,
  type TaskConditionTrend,
} from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

const SERIES: { status: DashboardStatus; label: string; bar: string; stroke: string; swatch: string }[] = [
  { status: "disetujui", label: "Disetujui", bar: "fill-emerald-600", stroke: "#059669", swatch: "bg-emerald-600" },
  { status: "menunggu_approval", label: "Menunggu approval", bar: "fill-amber-500", stroke: "#f59e0b", swatch: "bg-amber-500" },
  { status: "dikerjakan", label: "Dikerjakan", bar: "fill-primary", stroke: "var(--primary)", swatch: "bg-primary" },
  { status: "tersedia", label: "Tersedia", bar: "fill-secondary", stroke: "var(--secondary)", swatch: "bg-secondary" },
  { status: "ditolak", label: "Ditolak", bar: "fill-error", stroke: "var(--error)", swatch: "bg-error" },
  { status: "dibatalkan", label: "Dibatalkan", bar: "fill-violet-400", stroke: "#a78bfa", swatch: "bg-violet-400" },
];

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 32 };

function niceMax(value: number) {
  if (value <= 4) return Math.max(value, 1);
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 2 ? 0.5 : scaled <= 5 ? 1 : 2;
  return Math.ceil(scaled / step) * step * power;
}

function chartFrame(months: DashboardMonthPoint[]) {
  const max = niceMax(Math.max(...months.map((month) => month.total), 0));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / months.length;
  return { max, innerW, innerH, slot };
}

function yFor(value: number, max: number, innerH: number) {
  return PAD.top + innerH - (value / max) * innerH;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {SERIES.map((series) => (
        <span key={series.status} className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant">
          <span className={cn("h-2 w-2 rounded-full", series.swatch)} />
          {series.label}
        </span>
      ))}
    </div>
  );
}

function Axis({ max, innerH }: { max: number; innerH: number }) {
  const ticks = [0, max / 2, max];
  return (
    <>
      {ticks.map((tick) => {
        const y = yFor(tick, max, innerH);
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              className="stroke-outline-variant"
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" className="fill-on-surface-variant text-[10px]">
              {Math.round(tick)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function MonthLabels({ months, slot }: { months: DashboardMonthPoint[]; slot: number }) {
  return (
    <>
      {months.map((month, index) => (
        <text
          key={month.label}
          x={PAD.left + index * slot + slot / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="fill-on-surface-variant text-[11px]"
        >
          {month.label}
        </text>
      ))}
    </>
  );
}

function ActiveSummary({ month }: { month: DashboardMonthPoint | null }) {
  if (!month) return <p className="text-xs text-on-surface-variant">Arahkan ke bulan untuk melihat rincian status.</p>;
  return (
    <p className="text-xs text-on-surface">
      <span className="font-semibold">{month.label}</span>
      <span className="text-on-surface-variant"> · {month.total} tugas</span>
      {SERIES.map((series) => (
        <span key={series.status} className="text-on-surface-variant">
          {" "}
          · {series.label} {month.counts[series.status]}
        </span>
      ))}
    </p>
  );
}

export function TaskConditionCharts({ trend }: { trend: TaskConditionTrend }) {
  const [active, setActive] = useState<number | null>(null);
  const { months } = trend;
  const frame = chartFrame(months);
  const activeMonth = active == null ? null : months[active];
  const period = months.map((month) => month.label).join(", ");

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Komposisi status per bulan</CardTitle>
          <Legend />
        </CardHeader>
        <CardContent className="space-y-2 pb-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Grafik batang bertumpuk kondisi tugas ${period}`}
          >
            <Axis max={frame.max} innerH={frame.innerH} />
            {months.map((month, index) => {
              const barW = frame.slot * 0.56;
              const x = PAD.left + index * frame.slot + (frame.slot - barW) / 2;
              let cursor = PAD.top + frame.innerH;
              return (
                <g key={month.label} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
                  <rect
                    x={PAD.left + index * frame.slot}
                    y={PAD.top}
                    width={frame.slot}
                    height={frame.innerH}
                    fill="transparent"
                  />
                  {SERIES.map((series) => {
                    const count = month.counts[series.status];
                    const height = count === 0 ? 0 : (count / frame.max) * frame.innerH;
                    cursor -= height;
                    if (height <= 0) return null;
                    return (
                      <rect
                        key={series.status}
                        x={x}
                        y={cursor}
                        width={barW}
                        height={height}
                        rx={height > 6 ? 2 : 0}
                        className={series.bar}
                      >
                        <title>{`${month.label}: ${series.label} ${count}`}</title>
                      </rect>
                    );
                  })}
                </g>
              );
            })}
            <MonthLabels months={months} slot={frame.slot} />
          </svg>
          <ActiveSummary month={activeMonth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Tren kondisi tugas</CardTitle>
          <Legend />
        </CardHeader>
        <CardContent className="space-y-2 pb-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Grafik garis tren kondisi tugas ${period}`}
          >
            <Axis max={frame.max} innerH={frame.innerH} />
            {active != null ? (
              <line
                x1={PAD.left + active * frame.slot + frame.slot / 2}
                x2={PAD.left + active * frame.slot + frame.slot / 2}
                y1={PAD.top}
                y2={PAD.top + frame.innerH}
                className="stroke-outline"
                strokeDasharray="3 3"
              />
            ) : null}
            {SERIES.map((series) => {
              const points = months.map((month, index) => {
                const x = PAD.left + index * frame.slot + frame.slot / 2;
                const y = yFor(month.counts[series.status], frame.max, frame.innerH);
                return `${index === 0 ? "M" : "L"} ${x} ${y}`;
              });
              return (
                <g key={series.status}>
                  <path d={points.join(" ")} fill="none" stroke={series.stroke} strokeWidth={2} strokeLinejoin="round" />
                  {months.map((month, index) => (
                    <circle
                      key={month.label}
                      cx={PAD.left + index * frame.slot + frame.slot / 2}
                      cy={yFor(month.counts[series.status], frame.max, frame.innerH)}
                      r={active === index ? 4 : 2.5}
                      fill={series.stroke}
                    >
                      <title>{`${month.label}: ${series.label} ${month.counts[series.status]}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
            {months.map((month, index) => (
              <rect
                key={month.label}
                x={PAD.left + index * frame.slot}
                y={PAD.top}
                width={frame.slot}
                height={frame.innerH}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
            <MonthLabels months={months} slot={frame.slot} />
          </svg>
          <ActiveSummary month={activeMonth} />
        </CardContent>
      </Card>
    </div>
  );
}
