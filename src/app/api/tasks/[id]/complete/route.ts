import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJumlahSatuan } from "@/lib/satuan";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

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

  if (!["dikerjakan", "ditolak"].includes(task.status)) {
    return NextResponse.json({ error: "Tugas tidak dapat diselesaikan" }, { status: 400 });
  }

  const formData = await request.formData();
  const notes = String(formData.get("notes") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);
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
  if (photos.length === 0) {
    return NextResponse.json({ error: "Minimal 1 foto bukti wajib" }, { status: 400 });
  }
  if (photos.length > 3) {
    return NextResponse.json({ error: "Maksimal 3 foto" }, { status: 400 });
  }

  try {
    const photoUrls = await Promise.all(photos.map((photo) => saveUploadedFile(photo)));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.taskEvidence.upsert({
        where: { taskId: id },
        create: {
          taskId: id,
          photoUrls,
          latitude: latitudeRaw ? Number(latitudeRaw) : null,
          longitude: longitudeRaw ? Number(longitudeRaw) : null,
          address,
          notes,
        },
        update: {
          photoUrls,
          latitude: latitudeRaw ? Number(latitudeRaw) : null,
          longitude: longitudeRaw ? Number(longitudeRaw) : null,
          address,
          notes,
        },
      });

      return tx.task.update({
        where: { id },
        data: {
          status: "menunggu_approval",
          completedAt: new Date(),
          jumlahIntervensi: parsedJumlah.jumlahIntervensi,
          satuan: parsedJumlah.satuan,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal upload bukti";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
