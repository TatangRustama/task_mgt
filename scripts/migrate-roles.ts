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

async function hasEnumLabel(label: string) {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'Role' AND e.enumlabel = $1
     ) AS exists`,
    [label],
  );
  return result.rows[0]?.exists === true;
}

async function main() {
  const hasOldRoles = (await hasEnumLabel("pimpinan")) || (await hasEnumLabel("pegawai"));
  const alreadyNew =
    (await hasEnumLabel("super_admin")) &&
    (await hasEnumLabel("personal")) &&
    !hasOldRoles;

  if (alreadyNew) {
    console.log("Role enum already migrated.");
    return;
  }

  await pool.query(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`);
  await pool.query(`DROP TYPE IF EXISTS "Role_new"`);
  await pool.query(`CREATE TYPE "Role_new" AS ENUM ('super_admin', 'admin', 'personal')`);
  await pool.query(`
    ALTER TABLE "User"
    ALTER COLUMN "role" TYPE "Role_new"
    USING (
      CASE "role"::text
        WHEN 'super_admin' THEN 'super_admin'
        WHEN 'personal' THEN 'personal'
        WHEN 'pimpinan' THEN 'personal'
        WHEN 'pegawai' THEN 'personal'
        WHEN 'admin' THEN 'super_admin'
        ELSE 'personal'
      END
    )::"Role_new"
  `);
  await pool.query(`DROP TYPE "Role"`);
  await pool.query(`ALTER TYPE "Role_new" RENAME TO "Role"`);
  await pool.query(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'personal'::"Role"`);

  const counts = await pool.query(`SELECT role::text AS role, COUNT(*)::int AS count FROM "User" GROUP BY role ORDER BY role`);
  console.log("Role migration complete:", counts.rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
