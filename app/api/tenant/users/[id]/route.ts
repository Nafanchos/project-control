import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  // Нельзя удалить себя
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: "Нельзя удалить самого себя" },
      { status: 400 }
    );
  }

  // Проверяем, что пользователь принадлежит нашему тенанту
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) {
    return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}