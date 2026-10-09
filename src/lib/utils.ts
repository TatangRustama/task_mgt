import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNip(nip: string | null | undefined) {
  const digits = (nip || "").replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15)}`;
  }
  return (nip || "").trim() || "-";
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jayapura",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jayapura",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getMonthYearLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function isOverdue(deadline: Date | string | null | undefined) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

const REPORT_TIME_ZONE = "Asia/Jayapura";
const JAYAPURA_OFFSET_MS = 9 * 60 * 60 * 1000;

function reportDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
  };
}

export function formatISODate(date: Date) {
  const { year, month, day } = reportDateParts(date);
  return `${year}-${month}-${day}`;
}

export function reportDayRange(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - JAYAPURA_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function startOfReportDay(now = new Date()) {
  return reportDayRange(formatISODate(now)).start;
}

export function reportMonthRange(year: number, month: number) {
  const start = reportDayRange(`${year}-${String(month).padStart(2, "0")}-01`).start;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start,
    end: reportDayRange(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`).start,
  };
}

export function calendarDay(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return formatISODate(date);
}

export function completedOnReportDate(
  completedAt: string | Date | null | undefined,
  reportDate: string,
) {
  return calendarDay(completedAt) === reportDate;
}

export function isCompletedOnTime(
  completedAt: string | Date | null | undefined,
  deadline: string | Date | null | undefined,
) {
  if (!deadline) return true;
  if (!completedAt) return false;
  const done = calendarDay(completedAt);
  const due = calendarDay(deadline);
  if (!done || !due) return false;
  return done <= due;
}

export function isMultiDayDeadline(
  assignedAt: string | Date | null | undefined,
  createdAt: string | Date | null | undefined,
  deadline: string | Date | null | undefined,
) {
  const start = calendarDay(assignedAt || createdAt);
  const target = calendarDay(deadline);
  return Boolean(start && target && target > start);
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isISODate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function formatDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDateTimeLocal(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseFormDateInput(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (isISODate(raw)) return parseISODate(raw);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseAssignedAt(value: unknown): Date {
  return parseFormDateInput(value) ?? parseISODate(formatISODate(new Date()));
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return formatDate(date);
}

export function formatLongDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof date === "string" ? parseISODate(date) : date);
}

export function formatPrintedOnDate(date: Date = new Date()) {
  const label = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jayapura",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWfhReportDate(date: Date | string) {
  const value = typeof date === "string" ? parseISODate(date) : date;
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(value);
  const rest = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${label}/${rest}`;
}

export function formatWfhSignDate(date: Date | string) {
  const value = typeof date === "string" ? parseISODate(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    tersedia: "Tersedia",
    dikerjakan: "Dikerjakan",
    menunggu_approval: "Menunggu approval",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    dibatalkan: "Dibatalkan",
  };
  return labels[status] ?? status;
}

export const statusCardClass: Record<string, string> = {
  tersedia: "border-l-secondary bg-surface-container-lowest",
  dikerjakan: "border-l-primary-container bg-surface-container-lowest",
  menunggu_approval: "border-l-primary bg-surface-container-lowest",
  disetujui: "border-l-emerald-600 bg-surface-container-lowest",
  ditolak: "border-l-error bg-surface-container-lowest",
  dibatalkan: "border-l-tertiary-container bg-surface-container-lowest",
};

export const statusBarClass: Record<string, string> = {
  tersedia: "bg-secondary",
  dikerjakan: "bg-primary",
  menunggu_approval: "bg-accent",
  disetujui: "bg-emerald-600",
  ditolak: "bg-error",
  dibatalkan: "bg-tertiary-container",
};

export const priorityBarClass: Record<string, string> = {
  rendah: "bg-tertiary",
  sedang: "bg-primary-container",
  tinggi: "bg-error",
};
