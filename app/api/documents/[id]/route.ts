import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;
  try {
    const doc = await prisma.document.findFirst({
      where: { id, tenantId },
      include: { task: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Не найден" }, { status: 404 });
    }

    // USER — только документы своих задач
    if (
      session!.user.role === "USER" &&
      doc.task.assigneeId !== session!.user.id
    ) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: doc.filePath,
      })
    );

    if (!result.Body) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    const bytes = await result.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;
  try {
    const doc = await prisma.document.findFirst({
      where: { id, tenantId },
      include: { task: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Не найден" }, { status: 404 });
    }

    if (
      session!.user.role === "USER" &&
      doc.task.assigneeId !== session!.user.id
    ) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    // Удаляем из B2 (если файла уже нет — просто игнорируем)
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: doc.filePath,
        })
      );
    } catch (err) {
      console.warn("Не удалось удалить из B2:", err);
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}