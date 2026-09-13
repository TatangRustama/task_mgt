import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const enums = await pool.query(
    `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'Role' ORDER BY e.enumsortorder`,
  );
  const byNip = await pool.query(
    `SELECT id, name, nip, email, role::text AS role FROM "User" WHERE lower(nip) = 'superadmin' OR lower(email) LIKE '%superadmin%' OR role::text IN ('super_admin','admin') LIMIT 20`,
  );
  let prismaFind = null;
  let prismaError = null;
  try {
    prismaFind = await prisma.user.findFirst({
      where: {
        role: { in: ["super_admin", "admin"] },
        OR: [
          { nip: "superadmin" },
          { email: "superadmin" },
          { email: "superadmin@kinerja.local" },
        ],
      },
      select: { id: true, nip: true, email: true, role: true },
    });
  } catch (error) {
    prismaError = error instanceof Error ? error.message : String(error);
  }

  console.log(
    JSON.stringify(
      {
        enums: enums.rows.map((row) => row.enumlabel),
        rows: byNip.rows,
        prismaFind,
        prismaError,
      },
      null,
      2,
    ),
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
