import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  // Удалять заказчиков может только ADMIN и SUPER_ADMIN
  if (
    session!.user.role !== "ADMIN" &&
    session!.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    // Каскадно удалятся проекты, задачи, документы
    // (в схеме прописано onDelete: Cascade)
    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}