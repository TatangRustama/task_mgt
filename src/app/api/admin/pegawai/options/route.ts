import { NextResponse } from "next/server";
import { formatGolonganPangkat } from "@/lib/golongan";
import { listGolonganOptions, listPerangkatDaerah } from "@/lib/admin-pegawai";
import { getAdminScope, pegawaiInScopeWhere, perangkatDaerahIdsForScope } from "@/lib/admin-scope";
import { requireUser } from "@/lib/session";

export async function GET() {
  const actor = await requireUser(["super_admin", "admin"]);
  const scope = await getAdminScope(actor);
  const [golongan, perangkatDaerah, allowed] = await Promise.all([
    listGolonganOptions(pegawaiInScopeWhere(scope)),
    listPerangkatDaerah(),
    perangkatDaerahIdsForScope(scope),
  ]);
  return NextResponse.json({
    golongan: golongan.map((value) => ({
      value,
      label: formatGolonganPangkat(value),
    })),
    perangkatDaerah: allowed ? perangkatDaerah.filter((item) => allowed.has(item.id)) : perangkatDaerah,
  });
}
