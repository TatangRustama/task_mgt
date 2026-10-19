export const TASK_STAGE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "dikerjakan", label: "Dikerjakan" },
  { value: "selesai", label: "Telah selesai" },
] as const;

export type TaskStage = (typeof TASK_STAGE_OPTIONS)[number]["value"];

const DONE_STATUSES = new Set(["disetujui", "menunggu_approval"]);

// Assigned work can only be submitted from "dikerjakan" or "ditolak".
// "tersedia" is the unassigned pool state, so an assignee must not land there.
export function downgradedTaskStatus(task: {
  status: string;
  assignedToId?: string | null;
}): "dikerjakan" | "tersedia" | null {
  if (DONE_STATUSES.has(task.status)) return "dikerjakan";
  if (task.status === "ditolak") return task.assignedToId ? "dikerjakan" : "tersedia";
  if (task.status === "dikerjakan") return task.assignedToId ? null : "tersedia";
  return null;
}

export type UnorChoice = { id: string; name: string };

export type TaskMonitorFilterValues = {
  pd: string;
  unor: [string, string, string];
  q: string;
  date: string;
  sumber: "" | "delegasi" | "mandiri";
  tahap: "" | TaskStage;
  page: number;
};

export function taskMonitorDetailHref(id: string, filters: TaskMonitorFilterValues) {
  const query = taskMonitorHref(filters).split("?")[1];
  return query ? `/admin/monitoring/${id}?${query}` : `/admin/monitoring/${id}`;
}

export function taskMonitorHref(filters: TaskMonitorFilterValues, page = filters.page) {
  const params = new URLSearchParams();
  if (filters.pd) params.set("pd", filters.pd);
  filters.unor.forEach((id, index) => {
    if (id) params.set(`u${index + 1}`, id);
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.date) params.set("date", filters.date);
  if (filters.sumber) params.set("sumber", filters.sumber);
  if (filters.tahap) params.set("tahap", filters.tahap);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/monitoring?${query}` : "/admin/monitoring";
}
