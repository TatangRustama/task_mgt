"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setActiveKapasitas } from "@/app/actions/kapasitas";

type ScopeOption = {
  id: string;
  label: string;
};

export function JabatanSwitcher({
  scopes,
  activeId,
}: {
  scopes: ScopeOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(activeId);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setValue(activeId);
  }, [activeId]);

  async function onChange(next: string) {
    if (next === value) return;
    setValue(next);
    setPending(true);
    try {
      await setActiveKapasitas(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="print:hidden">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 md:px-6">
        <label htmlFor="jabatan-aktif" className="mb-1 block text-xs font-semibold text-on-surface-variant">
          Jabatan
        </label>
        <select
          id="jabatan-aktif"
          value={value}
          disabled={pending}
          onChange={(event) => void onChange(event.target.value)}
          className="box-border flex h-11 w-full max-w-xl rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm font-medium text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60"
        >
          {scopes.map((scope) => (
            <option key={scope.id} value={scope.id}>
              {scope.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
