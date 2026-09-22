import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Новый пароль должен быть не короче 6 символов"),
});

export async function PATCH(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Текущий пароль неверен" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
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