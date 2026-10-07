import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const TATANG_NIP = "198208272014121001";
const YOHANIS_NIP = "198303072010041001";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function wit(year: number, month: number, day: number, hour = 9, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

type Spec = {
  title: string;
  description: string;
  notes: string;
  feedback: string;
  stars: 1 | 2 | 3;
  decision: "disetujui" | "ditolak";
  status: "disetujui" | "ditolak" | "menunggu_approval";
  priority: "rendah" | "sedang" | "tinggi";
  jumlah: number;
  satuan: string;
  created: Date;
  deadline: Date;
  completed: Date;
  reviewed?: Date;
};

const specs: Spec[] = [
  {
    title: "Koordinasi rapat kinerja subbid Agustus",
    description: "Pimpin rapat evaluasi capaian subbid dan tindak lanjut staf.",
    notes: "Notulen rapat dan daftar hadir terunggah.",
    feedback: "Rapat terarah, tindak lanjut staf jelas.",
    stars: 3,
    decision: "disetujui",
    status: "disetujui",
    priority: "tinggi",
    jumlah: 1,
    satuan: "kegiatan",
    created: wit(2026, 8, 4, 8, 0),
    deadline: wit(2026, 8, 8, 16, 0),
    completed: wit(2026, 8, 7, 11, 0),
    reviewed: wit(2026, 8, 8, 9, 30),
  },
  {
    title: "Pendampingan operator SIMPEG OPD",
    description: "Dampingi operator OPD yang kesulitan input usulan kepegawaian di SIMPEG.",
    notes: "Pendampingan 3 OPD, kendala akun sudah diteruskan ke admin.",
    feedback: "Respon cepat, dokumentasi peserta lengkap.",
    stars: 3,
    decision: "disetujui",
    status: "disetujui",
    priority: "sedang",
    jumlah: 3,
    satuan: "kegiatan",
    created: wit(2026, 8, 11, 8, 15),
    deadline: wit(2026, 8, 15, 16, 0),
    completed: wit(2026, 8, 14, 15, 40),
    reviewed: wit(2026, 8, 15, 10, 0),
  },
  {
    title: "Review antrian persetujuan tugas staf",
    description: "Tinjau dan selesaikan antrian review tugas staf yang menumpuk.",
    notes: "8 tugas staf sudah diberi umpan balik.",
    feedback: "Antrian berkurang. Jaga SLA review di bawah 48 jam.",
    stars: 2,
    decision: "disetujui",
    status: "disetujui",
    priority: "tinggi",
    jumlah: 8,
    satuan: "dokumen",
    created: wit(2026, 8, 12, 8, 0),
    deadline: wit(2026, 8, 16, 16, 0),
    completed: wit(2026, 8, 16, 9, 20),
    reviewed: wit(2026, 8, 16, 14, 10),
  },
  {
    title: "Paparan dashboard data kepegawaian",
    description: "Siapkan paparan dashboard kinerja data kepegawaian untuk rapat kabid.",
    notes: "Slide paparan 12 halaman. Sumber data belum dicantumkan di slide 4-6.",
    feedback: "Lengkapi sumber data lalu kirim ulang.",
    stars: 1,
    decision: "ditolak",
    status: "ditolak",
    priority: "sedang",
    jumlah: 1,
    satuan: "laporan",
    created: wit(2026, 8, 18, 8, 30),
    deadline: wit(2026, 8, 21, 16, 0),
    completed: wit(2026, 8, 21, 17, 10),
    reviewed: wit(2026, 8, 22, 9, 0),
  },
  {
    title: "Rekap capaian layanan data kepegawaian",
    description: "Susun rekap capaian layanan data kepegawaian bulan Agustus untuk kabid.",
    notes: "File rekap Excel dikirim ke kabid.",
    feedback: "Rekap lengkap, beri catatan risiko data berikutnya.",
    stars: 2,
    decision: "disetujui",
    status: "disetujui",
    priority: "sedang",
    jumlah: 1,
    satuan: "laporan",
    created: wit(2026, 8, 22, 8, 0),
    deadline: wit(2026, 8, 29, 16, 0),
    completed: wit(2026, 8, 28, 15, 20),
    reviewed: wit(2026, 8, 29, 10, 0),
  },
  {
    title: "Draft SOP layanan permintaan data",
    description: "Susun draf SOP permintaan data kepegawaian untuk paraf kabid.",
    notes: "Draf SOP 8 halaman sudah diunggah, menunggu review kabid.",
    feedback: "",
    stars: 2,
    decision: "disetujui",
    status: "menunggu_approval",
    priority: "sedang",
    jumlah: 1,
    satuan: "dokumen",
    created: wit(2026, 8, 26, 8, 0),
    deadline: wit(2026, 8, 31, 16, 0),
    completed: wit(2026, 8, 29, 16, 30),
  },
];

async function main() {
  const [tatang, yohanis] = await Promise.all([
    prisma.user.findUnique({ where: { nip: TATANG_NIP }, select: { id: true, unitId: true } }),
    prisma.user.findUnique({ where: { nip: YOHANIS_NIP }, select: { id: true } }),
  ]);
  if (!tatang?.unitId || !yohanis) throw new Error("Tatang atau Yohanis tidak ditemukan");

  const titles = specs.map((spec) => spec.title);
  const existing = await prisma.task.findMany({
    where: { createdById: tatang.id, source: "mandiri", title: { in: titles } },
    select: { id: true },
  });
  if (existing.length) {
    await prisma.task.deleteMany({ where: { id: { in: existing.map((row) => row.id) } } });
    console.log(`Removed ${existing.length} previous mandiri dummy tasks`);
  }

  for (const spec of specs) {
    await prisma.task.create({
      data: {
        title: spec.title,
        description: spec.description,
        source: "mandiri",
        assignmentMode: "ditunjuk",
        status: spec.status,
        priority: spec.priority,
        unitId: tatang.unitId,
        createdById: tatang.id,
        assignedToId: tatang.id,
        jumlahIntervensi: spec.jumlah,
        satuan: spec.satuan,
        createdAt: spec.created,
        deadline: spec.deadline,
        completedAt: spec.completed,
        evidence: {
          create: {
            photoUrls: [],
            address: "BKD Provinsi Papua Barat, Manokwari",
            notes: spec.notes,
            createdAt: spec.completed,
          },
        },
        ...(spec.reviewed
          ? {
              review: {
                create: {
                  reviewedById: yohanis.id,
                  decision: spec.decision,
                  score: spec.stars,
                  feedback: spec.feedback || null,
                  reviewedAt: spec.reviewed,
                },
              },
              ...(spec.status === "disetujui"
                ? {
                    rating: {
                      create: {
                        ratedById: yohanis.id,
                        stars: spec.stars,
                        ratedAt: spec.reviewed,
                      },
                    },
                  }
                : {}),
            }
          : {}),
      },
    });
  }

  console.log(`Created ${specs.length} mandiri tasks for Tatang, August 2026`);
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
