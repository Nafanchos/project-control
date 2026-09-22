import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;

  try {
    // Проверяем, что задача доступна пользователю
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
    // Проверяем доступ к задаче
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
    const dir = path.join(process.cwd(), "uploads", tenantId, id);
    await mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const storedName = `${Date.now()}_${safeName}`;
    const filePath = path.join(dir, storedName);

    await writeFile(filePath, buffer);

    const doc = await prisma.document.create({
      data: {
        taskId: id,
        tenantId,
        fileName: file.name,
        filePath: path
          .join("uploads", tenantId, id, storedName)
          .replace(/\\/g, "/"),
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