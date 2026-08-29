import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { isSimpegConfigured } from "../src/lib/simpeg";
import { syncSimpeg } from "../src/lib/simpeg-sync";

async function main() {
  if (!isSimpegConfigured()) {
    throw new Error("SIMPEG_API_TOKEN belum diatur di .env");
  }

  const result = await syncSimpeg((progress) => {
    const suffix =
      progress.current != null && progress.total != null
        ? ` (${progress.current}/${progress.total})`
        : "";
    console.log(`[simpeg] ${progress.message}${suffix}`);
  });

  console.log(
    `[simpeg] Selesai. Unit: ${result.unitCount}, Pegawai: ${result.pegawaiCount}`,
  );
}

main()
  .catch((error) => {
    console.error("[simpeg] Gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
