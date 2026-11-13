import {
  Home,
  Users,
  ClipboardList,
  BarChart3,
  ListChecks,
  Network,
  UserCheck,
  MessageSquareText,
  KeyRound,
  RefreshCw,
  UserPlus,
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
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
];

const administrasiNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/admin/pegawai", label: "Pegawai", icon: Users },
  { href: "/admin/unit", label: "Unit Organisasi", icon: Network },
  { href: "/admin/monitoring", label: "Monitoring", icon: ListChecks },
  { href: "/admin/kepatuhan", label: "Kepatuhan", icon: UserCheck },
];

const pengaturanNavItems: AppNavItem[] = [
  { href: "/admin", label: "Pengguna", icon: UserPlus },
  { href: "/setting/pesan", label: "Pesan Teks", icon: MessageSquareText },
  { href: "/setting/api", label: "API Eksternal", icon: KeyRound },
  { href: "/setting/simpeg", label: "Sinkron SIMPEG", icon: RefreshCw },
];

function personalGroups(options?: NavOptions): AppNavGroup[] {
  const items = options?.isLeader ? [...leaderNavItems] : [...staffNavItems];
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

  // Footer bar hanya menampilkan menu Home, Board, Kinerja, dan Laporan.
  // Menu Administrasi dan Pengaturan hanya ada pada sidebar.
  if (options?.surface === "footer") {
    if (resolved !== "personal") {
      return [];
    }
    return personalGroups(options);
  }

  if (resolved === "personal") {
    const groups: AppNavGroup[] = personalGroups(options);
    if (options?.superAdmin) {
      groups.push({ id: "administrasi", label: "ADMINISTRASI", items: administrasiNavItems });
      groups.push({ id: "pengaturan", label: "PENGATURAN", items: pengaturanNavItems });
    } else if (options?.opdAdmin) {
      groups.push({ id: "administrasi", label: "ADMINISTRASI", items: administrasiNavItems });
    }
    return groups;
  }

  if (resolved === "super_admin") {
    return [
      { id: "administrasi", label: "ADMINISTRASI", items: administrasiNavItems },
      { id: "pengaturan", label: "PENGATURAN", items: pengaturanNavItems },
    ];
  }

  if (resolved === "admin") {
    return [{ id: "administrasi", label: "ADMINISTRASI", items: administrasiNavItems }];
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
