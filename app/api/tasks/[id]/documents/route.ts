import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { s3, BUCKET } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;

  try {
    const where: Record<string, unknown> = { id, tenantId };
    if (session!.user.role === "USER") {
      where.assigneeId = session!.user.id;
    }

    const task = await prisma.task.findFirst({ where });
    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    const docs = await prisma.document.findMany({
      where: { taskId: id, tenantId },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;

  try {
    const where: Record<string, unknown> = { id, tenantId };
    if (session!.user.role === "USER") {
      where.assigneeId = session!.user.id;
    }

    const task = await prisma.task.findFirst({ where });
    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Формируем ключ объекта в B2: tenantId/taskId/время_имя
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const storedName = `${Date.now()}_${safeName}`;
    const key = `${tenantId}/${id}/${storedName}`;

    // Загружаем в B2
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    // Сохраняем в БД
    const doc = await prisma.document.create({
      data: {
        taskId: id,
        tenantId,
        fileName: file.name,
        filePath: key,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}