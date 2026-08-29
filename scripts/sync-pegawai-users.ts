import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncPegawaiAccounts } from "../src/lib/simpeg-accounts";

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Pegawai" ADD COLUMN IF NOT EXISTS "userId" TEXT`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Pegawai_userId_key" ON "Pegawai"("userId")`,
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Pegawai"
      ADD CONSTRAINT "Pegawai_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
}

async function main() {
  await ensureSchema();
  const count = await syncPegawaiAccounts((message, current, total) => {
    console.log(`[akun] ${message} (${current}/${total})`);
  });
  console.log(`[akun] Selesai. ${count} pegawai dihubungkan ke akun login.`);
}

main()
  .catch((error) => {
    console.error("[akun] Gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
