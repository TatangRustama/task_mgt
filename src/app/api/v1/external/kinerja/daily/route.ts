import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isISODate, reportDayRange, completedOnReportDate } from "@/lib/utils";
import { validateExternalApiToken, unauthorizedExternalResponse } from "@/lib/external-auth";
import { displayJabatan } from "@/lib/jabatan-display";
import { normalizeStars } from "@/lib/rating";

export async function GET(request: Request) {
  const authCheck = validateExternalApiToken(request);
  if (!authCheck.valid) {
    return unauthorizedExternalResponse(authCheck);
  }

  const { searchParams } = new URL(request.url);
  const nip = searchParams.get("nip")?.trim();
  const date = searchParams.get("date")?.trim();

  // Pagination parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "10", 10);

  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = isNaN(limitParam) || limitParam < 1 ? 10 : Math.min(limitParam, 100);

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

  if (!date || !isISODate(date)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_DATE_FORMAT",
          message: "Parameter 'date' wajib berformat YYYY-MM-DD (contoh: 2026-11-11)",
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

  // Format Nama dan Jabatan
  const namaLengkap = user.pegawai
    ? [user.pegawai.gelarDepan, user.pegawai.name, user.pegawai.gelarBelakang]
        .filter(Boolean)
        .join(" ")
    : user.name;

  const namaJabatan = displayJabatan(user.pegawai, user.jabatan);
  const unitKerja = user.unit?.name || "-";

  // Ambil data tugas berdasarkan tanggal kinerja atau tanggal penyelesaian
  const { start, end } = reportDayRange(date);

  const rawTasks = await prisma.task.findMany({
    where: {
      assignedToId: user.id,
      deletedAt: null,
      status: { not: "dibatalkan" },
      OR: [
        { tanggalKinerja: date },
        { tanggalKinerja: null, completedAt: { gte: start, lt: end } },
      ],
    },
    include: {
      evidence: true,
      review: {
        include: {
          reviewedBy: {
            select: { name: true, nip: true },
          },
        },
      },
      rating: {
        include: {
          ratedBy: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });

  const matchingTasks = rawTasks.filter((t) =>
    completedOnReportDate(t.completedAt, date, t.tanggalKinerja)
  );

  // Perhitungan Ringkasan Harian
  const totalTugas = matchingTasks.length;
  const isFinished = (t: (typeof matchingTasks)[number]) =>
    Boolean(t.completedAt) || t.status === "disetujui" || t.status === "menunggu_approval";
  const selesai = matchingTasks.filter(isFinished).length;
  const totalIntervensi = matchingTasks.reduce(
    (sum, t) => sum + (t.jumlahIntervensi || 1),
    0
  );

  const ratedTasks = matchingTasks.filter(
    (t) => t.rating?.stars || (t.review?.score !== undefined && t.review?.score !== null)
  );
  const avgRating =
    ratedTasks.length > 0
      ? ratedTasks.reduce((sum, t) => {
          const stars = t.rating?.stars ?? normalizeStars(t.review?.score);
          return sum + (stars || 0);
        }, 0) / ratedTasks.length
      : null;

  let statusVerifikasi: "approved" | "pending" | "none" = "none";
  if (matchingTasks.some((t) => t.review?.decision === "disetujui" || t.status === "disetujui")) {
    statusVerifikasi = "approved";
  } else if (matchingTasks.some((t) => isFinished(t) && !t.review)) {
    statusVerifikasi = "pending";
  }

  // Pagination Slice
  const totalItems = matchingTasks.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const pagedTasks = matchingTasks.slice(startIndex, startIndex + limit);

  const hostUrl = process.env.NEXTAUTH_URL || "";

  const daftarTugas = pagedTasks.map((t) => {
    const photoUrls = (t.evidence?.photoUrls || []).map((url) => {
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      return `${hostUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    });

    return {
      id: t.id,
      judul: t.title,
      deskripsi: t.description || null,
      sumber: t.source === "mandiri" ? "mandiri" : "atasan",
      prioritas: t.priority,
      jumlahIntervensi: t.jumlahIntervensi || 1,
      satuan: t.satuan || "kegiatan",
      status: t.status,
      assignedAt: t.assignedAt.toISOString(),
      deadline: t.deadline?.toISOString() || null,
      waktuSelesai: t.completedAt?.toISOString() || null,
      tanggalKinerja: t.tanggalKinerja || date,
      bukti: t.evidence
        ? {
            alamat: t.evidence.address,
            catatan: t.evidence.notes,
            koordinat:
              t.evidence.latitude && t.evidence.longitude
                ? {
                    lat: t.evidence.latitude,
                    lng: t.evidence.longitude,
                  }
                : null,
            fotoUrls: photoUrls,
          }
        : null,
      reviewAtasan: t.review
        ? {
            keputusan: t.review.decision === "disetujui" ? "disetujui" : "ditolak",
            skor: t.review.score,
            catatan: t.review.feedback,
            dinilaiOleh: t.review.reviewedBy?.name || null,
            dinilaiPada: t.review.reviewedAt.toISOString(),
          }
        : null,
      rating: t.rating
        ? {
            bintang: t.rating.stars,
            diberikanPada: t.rating.ratedAt.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({
    success: true,
    message: "Data kinerja harian berhasil diambil",
    data: {
      pegawai: {
        nip: user.nip,
        nama: namaLengkap,
        jabatan: namaJabatan,
        unitKerja,
        instansi: user.unit?.instansi?.name || null,
      },
      tanggal: date,
      ringkasan: {
        totalTugas,
        selesai,
        totalIntervensi,
        statusVerifikasi,
        rataRataRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
      },
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
