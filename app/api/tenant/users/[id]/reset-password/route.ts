import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  newPassword: z.string().min(6, "Пароль должен быть не короче 6 символов"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Проверяем, что пользователь из нашей компании
    const target = await prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!target) {
      return NextResponse.json({ error: "Не найден" }, { status: 404 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}