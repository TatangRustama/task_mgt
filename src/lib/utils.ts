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
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
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

export function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isISODate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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
