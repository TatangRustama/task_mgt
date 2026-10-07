import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const TATANG_NIP = "198208272014121001";

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

type StaffKey = "megawati" | "titus" | "jailani" | "gloria";

function pickStaff(name: string): StaffKey | null {
  const n = name.toUpperCase();
  if (n.includes("MEGAWATI")) return "megawati";
  if (n.includes("TITUS")) return "titus";
  if (n.includes("JAILANI") || n.includes("ABDUL")) return "jailani";
  if (n.includes("GLORIA")) return "gloria";
  return null;
}

async function main() {
  const tatang = await prisma.user.findUnique({
    where: { nip: TATANG_NIP },
    select: {
      id: true,
      name: true,
      nip: true,
      jabatan: true,
      unitId: true,
      unit: { select: { id: true, name: true, parentId: true, pimpinanId: true } },
    },
  });
  if (!tatang?.unitId || !tatang.unit) {
    throw new Error(`User Tatang (NIP ${TATANG_NIP}) atau unitnya tidak ditemukan`);
  }

  const parent = tatang.unit.parentId
    ? await prisma.unit.findUnique({
        where: { id: tatang.unit.parentId },
        select: { id: true, name: true, pimpinanId: true, pimpinan: { select: { id: true, name: true, nip: true } } },
      })
    : null;

  const staff = await prisma.user.findMany({
    where: { role: "personal", unitId: tatang.unitId, id: { not: tatang.id }, jabatan: "pelaksana" },
    select: { id: true, name: true, nip: true, jabatan: true },
    orderBy: { name: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        tatang: { id: tatang.id, name: tatang.name, unit: tatang.unit.name },
        atasan: parent?.pimpinan ?? null,
        parentUnit: parent?.name ?? null,
        staff: staff.map((p) => ({ id: p.id, name: p.name, nip: p.nip })),
      },
      null,
      2,
    ),
  );

  const byKey = new Map<StaffKey, (typeof staff)[number]>();
  for (const person of staff) {
    const key = pickStaff(person.name);
    if (key) byKey.set(key, person);
  }
  for (const key of ["megawati", "titus", "jailani", "gloria"] as const) {
    if (!byKey.has(key)) throw new Error(`Pegawai ${key} tidak ditemukan di unit Tatang`);
  }

  const dummyTitles = [
    "Pendampingan DMS Dinkes",
    "Bersih data disparitas 3 NIK",
    "Rekap dashboard kinerja subbid Agustus",
    "Update konten website BKD",
    "Backup basis data kepegawaian mingguan",
    "Perbaikan tautan e-layanan rusak",
    "Verifikasi data SIMPEG usulan KGB",
    "Rekap usulan kartu ASN baru",
    "Pendampingan input e-Kinerja OPD",
    "Inventarisasi tiket helpdesk aplikasi",
    "Draft SOP layanan data kepegawaian",
  ];
  const existing = await prisma.task.findMany({
    where: {
      createdById: tatang.id,
      title: { in: dummyTitles },
      createdAt: { gte: wit(2026, 8, 1), lt: wit(2026, 9, 1) },
    },
    select: { id: true },
  });
  if (existing.length) {
    await prisma.task.deleteMany({ where: { id: { in: existing.map((row) => row.id) } } });
    console.log(`Removed ${existing.length} previous dummy tasks`);
  }

  const megawati = byKey.get("megawati")!;
  const titus = byKey.get("titus")!;
  const jailani = byKey.get("jailani")!;
  const gloria = byKey.get("gloria")!;

  type Spec = {
    assignee: (typeof staff)[number];
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
    address: string;
  };

  const specs: Spec[] = [
    {
      assignee: megawati,
      title: "Pendampingan DMS Dinkes",
      description: "Pendampingan input dan validasi data DMS Dinas Kesehatan.",
      notes: "Pendampingan selesai, log revisi terlampir.",
      feedback: "Dokumentasi lengkap, tindak lanjut jelas.",
      stars: 3,
      decision: "disetujui",
      status: "disetujui",
      priority: "tinggi",
      jumlah: 1,
      satuan: "kegiatan",
      created: wit(2026, 8, 3, 8, 15),
      deadline: wit(2026, 8, 7, 16, 0),
      completed: wit(2026, 8, 6, 14, 20),
      reviewed: wit(2026, 8, 6, 16, 40),
      address: "Kantor Dinas Kesehatan Provinsi Papua Barat",
    },
    {
      assignee: megawati,
      title: "Bersih data disparitas 3 NIK",
      description: "Koreksi disparitas data kepegawaian pada 3 NIK bermasalah.",
      notes: "Tiga NIK sudah diselaraskan dengan SIMPEG.",
      feedback: "Data bersih, tetap pantau duplikasi minggu depan.",
      stars: 2,
      decision: "disetujui",
      status: "disetujui",
      priority: "tinggi",
      jumlah: 3,
      satuan: "berkas",
      created: wit(2026, 8, 10, 8, 0),
      deadline: wit(2026, 8, 14, 16, 0),
      completed: wit(2026, 8, 13, 11, 10),
      reviewed: wit(2026, 8, 13, 15, 5),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: megawati,
      title: "Rekap dashboard kinerja subbid Agustus",
      description: "Susun rekap capaian dashboard kinerja Subbid Data dan Informasi.",
      notes: "File rekap Excel dan screenshot dashboard terunggah.",
      feedback: "Rekap rapi, angka sesuai sumber.",
      stars: 3,
      decision: "disetujui",
      status: "disetujui",
      priority: "sedang",
      jumlah: 1,
      satuan: "laporan",
      created: wit(2026, 8, 25, 8, 30),
      deadline: wit(2026, 8, 29, 16, 0),
      completed: wit(2026, 8, 28, 10, 45),
      reviewed: wit(2026, 8, 28, 14, 10),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: titus,
      title: "Update konten website BKD",
      description: "Perbarui berita dan pengumuman layanan kepegawaian di laman BKD.",
      notes: "Empat artikel dan dua pengumuman sudah tayang.",
      feedback: "Tayang tepat waktu, cek tautan rusak.",
      stars: 2,
      decision: "disetujui",
      status: "disetujui",
      priority: "sedang",
      jumlah: 6,
      satuan: "halaman",
      created: wit(2026, 8, 4, 9, 0),
      deadline: wit(2026, 8, 8, 16, 0),
      completed: wit(2026, 8, 8, 15, 20),
      reviewed: wit(2026, 8, 8, 17, 0),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: titus,
      title: "Backup basis data kepegawaian mingguan",
      description: "Jalankan dan verifikasi backup mingguan database kepegawaian.",
      notes: "Backup 4 minggu Agustus tersimpan di NAS.",
      feedback: "Backup lengkap, uji restore belum dilampirkan.",
      stars: 2,
      decision: "disetujui",
      status: "disetujui",
      priority: "tinggi",
      jumlah: 4,
      satuan: "file",
      created: wit(2026, 8, 11, 8, 0),
      deadline: wit(2026, 8, 29, 16, 0),
      completed: wit(2026, 8, 27, 9, 30),
      reviewed: wit(2026, 8, 27, 11, 15),
      address: "Ruang server BKD, Manokwari",
    },
    {
      assignee: titus,
      title: "Perbaikan tautan e-layanan rusak",
      description: "Perbaiki tautan e-layanan yang dilaporkan tidak bisa dibuka.",
      notes: "Sebagian tautan masih 404 setelah rilis.",
      feedback: "Masih ada tautan rusak. Perbaiki lalu kirim ulang.",
      stars: 1,
      decision: "ditolak",
      status: "ditolak",
      priority: "tinggi",
      jumlah: 8,
      satuan: "unit",
      created: wit(2026, 8, 18, 8, 20),
      deadline: wit(2026, 8, 20, 16, 0),
      completed: wit(2026, 8, 20, 17, 40),
      reviewed: wit(2026, 8, 21, 9, 10),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: jailani,
      title: "Verifikasi data SIMPEG usulan KGB",
      description: "Verifikasi kelengkapan data SIMPEG untuk usulan KGB periode Agustus.",
      notes: "42 usulan dicek, 3 dikembalikan ke OPD.",
      feedback: "Teliti, catatan pengembalian jelas.",
      stars: 3,
      decision: "disetujui",
      status: "disetujui",
      priority: "tinggi",
      jumlah: 42,
      satuan: "berkas",
      created: wit(2026, 8, 5, 8, 0),
      deadline: wit(2026, 8, 12, 16, 0),
      completed: wit(2026, 8, 11, 13, 50),
      reviewed: wit(2026, 8, 11, 16, 5),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: jailani,
      title: "Rekap usulan kartu ASN baru",
      description: "Rekap dan validasi usulan percetakan kartu ASN bulan berjalan.",
      notes: "Rekap 18 usulan sudah dikirim ke bidang.",
      feedback: "Rekap lengkap.",
      stars: 2,
      decision: "disetujui",
      status: "disetujui",
      priority: "sedang",
      jumlah: 18,
      satuan: "dokumen",
      created: wit(2026, 8, 14, 8, 10),
      deadline: wit(2026, 8, 19, 16, 0),
      completed: wit(2026, 8, 18, 10, 0),
      reviewed: wit(2026, 8, 18, 14, 25),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: gloria,
      title: "Pendampingan input e-Kinerja OPD",
      description: "Pendampingan operator OPD untuk input SKP dan capaian e-Kinerja.",
      notes: "Pendampingan 5 OPD via daring dan tatap muka.",
      feedback: "Respon OPD baik, dokumentasi hadir lengkap.",
      stars: 3,
      decision: "disetujui",
      status: "disetujui",
      priority: "sedang",
      jumlah: 5,
      satuan: "kegiatan",
      created: wit(2026, 8, 6, 8, 0),
      deadline: wit(2026, 8, 15, 16, 0),
      completed: wit(2026, 8, 14, 15, 30),
      reviewed: wit(2026, 8, 15, 9, 0),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: gloria,
      title: "Inventarisasi tiket helpdesk aplikasi",
      description: "Rekap tiket helpdesk aplikasi kepegawaian yang masuk sepanjang Agustus.",
      notes: "27 tiket direkap, 4 masih terbuka.",
      feedback: "Rekap rapi, eskalasi 4 tiket terbuka segera.",
      stars: 2,
      decision: "disetujui",
      status: "disetujui",
      priority: "sedang",
      jumlah: 27,
      satuan: "dokumen",
      created: wit(2026, 8, 19, 8, 0),
      deadline: wit(2026, 8, 26, 16, 0),
      completed: wit(2026, 8, 25, 11, 20),
      reviewed: wit(2026, 8, 25, 15, 40),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
    {
      assignee: gloria,
      title: "Draft SOP layanan data kepegawaian",
      description: "Susun draf SOP permintaan data kepegawaian untuk review kabid.",
      notes: "Draf SOP 8 halaman sudah diunggah, menunggu paraf kasubbid.",
      feedback: "",
      stars: 2,
      decision: "disetujui",
      status: "menunggu_approval",
      priority: "sedang",
      jumlah: 1,
      satuan: "dokumen",
      created: wit(2026, 8, 27, 8, 30),
      deadline: wit(2026, 8, 31, 16, 0),
      completed: wit(2026, 8, 29, 16, 10),
      address: "BKD Provinsi Papua Barat, Manokwari",
    },
  ];

  for (const spec of specs) {
    const notes = spec.notes;
    await prisma.task.create({
      data: {
        title: spec.title,
        description: spec.description,
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: spec.status,
        priority: spec.priority,
        unitId: tatang.unitId,
        createdById: tatang.id,
        assignedToId: spec.assignee.id,
        jumlahIntervensi: spec.jumlah,
        satuan: spec.satuan,
        createdAt: spec.created,
        deadline: spec.deadline,
        completedAt: spec.completed,
        evidence: {
          create: {
            photoUrls: [],
            address: spec.address,
            notes,
            createdAt: spec.completed,
          },
        },
        ...(spec.reviewed
          ? {
              review: {
                create: {
                  reviewedById: tatang.id,
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
                        ratedById: tatang.id,
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

  console.log(`Created ${specs.length} dummy tasks for August 2026`);
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
