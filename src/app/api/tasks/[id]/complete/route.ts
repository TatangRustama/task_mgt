import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJumlahSatuan } from "@/lib/satuan";
import { getCurrentUser } from "@/lib/session";
import { mergedCoordinate, mergedEvidencePhotoUrls } from "@/lib/task-evidence";
import { saveUploadedFile } from "@/lib/upload";

const COMPLETABLE_STATUSES = ["dikerjakan", "ditolak"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  if (task.assignedToId !== user.id) {
    return NextResponse.json({ error: "Anda bukan penanggung jawab tugas ini" }, { status: 403 });
  }

  if (!COMPLETABLE_STATUSES.includes(task.status as (typeof COMPLETABLE_STATUSES)[number])) {
    return NextResponse.json({ error: "Tugas tidak dapat diselesaikan" }, { status: 400 });
  }

  const formData = await request.formData();
  const notes = String(formData.get("notes") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const photos = formData.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  const parsedJumlah = parseJumlahSatuan(
    formData.get("jumlahIntervensi"),
    formData.get("satuan"),
    true,
  );

  if (!parsedJumlah.ok) {
    return NextResponse.json({ error: parsedJumlah.error }, { status: 400 });
  }
  if (!notes) {
    return NextResponse.json({ error: "Catatan hasil wajib diisi" }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "Alamat/lokasi wajib diisi" }, { status: 400 });
  }
  if (photos.length > 3) {
    return NextResponse.json({ error: "Maksimal 3 foto" }, { status: 400 });
  }

  try {
    const uploadedPhotoUrls = await Promise.all(photos.map((photo) => saveUploadedFile(photo)));

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.taskEvidence.findUnique({
        where: { taskId: id },
        select: { photoUrls: true, latitude: true, longitude: true },
      });
      const photoUrls = mergedEvidencePhotoUrls(uploadedPhotoUrls, existing?.photoUrls);
      const latitude = mergedCoordinate(latitudeRaw, existing?.latitude);
      const longitude = mergedCoordinate(longitudeRaw, existing?.longitude);

      await tx.taskEvidence.upsert({
        where: { taskId: id },
        create: {
          taskId: id,
          photoUrls,
          latitude,
          longitude,
          address,
          notes,
        },
        update: {
          photoUrls,
          latitude,
          longitude,
          address,
          notes,
        },
      });

      const completed = await tx.task.updateMany({
        where: {
          id,
          assignedToId: user.id,
          status: { in: [...COMPLETABLE_STATUSES] },
        },
        data: {
          status: "menunggu_approval",
          completedAt: new Date(),
          jumlahIntervensi: parsedJumlah.jumlahIntervensi,
          satuan: parsedJumlah.satuan,
        },
      });
      if (completed.count !== 1) {
        throw new Error("Tugas tidak dapat diselesaikan");
      }

      return tx.task.findUnique({ where: { id } });
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal upload bukti";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
