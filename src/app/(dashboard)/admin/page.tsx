"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserDetailDialog } from "@/components/admin/UserDetailDialog";
import { roleLabel, USER_PAGE_SIZES } from "@/lib/roles";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

type UserRole = "super_admin" | "admin" | "personal";
type RoleFilter = "all" | UserRole;

type UserRow = {
  id: string;
  name: string;
  email: string;
  nip: string;
  role: UserRole;
  pegawai?: { nik: string | null; nip: string | null } | null;
};

function loginId(user: UserRow) {
  if (user.role === "personal") {
    return user.pegawai?.nik && user.pegawai.nik !== user.nip
      ? `${user.nip} · NIK ${user.pegawai.nik}`
      : user.nip;
  }
  return user.nip;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(USER_PAGE_SIZES[0]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const isPersonal = role === "personal";

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) params.set("q", query);
    if (roleFilter !== "all") params.set("role", roleFilter);
    const res = await fetch(`/api/admin?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (typeof data.page === "number" && data.page !== page) {
        setPage(data.page);
      }
      if (typeof data.pageSize === "number" && data.pageSize !== pageSize) {
        setPageSize(data.pageSize);
      }
    }
    setLoading(false);
  }, [page, pageSize, query, roleFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setQuery((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        username: formData.get("username"),
        password: formData.get("password"),
        role,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "User berhasil dibuat" : data.error || "Gagal membuat user");
    if (res.ok) {
      form.reset();
      setRole("admin");
      setPage(1);
      loadData();
    }
  }

  return (
    <PageMain className="max-w-4xl space-y-4">
      <PageHeader
        title="Manajemen pengguna"
        subtitle="Tambah akun baru dan pilih role. Pegawai personal login dengan NIP/NIK; super admin/admin login dengan username."
      />
      {message ? (
        <p className="rounded-lg bg-secondary-container px-4 py-2 text-sm text-on-secondary-container">{message}</p>
      ) : null}

      <Card>
        <CardHeader className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left"
            aria-expanded={formOpen}
            aria-controls="tambah-user-form"
            onClick={() => setFormOpen((open) => !open)}
          >
            <CardTitle className="text-base">Tambah user</CardTitle>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-on-surface-variant transition-transform",
                formOpen && "rotate-180",
              )}
            />
          </button>
        </CardHeader>
        {formOpen ? (
          <CardContent id="tambah-user-form">
            <form onSubmit={createUser} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nama lengkap</Label>
                <Input id="name" name="name" required placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className={selectClassName}
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin OPD</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{isPersonal ? "NIP / NIK" : "Username"}</Label>
                <Input
                  id="username"
                  name="username"
                  required
                  placeholder={isPersonal ? "Contoh: 199203032019012003" : "Contoh: superadmin"}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                  defaultValue="password123"
                />
              </div>
              <Button type="submit">Simpan user</Button>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar pengguna ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-search">Cari NIP / NIK / username</Label>
              <Input
                id="user-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Masukkan NIP, NIK, atau username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-filter">Filter role</Label>
              <select
                id="role-filter"
                className={selectClassName}
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as RoleFilter);
                  setPage(1);
                }}
              >
                <option value="all">Semua role</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin OPD</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="whitespace-nowrap">
                Tampilkan
              </Label>
              <select
                id="page-size"
                className={`${selectClassName} h-9 w-24`}
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {USER_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-on-surface-variant">per halaman</span>
            </div>
            <p className="text-on-surface-variant">
              Halaman {page} dari {totalPages}
            </p>
          </div>

          {loading && users.length === 0 ? (
            <p className="text-on-surface-variant">Memuat pengguna...</p>
          ) : users.length === 0 ? (
            <p className="text-on-surface-variant">Tidak ada pengguna yang cocok.</p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className="w-full rounded-lg border border-surface-container-highest bg-surface-container-low p-3 text-left transition hover:border-primary-container hover:bg-surface-container"
              >
                <p className="font-medium text-on-surface">{user.name}</p>
                <p className="text-on-surface-variant">
                  {roleLabel[user.role]} · {loginId(user)}
                </p>
              </button>
            ))
          )}

          <PageNumbers page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
        </CardContent>
      </Card>

      <UserDetailDialog
        userId={selectedUserId}
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
        onChanged={(text) => {
          setMessage(text);
          loadData();
        }}
      />
    </PageMain>
  );
}

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const marks = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    marks.add(2);
    marks.add(3);
    marks.add(4);
  }
  if (current >= total - 2) {
    marks.add(total - 1);
    marks.add(total - 2);
    marks.add(total - 3);
  }

  const nums = [...marks].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < nums.length; i += 1) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("ellipsis");
    out.push(nums[i]);
  }
  return out;
}

function PageNumbers({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-nowrap items-center justify-center gap-1 overflow-x-auto"
      aria-label="Halaman pengguna"
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {visiblePages(page, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span key={`e-${index}`} className="shrink-0 px-1 text-on-surface-variant">
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={item === page ? "default" : "outline"}
            className="h-8 min-w-8 shrink-0 px-2"
            disabled={disabled}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Berikutnya"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
