import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    // Удаляем папку с файлами компании (если есть)
    const tenantUploads = path.join(process.cwd(), "uploads", id);
    try {
      await rm(tenantUploads, { recursive: true, force: true });
    } catch {
      // файлов могло не быть
    }

    // Удаляем саму компанию — каскадно удалятся пользователи, заказчики, проекты, задачи, документы
    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}