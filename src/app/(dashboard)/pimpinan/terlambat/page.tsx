import { LeaderTaskList } from "@/components/home/LeaderTaskList";
import { PageHeader, PageMain } from "@/components/layout/PageMain";
import { getLeaderOverdueTasks } from "@/lib/home";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TerlambatPage() {
  const user = await requireUser(["personal"]);
  const tasks = await getLeaderOverdueTasks(user);

  return (
    <PageMain className="max-w-3xl space-y-4">
      <PageHeader
        title="Terlambat"
        subtitle={`${tasks.length} tugas bawahan melewati tenggat dan belum selesai`}
      />
      <LeaderTaskList tasks={tasks} emptyText="Tidak ada tugas bawahan yang melewati tenggat." />
    </PageMain>
  );
}
