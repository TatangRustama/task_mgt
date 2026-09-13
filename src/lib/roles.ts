import { Role } from "@prisma/client";

const ROLE_VALUES: Role[] = ["super_admin", "admin", "personal"];

export function coerceRole(role: string | Role | null | undefined): Role {
  if (role === "pimpinan" || role === "pegawai") return "personal";
  if (role && ROLE_VALUES.includes(role as Role)) return role as Role;
  return "personal";
}

export const roleLabel: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin OPD",
  personal: "Personal",
};

export const USER_PAGE_SIZES = [10, 25, 50] as const;
export const USER_MAX_PAGE_SIZE = 50;

export function parseUserPageSize(raw: string | null | undefined) {
  const n = Number(raw);
  if (USER_PAGE_SIZES.includes(n as (typeof USER_PAGE_SIZES)[number])) return n;
  if (Number.isFinite(n) && n > 0) {
    return Math.min(USER_MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
  }
  return USER_PAGE_SIZES[0];
}

export function isSuperAdmin(role: Role) {
  return coerceRole(role) === "super_admin";
}

export function isAppAdmin(role: Role) {
  return coerceRole(role) === "admin";
}

export function isPersonal(role: Role) {
  return coerceRole(role) === "personal";
}

export function isStaffLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed || trimmed.includes("@")) return false;
  return /^\d+$/.test(trimmed.replace(/\D/g, "")) && /^\d[\d.\s-]*$/.test(trimmed);
}

export function privilegedUsername(username: string) {
  return username.trim().toLowerCase();
}

export function privilegedEmail(username: string) {
  const key = privilegedUsername(username);
  return key.includes("@") ? key : `${key}@kinerja.local`;
}

export function canAccessAllFeatures(role: Role) {
  return isSuperAdmin(role);
}

export function canManageOrg(role: Role) {
  return isSuperAdmin(role);
}

export function canManageNonAsn(role: Role) {
  const value = coerceRole(role);
  return value === "super_admin" || value === "admin";
}

export function canUseEmployeeApp(role: Role) {
  return coerceRole(role) === "personal";
}

export function canSyncSimpeg(role: Role) {
  return isSuperAdmin(role);
}

export function isPrivilegedRole(role: Role) {
  const value = coerceRole(role);
  return value === "super_admin" || value === "admin";
}

export function hasAllowedRole(userRole: Role, allowed: Role[]) {
  return allowed.includes(coerceRole(userRole));
}

export function defaultHomePath(role: Role) {
  const value = coerceRole(role);
  if (value === "super_admin") return "/dashboard";
  if (value === "admin") return "/pegawai";
  return "/mandiri";
}
