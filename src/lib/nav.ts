import {
  Home,
  Users,
  ClipboardList,
  BarChart3,
  UserPlus,
  Settings,
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
  { href: "/pegawai", label: "Pegawai", icon: Users },
];

const superAdminNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin", label: "Pengguna", icon: UserPlus },
  { href: "/setting", label: "Setting", icon: Settings },
];

export function getNavGroups(role: Role, options?: NavOptions): AppNavGroup[] {
  const resolved = coerceRole(role);
  if (resolved === "super_admin") {
    return [{ id: "super_admin", label: "Super Admin", items: superAdminNavItems }];
  }
  if (resolved === "admin") {
    return [{ id: "admin", label: null, items: adminNavItems }];
  }
  return [
    {
      id: "personal",
      label: null,
      items: options?.isLeader ? leaderNavItems : staffNavItems,
    },
  ];
}

export function getNavItems(role: Role, options?: NavOptions) {
  return getNavGroups(role, options).flatMap((group) => group.items);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
