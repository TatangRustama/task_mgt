import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExternalApiToken, unauthorizedExternalResponse } from "@/lib/external-auth";
import { displayJabatan } from "@/lib/jabatan-display";
import { isCompletedOnTime } from "@/lib/utils";
import { normalizeStars } from "@/lib/rating";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function GET(request: Request) {
  const authCheck = validateExternalApiToken(request);
  if (!authCheck.valid) {
    return unauthorizedExternalResponse(authCheck);
  }

  const { searchParams } = new URL(request.url);
  const nip = searchParams.get("nip")?.trim();
  const monthParam = parseInt(searchParams.get("month") || "", 10);
  const yearParam = parseInt(searchParams.get("year") || "", 10);

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 200);

  if (!nip) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_NIP",
          message: "Parameter 'nip' wajib disertakan",
        },
      },
      { status: 400 }
    );
  }

  if (isNaN(monthParam) || monthParam < 1 || monthParam > 12) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_MONTH",
          message: "Parameter 'month' wajib berupa angka antara 1 sampai 12",
        },
      },
      { status: 400 }
    );
  }

  if (isNaN(yearParam) || yearParam < 2000 || yearParam > 2100) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_YEAR",
          message: "Parameter 'year' wajib berupa tahun 4 digit valid (contoh: 2026)",
        },
      },
      { status: 400 }
    );
  }

  // Find user by NIP
  const user = await prisma.user.findFirst({
    where: { nip, deletedAt: null },
    include: {
      pegawai: true,
      unit: {
        include: {
          instansi: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PEGAWAI_NOT_FOUND",
          message: `Pegawai dengan NIP '${nip}' tidak ditemukan dalam sistem`,
        },
      },
      { status: 404 }
    );
  }

  const namaLengkap = user.pegawai
    ? [user.pegawai.gelarDepan, user.pegawai.name, user.pegawai.gelarBelakang]
        .filter(Boolean)
        .join(" ")
    : user.name;

  const namaJabatan = displayJabatan(user.pegawai, user.jabatan);
  const unitKerja = user.unit?.name || "-";

  const start = new Date(yearParam, monthParam - 1, 1);
  const end = new Date(yearParam, monthParam, 1);
  const monthPrefix = `${yearParam}-${String(monthParam).padStart(2, "0")}`;

  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: user.id,
      deletedAt: null,
      status: { not: "dibatalkan" },
      OR: [
        { assignedAt: { gte: start, lt: end } },
        { createdAt: { gte: start, lt: end } },
        { completedAt: { gte: start, lt: end } },
        { tanggalKinerja: { startsWith: monthPrefix } },
      ],
    },
    include: {
      review: {
        include: {
          reviewedBy: { select: { name: true } },
        },
      },
      rating: true,
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });

  // Daily calendar grouping
  const daysInMonth = new Date(yearParam, monthParam, 0).getDate();
  const dayMap: Record<
    string,
    {
      tanggal: string;
      jumlahTugas: number;
      selesai: number;
      totalIntervensi: number;
      statusVerifikasi: "approved" | "pending" | "none";
    }
  > = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
    dayMap[dayStr] = {
      tanggal: dayStr,
      jumlahTugas: 0,
      selesai: 0,
      totalIntervensi: 0,
      statusVerifikasi: "none",
    };
  }

  const isFinished = (t: (typeof tasks)[number]) =>
    Boolean(t.completedAt) || t.status === "disetujui" || t.status === "menunggu_approval";
  const completedTasks = tasks.filter(isFinished);
  let onTimeCount = 0;
  let totalIntervensiAll = 0;

  for (const t of tasks) {
    const taskDate =
      t.tanggalKinerja && t.tanggalKinerja.startsWith(monthPrefix)
        ? t.tanggalKinerja
        : t.completedAt
        ? t.completedAt.toISOString().slice(0, 10)
        : t.createdAt.toISOString().slice(0, 10);

    const intervensi = t.jumlahIntervensi || 1;
    totalIntervensiAll += intervensi;

    if (isFinished(t) && isCompletedOnTime(t.completedAt, t.deadline)) {
      onTimeCount++;
    }

    if (dayMap[taskDate]) {
      dayMap[taskDate].jumlahTugas += 1;
      if (isFinished(t)) {
        dayMap[taskDate].selesai += 1;
      }
      dayMap[taskDate].totalIntervensi += intervensi;

      if (t.review?.decision === "disetujui" || t.status === "disetujui") {
        dayMap[taskDate].statusVerifikasi = "approved";
      } else if (
        isFinished(t) &&
        dayMap[taskDate].statusVerifikasi !== "approved"
      ) {
        dayMap[taskDate].statusVerifikasi = "pending";
      }
    }
  }

  const activeDays = Object.values(dayMap).filter((d) => d.jumlahTugas > 0).length;

  const reviewedTasks = tasks.filter((t) => t.review?.score !== null && t.review?.score !== undefined);
  const avgScore =
    reviewedTasks.length > 0
      ? reviewedTasks.reduce((acc, t) => acc + (t.review?.score || 0), 0) / reviewedTasks.length
      : null;

  const ratedTasks = tasks.filter(
    (t) => t.rating?.stars || (t.review?.score !== null && t.review?.score !== undefined)
  );
  const avgRating =
    ratedTasks.length > 0
      ? ratedTasks.reduce((acc, t) => {
          const stars = t.rating?.stars ?? normalizeStars(t.review?.score);
          return acc + (stars || 0);
        }, 0) / ratedTasks.length
      : null;

  // Pagination for tasks list
  const totalItems = tasks.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const pagedTasks = tasks.slice(startIndex, startIndex + limit);

  const daftarTugas = pagedTasks.map((t) => ({
    id: t.id,
    tanggalKinerja: t.tanggalKinerja || t.completedAt?.toISOString().slice(0, 10) || null,
    judul: t.title,
    sumber: t.source === "mandiri" ? "mandiri" : "atasan",
    prioritas: t.priority,
    jumlahIntervensi: t.jumlahIntervensi || 1,
    satuan: t.satuan || "kegiatan",
    status: t.status,
    tepatWaktu: isFinished(t) ? isCompletedOnTime(t.completedAt, t.deadline) : null,
    waktuSelesai: t.completedAt?.toISOString() || null,
    reviewStatus: t.review ? (t.review.decision === "disetujui" ? "disetujui" : "ditolak") : null,
    skor: t.review?.score ?? null,
    rating: t.rating?.stars ?? normalizeStars(t.review?.score),
  }));

  return NextResponse.json({
    success: true,
    message: "Data kinerja bulanan berhasil diambil",
    data: {
      pegawai: {
        nip: user.nip,
        nama: namaLengkap,
        jabatan: namaJabatan,
        unitKerja,
        instansi: user.unit?.instansi?.name || null,
      },
      periode: {
        bulan: monthParam,
        tahun: yearParam,
        namaBulan: `${MONTH_NAMES[monthParam - 1]} ${yearParam}`,
      },
      ringkasanBulanan: {
        totalHariLapor: activeDays,
        totalTugas: tasks.length,
        totalTugasSelesai: completedTasks.length,
        totalIntervensi: totalIntervensiAll,
        tugasTepatWaktu: onTimeCount,
        persentaseTepatWaktu:
          completedTasks.length > 0
            ? parseFloat(((onTimeCount / completedTasks.length) * 100).toFixed(1))
            : 0,
        rataRataSkorReview: avgScore ? parseFloat(avgScore.toFixed(1)) : null,
        rataRataRatingBintang: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
      },
      kalenderHarian: Object.values(dayMap),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      daftarTugas,
    },
  });
}
