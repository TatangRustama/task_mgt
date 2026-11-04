import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function main() {
  console.log("Checking tasks needing tanggalKinerja backfill...");
  const res = await pool.query(`
    UPDATE "Task"
    SET "tanggalKinerja" = TO_CHAR("completedAt" AT TIME ZONE 'Asia/Jayapura', 'YYYY-MM-DD')
    WHERE "completedAt" IS NOT NULL AND "tanggalKinerja" IS NULL;
  `);
  console.log(`Updated ${res.rowCount ?? 0} completed tasks with tanggalKinerja.`);

  await pool.end();
}

main().catch((err) => {
  console.error("Backfill error:", err);
  process.exit(1);
});
