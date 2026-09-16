import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "foto_tugas";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function emptyPhotoBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Skip photo bucket: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function listPhotoPaths(prefix = ""): Promise<string[]> {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (error) throw new Error(`Gagal list foto: ${error.message}`);

    const paths: string[] = [];
    for (const item of data ?? []) {
      if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) paths.push(path);
      else paths.push(...(await listPhotoPaths(path)));
    }
    return paths;
  }

  const names = await listPhotoPaths();
  let removed = 0;
  for (let i = 0; i < names.length; i += 100) {
    const batch = names.slice(i, i + 100);
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(batch);
    if (removeError) throw new Error(`Gagal hapus foto: ${removeError.message}`);
    removed += batch.length;
  }
  console.log(`Emptied ${removed} files from ${BUCKET}`);
}

async function main() {
  const [taskCount, evidenceCount, reviewCount, ratingCount, reportCount] = await Promise.all([
    prisma.task.count(),
    prisma.taskEvidence.count(),
    prisma.taskReview.count(),
    prisma.taskRating.count(),
    prisma.monthlyTaskReport.count(),
  ]);
  console.log(
    `Before: ${taskCount} tasks, ${evidenceCount} evidence, ${reviewCount} reviews, ${ratingCount} ratings, ${reportCount} monthly reports`,
  );

  const reports = await prisma.monthlyTaskReport.deleteMany();
  const tasks = await prisma.task.deleteMany();
  console.log(`Deleted ${reports.count} monthly reports`);
  console.log(`Deleted ${tasks.count} tasks (evidence, reviews, ratings cascade)`);
  await emptyPhotoBucket();

  const leftover = await Promise.all([
    prisma.task.count(),
    prisma.taskEvidence.count(),
    prisma.taskReview.count(),
    prisma.taskRating.count(),
    prisma.monthlyTaskReport.count(),
  ]);
  console.log(
    `After: ${leftover[0]} tasks, ${leftover[1]} evidence, ${leftover[2]} reviews, ${leftover[3]} ratings, ${leftover[4]} monthly reports`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
