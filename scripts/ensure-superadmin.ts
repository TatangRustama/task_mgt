import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
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
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const updated = await prisma.user.updateMany({
    where: { role: "super_admin", NOT: { nip: "superadmin" } },
    data: {
      nip: "superadmin",
      email: "superadmin@kinerja.local",
      name: "Super Admin",
      jabatan: null,
      unitId: null,
    },
  });

  const existing = await prisma.user.findFirst({
    where: { role: "super_admin", nip: "superadmin" },
    select: { nip: true, email: true, role: true },
  });

  console.log(JSON.stringify({ updated: updated.count, login: existing?.nip, role: existing?.role }));
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
