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

  let removed = 0;
  for (let round = 0; round < 50; round += 1) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
    if (error) throw new Error(`Gagal list foto: ${error.message}`);
    const names = (data ?? [])
      .filter((file) => file.id && file.name && file.name !== ".emptyFolderPlaceholder")
      .map((file) => file.name);
    if (!names.length) break;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(names);
    if (removeError) throw new Error(`Gagal hapus foto: ${removeError.message}`);
    removed += names.length;
  }
  console.log(`Emptied ${removed} files from ${BUCKET}`);
}

async function main() {
  const reports = await prisma.monthlyTaskReport.deleteMany();
  const tasks = await prisma.task.deleteMany();
  console.log(`Deleted ${reports.count} monthly reports`);
  console.log(`Deleted ${tasks.count} tasks (evidence, reviews, ratings cascade)`);
  await emptyPhotoBucket();
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
