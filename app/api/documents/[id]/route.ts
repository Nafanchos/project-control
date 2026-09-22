import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";

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

    // USER может скачать только документы своих задач
    if (
      session!.user.role === "USER" &&
      doc.task.assigneeId !== session!.user.id
    ) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const fullPath = path.join(process.cwd(), doc.filePath);
    const buffer = await readFile(fullPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
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

    // USER может удалить только документы своих задач
    if (
      session!.user.role === "USER" &&
      doc.task.assigneeId !== session!.user.id
    ) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const fullPath = path.join(process.cwd(), doc.filePath);
    try {
      await unlink(fullPath);
    } catch {
      // файла может не быть
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}