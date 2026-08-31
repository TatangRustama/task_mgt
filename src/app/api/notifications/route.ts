import { NextResponse } from "next/server";
import { getUserNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getUserNotifications(user.id, user.role);
  return NextResponse.json(data);
}
