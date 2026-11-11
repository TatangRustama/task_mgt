import { NextResponse } from "next/server";
import { getDailyReport, getMonthlyCalendar } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";
import { formatISODate, isISODate, parseISODate } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") === "bulanan" ? "bulanan" : "harian";
  const today = formatISODate(new Date());
  const dateParam = searchParams.get("date") || undefined;
  const date = isISODate(dateParam) ? dateParam : today;
  const selected = parseISODate(date);
  const month = Number(searchParams.get("month") || selected.getMonth() + 1);
  const year = Number(searchParams.get("year") || selected.getFullYear());
  const assigneeId = searchParams.get("assigneeId") || undefined;

  const scope = {
    role: user.role,
    userId: user.id,
    unitId: user.unitId,
    assigneeId,
  };

  const data =
    view === "bulanan"
      ? await getMonthlyCalendar({ ...scope, month, year })
      : await getDailyReport({ ...scope, date });

  if (!data) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
  }

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  if (view === "harian" && (pageParam || limitParam)) {
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || "10", 10) || 10));
    const totalItems = data.tasks.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pagedTasks = data.tasks.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ...data,
      tasks: pagedTasks,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  }

  return NextResponse.json(data);
}
