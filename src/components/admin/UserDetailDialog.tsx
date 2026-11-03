"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { AppLoader } from "@/components/layout/AppLoader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayJabatan } from "@/lib/jabatan-display";
import { OpdUnitPicker } from "@/components/admin/OpdUnitPicker";
import { isStaffLoginIdentifier } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";

const selectClassName =
  "flex h-11 w-full rounded-lg border border-outline-variant px-3 text-sm focus-visible:outline-none focus-visible:border-primary-container focus-visible:ring-1 focus-visible:ring-primary-container";

type UserRole = "super_admin" | "admin" | "personal";
type Panel = "detail" | "edit" | "password" | "delete";

type OpdScope = {
  perangkatDaerah: { id: string; name: string };
  chain: string[];
};

export type UserDetail = {
  id: string;
  name: string;
  email: string;
  nip: string;
  role: UserRole;
  opdAdmin: boolean;
  superAdmin: boolean;
  opdUnitId: string | null;
  opdUnit: { id: string; name: string } | null;
  jabatan: "kepala_kantor" | "kepala_bidang" | "kepala_sub_bidang" | "pelaksana" | null;
  createdAt: string;
  updatedAt: string;
  unit: { id: string; name: string } | null;
  pegawai: {
    id: string;
    jenis: "asn" | "non_asn";
    nip: string | null;
    nik: string | null;
    jabatanNama: string | null;
    unorId: string | null;
    unorNama: string | null;
    perangkatDaerahId: string | null;
    perangkatDaerahNama: string | null;
  } | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value || "-"}</p>
    </div>
  );
}

export function UserDetailDialog({
  userId,
  open,
  onOpenChange,
  onChanged,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (message: string) => void;
}) {
  const [panel, setPanel] = useState<Panel>("detail");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [role, setRole] = useState<UserRole>("personal");
  const [opdAdmin, setOpdAdmin] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [opdUnitId, setOpdUnitId] = useState("");
  const [opdScope, setOpdScope] = useState<OpdScope | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isPersonal = role === "personal";

  useEffect(() => {
    if (!open || !userId) {
      setPanel("detail");
      setDetail(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setPanel("detail");
    fetch(`/api/admin/${userId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Gagal memuat detail pengguna");
          setDetail(null);
          return;
        }
        setDetail(data.user);
        setOpdScope(data.opdScope ?? null);
        setIsSelf(Boolean(data.isSelf));
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat detail pengguna");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  function startEdit() {
    if (!detail) return;
    setRole(detail.role);
    setOpdAdmin(detail.opdAdmin);
    setSuperAdmin(detail.superAdmin);
    setOpdUnitId(detail.opdUnitId || opdScope?.chain.at(-1) || "");
    setError("");
    setPanel("edit");
  }

  function startPassword() {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setPanel("password");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const grantOpd = role === "personal" && opdAdmin;
    const grantSuper = role === "personal" && superAdmin;
    if (grantOpd && !grantSuper && !opdUnitId) {
      setError("Pilih unit organisasi yang dikelola");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: detail.name,
        role,
        username: detail.nip,
        opdAdmin: grantOpd,
        superAdmin: grantSuper,
        opdUnitId: grantOpd && !grantSuper ? opdUnitId : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan perubahan");
      return;
    }
    setDetail(data.user);
    setOpdScope(data.opdScope ?? null);
    setIsSelf(Boolean(data.isSelf));
    setPanel("detail");
    onChanged("Data pengguna berhasil diperbarui");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal mereset password");
      return;
    }
    setPanel("detail");
    onChanged("Password berhasil direset");
  }

  async function confirmDelete() {
    if (!detail) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/${detail.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menghapus pengguna");
      return;
    }
    onOpenChange(false);
    onChanged("Pengguna berhasil dihapus");
  }

  const showLoader = Boolean(open && (loading || (!detail && !error)));

  return (
    <>
      {showLoader ? <AppLoader label="Memuat detail" /> : null}
      {showLoader ? null : (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>
            {panel === "edit"
              ? "Edit pengguna"
              : panel === "password"
                ? "Reset password"
                : panel === "delete"
                  ? "Hapus pengguna?"
                  : "Detail pengguna"}
          </DialogTitle>
        </DialogHeader>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        {!loading && detail && panel === "detail" ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <Field label="Nama" value={detail.name} />
              <Field label="NIP" value={detail.nip} />
              <Field label="Jabatan" value={displayJabatan(detail.pegawai, detail.jabatan)} />
              <Field label="Unit Organisasi" value={detail.pegawai?.unorNama || detail.unit?.name || "-"} />
              <Field label="Perangkat Daerah" value={detail.pegawai?.perangkatDaerahNama || "-"} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dibuat" value={formatDateTime(detail.createdAt)} />
                <Field label="Diperbarui" value={formatDateTime(detail.updatedAt)} />
              </div>
            </div>
            <div className="space-y-2">
              <Button type="button" variant="secondary" className="w-full" onClick={startPassword}>
                <KeyRound className="h-4 w-4" />
                Reset password
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={isSelf}
                  onClick={() => {
                    setError("");
                    setPanel("delete");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </div>
            {isSelf ? (
              <p className="text-xs text-on-surface-variant">Akun yang sedang digunakan tidak dapat dihapus.</p>
            ) : null}
          </div>
        ) : null}

        {!loading && detail && panel === "edit" ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-3">
              <Field label="Nama lengkap" value={detail.name} />
              <Field label={isPersonal ? "NIP / NIK" : "Username"} value={detail.nip} />
            </div>
            {isStaffLoginIdentifier(detail.nip) && detail.role === "personal" ? (
              <>
              <label className="flex items-start gap-3 rounded-lg border border-outline-variant px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={superAdmin}
                  onChange={(event) => setSuperAdmin(event.target.checked)}
                />
                <span>
                  <span className="font-medium text-on-surface">Super Admin</span>
                  <span className="mt-1 block text-on-surface-variant">
                    Menambahkan role Super Admin pada NIP ini. Menu pengguna di footer, Super Admin di sidebar.
                  </span>
                </span>
              </label>
              <div className="rounded-lg border border-outline-variant text-sm">
                <label className="flex items-start gap-3 px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={opdAdmin}
                    onChange={(event) => setOpdAdmin(event.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-on-surface">Admin OPD</span>
                    <span className="mt-1 block text-on-surface-variant">
                      Menambahkan role Admin OPD pada NIP ini. Menu pengguna di footer, Admin OPD di sidebar.
                    </span>
                  </span>
                </label>
                {opdAdmin && !superAdmin && opdScope ? (
                  <div className="border-t border-outline-variant px-3 py-3">
                    <OpdUnitPicker
                      key={opdScope.chain.join("|")}
                      perangkatDaerah={opdScope.perangkatDaerah}
                      initialChain={opdScope.chain}
                      onChange={setOpdUnitId}
                    />
                  </div>
                ) : null}
                {opdAdmin && !superAdmin && !opdScope ? (
                  <p className="border-t border-outline-variant px-3 py-3 text-sm text-error">
                    Perangkat daerah pegawai belum tersedia, jadi role Admin OPD belum bisa disimpan.
                  </p>
                ) : null}
              </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  className={selectClassName}
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin OPD</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        ) : null}

        {!loading && detail && panel === "password" ? (
          <form onSubmit={savePassword} className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Password baru untuk {detail.name}. Minimal 6 karakter.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Password baru</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Konfirmasi password</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Menyimpan..." : "Reset password"}
              </Button>
            </div>
          </form>
        ) : null}

        {!loading && detail && panel === "delete" ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Akun {detail.name} ({detail.nip}) akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setPanel("detail")}>
                Batal
              </Button>
              <Button type="button" variant="destructive" className="flex-1" disabled={saving} onClick={confirmDelete}>
                {saving ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
      )}
    </>
  );
}
