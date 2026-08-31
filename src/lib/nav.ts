import {
  Home,
  Users,
  ClipboardList,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@prisma/client";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

export const appNavItems: AppNavItem[] = [
  { href: "/mandiri", label: "Home", icon: Home },
  { href: "/board", label: "Board", icon: ClipboardList },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/pimpinan", label: "Kinerja", icon: Users, roles: ["pimpinan", "admin"] },
];

export function getNavItems(role: Role) {
  return appNavItems.filter((item) => !item.roles || item.roles.includes(role));
}

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
