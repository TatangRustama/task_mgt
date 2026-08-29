import { NextResponse } from "next/server";
import { getNewTasksFromAtasan } from "@/lib/org";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notices = await getNewTasksFromAtasan(user.id);
  return NextResponse.json(notices);
}
