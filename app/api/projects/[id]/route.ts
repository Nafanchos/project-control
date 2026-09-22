import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}