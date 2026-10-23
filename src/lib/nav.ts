import {
  Archive,
  Home,
  Users,
  ClipboardList,
  BarChart3,
  UserPlus,
  Settings,
  ListChecks,
  Network,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@prisma/client";
import { coerceRole } from "@/lib/roles";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

export type AppNavGroup = {
  id: string;
  label: string | null;
  items: AppNavItem[];
};

export type NavOptions = {
  isLeader?: boolean;
  opdAdmin?: boolean;
  superAdmin?: boolean;
  surface?: "sidebar" | "footer";
};

const staffNavItems: AppNavItem[] = [
  { href: "/mandiri", label: "Home", icon: Home },
  { href: "/board", label: "Board", icon: ClipboardList },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
];

const leaderNavItems: AppNavItem[] = [
  { href: "/mandiri", label: "Home", icon: Home },
  { href: "/board", label: "Board", icon: ClipboardList },
  { href: "/pimpinan", label: "Kinerja", icon: Users },
];

const adminNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin/monitoring", label: "Monitoring", icon: ListChecks },
];

const superAdminNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin/unit", label: "Unit organisasi", icon: Network },
  { href: "/admin/monitoring", label: "Monitoring", icon: ListChecks },
  { href: "/admin", label: "Pengguna", icon: UserPlus },
  { href: "/setting", label: "Setting", icon: Settings },
];

function personalGroups(options?: NavOptions): AppNavGroup[] {
  const items = options?.isLeader ? [...leaderNavItems] : [...staffNavItems];
  if (options?.isLeader && options.surface === "footer") {
    items.push({ href: "/laporan", label: "Arsip", icon: Archive });
  }
  return [
    {
      id: "personal",
      label: null,
      items,
    },
  ];
}

export function getNavGroups(role: Role, options?: NavOptions): AppNavGroup[] {
  const resolved = coerceRole(role);
  if (options?.surface === "footer" && resolved === "personal") {
    return personalGroups(options);
  }
  if (resolved === "super_admin" || (resolved === "personal" && options?.superAdmin)) {
    return [{ id: "super_admin", label: "Super Admin", items: superAdminNavItems }];
  }
  if (resolved === "admin" || (resolved === "personal" && options?.opdAdmin)) {
    return [{ id: "admin", label: options?.opdAdmin ? "Admin OPD" : null, items: adminNavItems }];
  }
  return personalGroups(options);
}

export function getNavItems(role: Role, options?: NavOptions) {
  return getNavGroups(role, options).flatMap((group) => group.items);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
