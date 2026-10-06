export const TASK_STAGE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "dikerjakan", label: "Dikerjakan" },
  { value: "selesai", label: "Telah selesai" },
] as const;

export type TaskStage = (typeof TASK_STAGE_OPTIONS)[number]["value"];

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
