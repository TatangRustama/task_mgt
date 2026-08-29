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
  { href: "/pimpinan", label: "Pimpinan", icon: Users, roles: ["pimpinan", "admin"] },
  { href: "/board", label: "Board", icon: ClipboardList },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
];

export function getNavItems(role: Role) {
  return appNavItems.filter((item) => !item.roles || item.roles.includes(role));
}

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
