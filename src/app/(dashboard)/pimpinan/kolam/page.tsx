import { LeaderTaskList } from "@/components/home/LeaderTaskList";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getLeaderPoolTasks } from "@/lib/home";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function KolamPage() {
  const user = await requireUser(["personal"]);
  const tasks = await getLeaderPoolTasks(user);

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader title="Kolam" subtitle={`${tasks.length} tugas kolam belum diambil staf`} />
      <LeaderTaskList tasks={tasks} emptyText="Tidak ada tugas kolam yang belum diambil." />
    </PageMain>
  );
}
