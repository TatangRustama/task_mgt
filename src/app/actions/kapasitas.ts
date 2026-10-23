"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { KAPASITAS_COOKIE } from "@/lib/kapasitas";
import { getDbOrgUser, listLeadershipScopes } from "@/lib/org";
import { getCurrentUser } from "@/lib/session";

export async function setActiveKapasitas(scopeId: string) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return;
  const user = await getDbOrgUser(sessionUser.id);
  if (!user) return;
  const scopes = listLeadershipScopes(user);
  if (!scopes.some((scope) => scope.id === scopeId)) return;

  const store = await cookies();
  store.set(KAPASITAS_COOKIE, scopeId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
