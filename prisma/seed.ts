import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import "dotenv/config";

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
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const instansi = await prisma.instansi.upsert({
    where: { id: "demo-instansi" },
    update: {},
    create: {
      id: "demo-instansi",
      name: "Dinas Contoh Pemerintahan",
    },
  });

  const kantor = await prisma.unit.upsert({
    where: { id: "demo-kantor" },
    update: { name: "Kantor Dinas Contoh", type: "kantor", parentId: null },
    create: {
      id: "demo-kantor",
      name: "Kantor Dinas Contoh",
      type: "kantor",
      instansiId: instansi.id,
    },
  });

  const bidang = await prisma.unit.upsert({
    where: { id: "demo-unit" },
    update: {
      name: "Bidang Pelayanan Publik",
      type: "bidang",
      parentId: kantor.id,
    },
    create: {
      id: "demo-unit",
      name: "Bidang Pelayanan Publik",
      type: "bidang",
      parentId: kantor.id,
      instansiId: instansi.id,
    },
  });

  const subbid = await prisma.unit.upsert({
    where: { id: "demo-subbid" },
    update: {
      name: "Subbid Layanan Masyarakat",
      type: "sub_bidang",
      parentId: bidang.id,
    },
    create: {
      id: "demo-subbid",
      name: "Subbid Layanan Masyarakat",
      type: "sub_bidang",
      parentId: bidang.id,
      instansiId: instansi.id,
    },
  });

  await prisma.user.updateMany({
    where: { role: "super_admin", NOT: { email: "superadmin@kinerja.local" } },
    data: {
      email: "superadmin@kinerja.local",
      nip: "superadmin",
      name: "Super Admin",
      jabatan: null,
      unitId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: "superadmin@kinerja.local" },
    update: { role: "super_admin", nip: "superadmin", jabatan: null, unitId: null, name: "Super Admin" },
    create: {
      name: "Super Admin",
      nip: "superadmin",
      email: "superadmin@kinerja.local",
      passwordHash,
      role: "super_admin",
      jabatan: null,
    },
  });

  await prisma.user.upsert({
    where: { email: "hr@demo.go.id" },
    update: { role: "admin", jabatan: null, unitId: null },
    create: {
      name: "Admin Kepegawaian",
      nip: "199101012021011001",
      email: "hr@demo.go.id",
      passwordHash,
      role: "admin",
      jabatan: null,
    },
  });

  const kepala = await prisma.user.upsert({
    where: { email: "kepala@demo.go.id" },
    update: {
      unitId: kantor.id,
      role: "personal",
      jabatan: "kepala_kantor",
    },
    create: {
      name: "Ahmad Wijaya",
      nip: "197001011995011001",
      email: "kepala@demo.go.id",
      passwordHash,
      role: "personal",
      jabatan: "kepala_kantor",
      unitId: kantor.id,
    },
  });

  const kabid = await prisma.user.upsert({
    where: { email: "pimpinan@demo.go.id" },
    update: {
      unitId: bidang.id,
      role: "personal",
      jabatan: "kepala_bidang",
    },
    create: {
      name: "Budi Santoso",
      nip: "198505152010011002",
      email: "pimpinan@demo.go.id",
      passwordHash,
      role: "personal",
      jabatan: "kepala_bidang",
      unitId: bidang.id,
    },
  });

  const kasubbid = await prisma.user.upsert({
    where: { email: "kasubbid@demo.go.id" },
    update: {
      unitId: subbid.id,
      role: "personal",
      jabatan: "kepala_sub_bidang",
    },
    create: {
      name: "Dewi Lestari",
      nip: "198808082012012004",
      email: "kasubbid@demo.go.id",
      passwordHash,
      role: "personal",
      jabatan: "kepala_sub_bidang",
      unitId: subbid.id,
    },
  });

  const pegawai = await prisma.user.upsert({
    where: { email: "pegawai@demo.go.id" },
    update: {
      unitId: subbid.id,
      role: "personal",
      jabatan: "pelaksana",
    },
    create: {
      name: "Siti Rahayu",
      nip: "199203032019012003",
      email: "pegawai@demo.go.id",
      passwordHash,
      role: "personal",
      jabatan: "pelaksana",
      unitId: subbid.id,
    },
  });

  await prisma.unit.update({
    where: { id: kantor.id },
    data: { pimpinanId: kepala.id },
  });
  await prisma.unit.update({
    where: { id: bidang.id },
    data: { pimpinanId: kabid.id },
  });
  await prisma.unit.update({
    where: { id: subbid.id },
    data: { pimpinanId: kasubbid.id },
  });

  await prisma.task.updateMany({
    where: { unitId: bidang.id, assignedToId: pegawai.id },
    data: { unitId: subbid.id },
  });

  await prisma.task.updateMany({
    where: {
      unitId: bidang.id,
      source: "delegasi",
      assignedToId: null,
      status: "tersedia",
    },
    data: {
      unitId: subbid.id,
      createdById: kasubbid.id,
      assignmentMode: "kolam",
    },
  });

  const existingPool = await prisma.task.findFirst({
    where: { title: "Verifikasi berkas permohonan" },
  });

  if (!existingPool) {
    await prisma.task.createMany({
      data: [
        {
          title: "Verifikasi berkas permohonan",
          description: "Periksa kelengkapan berkas permohonan layanan hari ini",
          source: "delegasi",
          assignmentMode: "kolam",
          status: "tersedia",
          priority: "tinggi",
          unitId: subbid.id,
          createdById: kasubbid.id,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          title: "Koordinasi rapat internal",
          description: "Menyiapkan materi rapat koordinasi mingguan",
          source: "delegasi",
          assignmentMode: "kolam",
          status: "tersedia",
          priority: "sedang",
          unitId: subbid.id,
          createdById: kasubbid.id,
        },
        {
          title: "Pendampingan layanan masyarakat",
          description: "Tugas mandiri pendampingan di loket",
          source: "mandiri",
          assignmentMode: "ditunjuk",
          status: "dikerjakan",
          priority: "sedang",
          unitId: subbid.id,
          createdById: pegawai.id,
          assignedToId: pegawai.id,
        },
      ],
    });
  }

  const namedKasubbid = await prisma.task.findFirst({
    where: { title: "Rekap capaian layanan bidang" },
  });
  if (!namedKasubbid) {
    await prisma.task.create({
      data: {
        title: "Rekap capaian layanan bidang",
        description: "Susun rekap mingguan dari subbid layanan untuk rapat kabid",
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: "dikerjakan",
        priority: "tinggi",
        unitId: subbid.id,
        createdById: kabid.id,
        assignedToId: kasubbid.id,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const namedStaff = await prisma.task.findFirst({
    where: { title: "Input data antrian loket" },
  });
  if (!namedStaff) {
    await prisma.task.create({
      data: {
        title: "Input data antrian loket",
        description: "Input rekap antrian hari ini ke spreadsheet subbid",
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: "dikerjakan",
        priority: "sedang",
        unitId: subbid.id,
        createdById: kasubbid.id,
        assignedToId: pegawai.id,
      },
    });
  }

  const overdueDemo = await prisma.task.findFirst({
    where: { title: "Kirim rekap pengaduan mingguan" },
  });
  if (!overdueDemo) {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await prisma.task.create({
      data: {
        title: "Kirim rekap pengaduan mingguan",
        description: "Rekap pengaduan masyarakat minggu lalu belum dikirim",
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: "dikerjakan",
        priority: "tinggi",
        unitId: subbid.id,
        createdById: kasubbid.id,
        assignedToId: pegawai.id,
        deadline: twoDaysAgo,
      },
    });
    await prisma.task.create({
      data: {
        title: "Perbaiki data duplikat antrian",
        description: "Koreksi data antrian yang tertolak atasan",
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: "ditolak",
        priority: "sedang",
        unitId: subbid.id,
        createdById: kasubbid.id,
        assignedToId: pegawai.id,
        completedAt: threeDaysAgo,
        review: {
          create: {
            reviewedById: kasubbid.id,
            decision: "ditolak",
            feedback: "Masih ada nomor antrian ganda. Perbaiki lalu kirim ulang.",
            reviewedAt: threeDaysAgo,
          },
        },
      },
    });
    await prisma.task.create({
      data: {
        title: "Laporan kunjungan lapangan",
        description: "Laporan kunjungan sudah dilengkapi bukti, menunggu persetujuan",
        source: "mandiri",
        assignmentMode: "ditunjuk",
        status: "menunggu_approval",
        priority: "sedang",
        unitId: subbid.id,
        createdById: pegawai.id,
        assignedToId: pegawai.id,
        completedAt: twoDaysAgo,
        evidence: {
          create: {
            photoUrls: [],
            address: "Kantor Dinas Contoh",
            notes: "Kunjungan selesai, menunggu review atasan.",
          },
        },
      },
    });
    await prisma.task.create({
      data: {
        title: "Update papan informasi loket",
        description: "Tugas selesai dengan hasil di bawah ekspektasi",
        source: "delegasi",
        assignmentMode: "ditunjuk",
        status: "disetujui",
        priority: "rendah",
        unitId: subbid.id,
        createdById: kasubbid.id,
        assignedToId: pegawai.id,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        review: {
          create: {
            reviewedById: kasubbid.id,
            decision: "disetujui",
            score: 1,
            feedback: "Informasi terpasang, tetapi masih ada jadwal yang salah.",
          },
        },
        rating: {
          create: {
            ratedById: kasubbid.id,
            stars: 1,
          },
        },
      },
    });
  }

  const asnDirectory = [
    {
      nip: "199001012020011001",
      name: "Admin Instansi",
      address: "Jl. Merdeka No. 1, Kota Contoh",
    },
    {
      nip: "197001011995011001",
      name: "Ahmad Wijaya",
      address: "Jl. Gatot Subroto No. 12, Kota Contoh",
    },
    {
      nip: "198505152010011002",
      name: "Budi Santoso",
      address: "Jl. Diponegoro No. 8, Kota Contoh",
    },
    {
      nip: "198808082012012004",
      name: "Dewi Lestari",
      address: "Jl. Sudirman No. 21, Kota Contoh",
    },
    {
      nip: "199203032019012003",
      name: "Siti Rahayu",
      address: "Jl. Ahmad Yani No. 5, Kota Contoh",
    },
    {
      nip: "198001012005011001",
      name: "Rina Kusuma",
      address: "Jl. Pahlawan No. 17, Kota Contoh",
    },
  ];

  for (const person of asnDirectory) {
    await prisma.asnDirectory.upsert({
      where: { nip: person.nip },
      update: { name: person.name, address: person.address },
      create: person,
    });
  }

  console.log("Seed selesai:");
  console.log("- superadmin / password123 (Super Admin)");
  console.log("- hr@demo.go.id / password123 (Admin Non-ASN)");
  console.log("- kepala@demo.go.id / password123 (Personal · Kepala Kantor)");
  console.log("- pimpinan@demo.go.id / password123 (Personal · Kepala Bidang)");
  console.log("- kasubbid@demo.go.id / password123 (Personal · Kepala Sub Bidang)");
  console.log("- pegawai@demo.go.id / password123 (Personal · Staf Pelaksana)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
